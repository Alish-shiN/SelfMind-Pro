from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.ai_quiz_result import AIQuizResult
from app.models.user import User
from app.repo.ai_quiz_repository import AIQuizRepository
from app.schemas.ai_quiz import AIQuizGenerateRequest, AIQuizSubmitRequest
from app.services.ai_quiz_config import (
    QUIZ_TYPES,
    completed_recently,
    normalize_quiz_type,
    quiz_title,
)
from app.services.ai_quiz_engine import AIQuizEngine
from app.services.metrics import ai_quiz_sessions_completed_total
from app.services.personalization_service import PersonalizationService
from app.services.safety_service import SafetyService


class AIQuizService:
    def __init__(self, db: Session):
        self.repo = AIQuizRepository(db)
        self.engine = AIQuizEngine()
        self.personalization_service = PersonalizationService(db)
        self.safety_service = SafetyService(db)

    def get_quiz_types(self, current_user: User) -> list[dict]:
        history = self.repo.list_completed_results(current_user.id, limit=100)
        latest_by_type: dict[str, AIQuizResult] = {}
        for result in history:
            quiz_type = normalize_quiz_type(
                result.quiz_type or result.session.quiz_type
            )
            if quiz_type not in latest_by_type:
                latest_by_type[quiz_type] = result

        response = []
        for key, config in QUIZ_TYPES.items():
            latest = latest_by_type.get(key)
            if not latest:
                status_value = "not_started"
            elif completed_recently(latest.created_at):
                status_value = "completed_recently"
            else:
                status_value = "completed"
            response.append(
                {
                    **config,
                    "status": status_value,
                    "latest_result_id": latest.id if latest else None,
                    "latest_score": latest.overall_score if latest else None,
                    "latest_level": latest.severity_level if latest else None,
                    "latest_completed_at": latest.created_at if latest else None,
                }
            )
        return response

    def generate_quiz(self, current_user: User, payload: AIQuizGenerateRequest):
        quiz_type = normalize_quiz_type(payload.quiz_type)
        context = self._build_context(current_user)
        questions = self.engine.generate_questions(quiz_type, context, payload.language)

        return self.repo.create_session(
            user_id=current_user.id,
            quiz_type=quiz_type,
            generated_questions=questions,
        )

    def get_session(self, current_user: User, session_id: int):
        session = self.repo.get_session_by_id_and_user(session_id, current_user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found"
            )

        return {
            "session": session,
            "result": session.result,
        }

    def submit_quiz(
        self, current_user: User, session_id: int, payload: AIQuizSubmitRequest
    ):
        session = self.repo.get_session_by_id_and_user(session_id, current_user.id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Quiz session not found"
            )

        quiz_type = normalize_quiz_type(session.quiz_type)
        answer_payload = [item.model_dump() for item in payload.answers]
        self.repo.delete_answers_for_session(session.id)
        created_answers = self.repo.create_answers(session.id, answer_payload)
        for answer in created_answers:
            self.safety_service.flag_if_needed(
                current_user, "ai_quiz_answer", answer.id, answer.answer_text
            )

        context = self._build_context(current_user)
        result_data = self.engine.analyze_answers(
            quiz_type=quiz_type,
            questions=session.generated_questions,
            answers=answer_payload,
            context=context,
            language=payload.language,
        )
        previous_result = self.repo.get_latest_result_for_type(
            current_user.id, quiz_type, exclude_session_id=session.id
        )
        trend = self._build_trend(
            quiz_type,
            result_data["overall_score"],
            previous_result,
            payload.language,
        )

        result = self.repo.create_or_replace_result(
            session_id=session.id,
            overall_score=result_data["overall_score"],
            severity_level=result_data["severity_level"],
            insight=result_data["insight"],
            recommendation=result_data["recommendation"],
            practice=result_data["practice"],
            quiz_type=quiz_type,
            answers_snapshot=answer_payload,
            recommendations=result_data["recommendations"],
            micro_practices=result_data["micro_practices"],
            action_plan=result_data["action_plan"],
            trend_direction=trend["trend_direction"],
            previous_score=trend["previous_score"],
            score_difference=trend["score_difference"],
            trend_explanation=trend["explanation"],
        )

        self.repo.mark_session_completed(session)
        ai_quiz_sessions_completed_total.inc()
        return result

    def list_history(self, current_user: User, limit: int = 25) -> list[dict]:
        results = self.repo.list_completed_results(current_user.id, limit=limit)
        return [self._history_item(result) for result in results]

    def get_result(self, current_user: User, result_id: int) -> AIQuizResult:
        result = self.repo.get_result_by_id_and_user(result_id, current_user.id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Quiz result not found"
            )
        return result

    def get_latest_action_plan(self, current_user: User) -> dict | None:
        result = self.repo.get_latest_action_plan(current_user.id)
        if not result or not result.action_plan:
            return None
        return self._action_plan_payload(result)

    def save_action_plan(self, current_user: User, result_id: int) -> dict:
        result = self.get_result(current_user, result_id)
        if not result.action_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This quiz result does not have an action plan to save.",
            )
        return self._action_plan_payload(result)

    def _action_plan_payload(self, result: AIQuizResult) -> dict:
        quiz_type = normalize_quiz_type(result.quiz_type or result.session.quiz_type)
        steps = result.action_plan.get("steps") or []
        return {
            "result_id": result.id,
            "session_id": result.session_id,
            "quiz_type": quiz_type,
            "quiz_title": quiz_title(quiz_type),
            "created_at": result.created_at,
            "score": result.overall_score,
            "severity_level": result.severity_level,
            "summary": result.insight,
            "next_actions": steps[:3],
            "action_plan": result.action_plan,
        }

    def _build_trend(
        self,
        quiz_type: str,
        current_score: float,
        previous_result: AIQuizResult | None,
        language: str = "en",
    ) -> dict:
        language_code = language if language in {"en", "ru", "kk"} else "en"
        title = quiz_title(quiz_type).lower()

        if not previous_result:
            explanations = {
                "en": "This is your first result for this quiz, so future quizzes will show progress trends.",
                "ru": "Это ваш первый результат по этому опросу — в следующих попытках появится сравнение с прошлым результатом.",
                "kk": "Бұл сауалнама бойынша алғашқы нәтиже — келесі өту кезінде өткен нәтижемен салыстыру көрсетіледі.",
            }
            return {
                "trend_direction": "first_time",
                "previous_score": None,
                "score_difference": None,
                "explanation": explanations[language_code],
            }

        previous_score = previous_result.overall_score
        difference = round(current_score - previous_score, 2)
        if abs(difference) < 5:
            direction = "stable"
            explanations = {
                "en": (
                    f"Your {title} score is similar to last time. "
                    "Small steady steps can still support progress."
                ),
                "ru": (
                    f"Результат «{title}» близок к прошлому. "
                    "Небольшие устойчивые шаги всё равно поддерживают прогресс."
                ),
                "kk": (
                    f"«{title}» бойынша ұпай алдыңғы нәтижеге жақын. "
                    "Шағын тұрақты қадамдар да прогреске көмектеседі."
                ),
            }
        elif difference < 0:
            direction = "improved"
            explanations = {
                "en": (
                    f"Your {title} score is lower than last time, "
                    "which may indicate the recent load feels more manageable."
                ),
                "ru": (
                    f"Результат «{title}» ниже прошлого — "
                    "возможно, недавняя нагрузка ощущается более управляемой."
                ),
                "kk": (
                    f"«{title}» бойынша ұпай алдыңғыдан төмен — "
                    "соңғы жүктеме басқарылатын болып сезілуі мүмкін."
                ),
            }
        else:
            direction = "worsened"
            explanations = {
                "en": (
                    f"Your {title} score is higher than before. "
                    "Consider reducing overload and adding one short supportive break."
                ),
                "ru": (
                    f"Результат «{title}» выше прошлого. "
                    "Попробуйте снизить нагрузку и добавить короткий поддерживающий перерыв."
                ),
                "kk": (
                    f"«{title}» бойынша ұпай бұрынғыдан жоғары. "
                    "Жүктемені азайтып, қысқа қолдаушы үзіліс қосуды қарастырыңыз."
                ),
            }
        return {
            "trend_direction": direction,
            "previous_score": previous_score,
            "score_difference": difference,
            "explanation": explanations[language_code],
        }

    def _history_item(self, result: AIQuizResult) -> dict:
        quiz_type = normalize_quiz_type(result.quiz_type or result.session.quiz_type)
        return {
            "result_id": result.id,
            "session_id": result.session_id,
            "quiz_type": quiz_type,
            "quiz_title": quiz_title(quiz_type),
            "completed_at": result.created_at,
            "score": result.overall_score,
            "severity_level": result.severity_level,
            "summary": result.insight,
            "has_recommendations": bool(
                result.recommendations or result.recommendation
            ),
            "has_action_plan": bool(result.action_plan),
            "trend_direction": result.trend_direction,
            "previous_score": result.previous_score,
            "score_difference": result.score_difference,
        }

    def _build_context(self, current_user: User) -> dict:
        return self.personalization_service.build_context(current_user)
