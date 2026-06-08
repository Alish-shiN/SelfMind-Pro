"""encrypt sensitive user data

Revision ID: 3e7a9c1d5b2f
Revises: b2c1c3b1a87b
Create Date: 2026-06-07 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.encryption import encrypt_text

revision: str = "3e7a9c1d5b2f"
down_revision: Union[str, Sequence[str], None] = "b2c1c3b1a87b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SENSITIVE_COLUMNS = {
    "journal_entries": ("title", "content", "tags", "notification_title"),
    "journal_analyses": (
        "sentiment_label",
        "emotion_label",
        "short_summary",
        "recommendation",
    ),
    "chat_sessions": ("title",),
    "chat_messages": ("content",),
    "direct_messages": ("content",),
    "goals": ("title", "description"),
    "safety_flags": ("content_excerpt",),
    "ai_quiz_answers": ("answer_text",),
    "ai_quiz_results": (
        "insight",
        "recommendation",
        "practice",
        "answers_snapshot",
        "recommendations",
        "micro_practices",
        "action_plan",
        "trend_explanation",
    ),
    "profiles": ("full_name", "bio"),
}


def upgrade() -> None:
    op.alter_column(
        "journal_entries",
        "tags",
        type_=sa.Text(),
        postgresql_using="to_json(tags)::text",
        existing_nullable=True,
    )
    for column_name in (
        "answers_snapshot",
        "recommendations",
        "micro_practices",
        "action_plan",
    ):
        op.alter_column(
            "ai_quiz_results",
            column_name,
            type_=sa.Text(),
            postgresql_using=f"{column_name}::text",
            existing_nullable=True,
        )

    special_columns = {
        ("journal_entries", "tags"),
        ("ai_quiz_results", "answers_snapshot"),
        ("ai_quiz_results", "recommendations"),
        ("ai_quiz_results", "micro_practices"),
        ("ai_quiz_results", "action_plan"),
    }
    for table_name, columns in SENSITIVE_COLUMNS.items():
        for column_name in columns:
            if (table_name, column_name) in special_columns:
                continue
            op.alter_column(table_name, column_name, type_=sa.Text(), existing_nullable=True)

    connection = op.get_bind()
    for table_name, columns in SENSITIVE_COLUMNS.items():
        for column_name in columns:
            rows = connection.execute(
                sa.text(
                    f"SELECT id, {column_name} FROM {table_name} "
                    f"WHERE {column_name} IS NOT NULL"
                )
            ).fetchall()
            for row_id, value in rows:
                connection.execute(
                    sa.text(
                        f"UPDATE {table_name} SET {column_name} = :value WHERE id = :id"
                    ),
                    {"id": row_id, "value": encrypt_text(value)},
                )


def downgrade() -> None:
    # Ciphertext remains readable by the application after a schema downgrade.
    pass
