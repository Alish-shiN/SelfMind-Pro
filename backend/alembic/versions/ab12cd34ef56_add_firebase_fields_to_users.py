"""add firebase fields to users

Revision ID: ab12cd34ef56
Revises: f33a0e9c2b11
Create Date: 2026-05-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ab12cd34ef56'
down_revision: Union[str, Sequence[str], None] = 'f33a0e9c2b11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('firebase_uid', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)
    op.alter_column('users', 'email_verified', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'firebase_uid')
