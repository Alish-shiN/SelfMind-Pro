from prometheus_client import Counter


journal_entries_created_total = Counter(
    "selfmind_journal_entries_created_total",
    "Total number of journal entries created.",
)

mood_checkins_created_total = Counter(
    "selfmind_mood_checkins_created_total",
    "Total number of journal entries created with a mood score.",
)

ai_quiz_sessions_completed_total = Counter(
    "selfmind_ai_quiz_sessions_completed_total",
    "Total number of AI quiz sessions completed.",
)
