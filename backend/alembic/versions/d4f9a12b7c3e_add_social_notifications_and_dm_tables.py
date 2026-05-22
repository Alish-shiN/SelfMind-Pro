"""add social notifications and dm tables

Revision ID: d4f9a12b7c3e
Revises: 56bfe6cb96ed
Create Date: 2026-05-22 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f9a12b7c3e"
down_revision: Union[str, Sequence[str], None] = "56bfe6cb96ed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "friend_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_user_id", sa.Integer(), nullable=False),
        sa.Column("to_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["from_user_id"], ["users.id"], name=op.f("fk_friend_requests_from_user_id_users")),
        sa.ForeignKeyConstraint(["to_user_id"], ["users.id"], name=op.f("fk_friend_requests_to_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_friend_requests")),
    )
    op.create_index(op.f("ix_friend_requests_id"), "friend_requests", ["id"], unique=False)
    op.create_index(op.f("ix_friend_requests_from_user_id"), "friend_requests", ["from_user_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_to_user_id"), "friend_requests", ["to_user_id"], unique=False)
    op.create_index(op.f("ix_friend_requests_status"), "friend_requests", ["status"], unique=False)

    op.create_table(
        "in_app_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="unread"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_in_app_notifications_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_in_app_notifications")),
    )
    op.create_index(op.f("ix_in_app_notifications_id"), "in_app_notifications", ["id"], unique=False)
    op.create_index(op.f("ix_in_app_notifications_user_id"), "in_app_notifications", ["user_id"], unique=False)
    op.create_index(op.f("ix_in_app_notifications_kind"), "in_app_notifications", ["kind"], unique=False)
    op.create_index(op.f("ix_in_app_notifications_status"), "in_app_notifications", ["status"], unique=False)

    op.create_table(
        "direct_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_a_id", sa.Integer(), nullable=False),
        sa.Column("user_b_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_a_id"], ["users.id"], name=op.f("fk_direct_conversations_user_a_id_users")),
        sa.ForeignKeyConstraint(["user_b_id"], ["users.id"], name=op.f("fk_direct_conversations_user_b_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_direct_conversations")),
        sa.UniqueConstraint("user_a_id", "user_b_id", name="uq_direct_pair"),
    )
    op.create_index(op.f("ix_direct_conversations_id"), "direct_conversations", ["id"], unique=False)
    op.create_index(op.f("ix_direct_conversations_user_a_id"), "direct_conversations", ["user_a_id"], unique=False)
    op.create_index(op.f("ix_direct_conversations_user_b_id"), "direct_conversations", ["user_b_id"], unique=False)

    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("sender_user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["conversation_id"], ["direct_conversations.id"], name=op.f("fk_direct_messages_conversation_id_direct_conversations")),
        sa.ForeignKeyConstraint(["sender_user_id"], ["users.id"], name=op.f("fk_direct_messages_sender_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_direct_messages")),
    )
    op.create_index(op.f("ix_direct_messages_id"), "direct_messages", ["id"], unique=False)
    op.create_index(op.f("ix_direct_messages_conversation_id"), "direct_messages", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_direct_messages_sender_user_id"), "direct_messages", ["sender_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_direct_messages_sender_user_id"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_conversation_id"), table_name="direct_messages")
    op.drop_index(op.f("ix_direct_messages_id"), table_name="direct_messages")
    op.drop_table("direct_messages")

    op.drop_index(op.f("ix_direct_conversations_user_b_id"), table_name="direct_conversations")
    op.drop_index(op.f("ix_direct_conversations_user_a_id"), table_name="direct_conversations")
    op.drop_index(op.f("ix_direct_conversations_id"), table_name="direct_conversations")
    op.drop_table("direct_conversations")

    op.drop_index(op.f("ix_in_app_notifications_status"), table_name="in_app_notifications")
    op.drop_index(op.f("ix_in_app_notifications_kind"), table_name="in_app_notifications")
    op.drop_index(op.f("ix_in_app_notifications_user_id"), table_name="in_app_notifications")
    op.drop_index(op.f("ix_in_app_notifications_id"), table_name="in_app_notifications")
    op.drop_table("in_app_notifications")

    op.drop_index(op.f("ix_friend_requests_status"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_to_user_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_from_user_id"), table_name="friend_requests")
    op.drop_index(op.f("ix_friend_requests_id"), table_name="friend_requests")
    op.drop_table("friend_requests")
