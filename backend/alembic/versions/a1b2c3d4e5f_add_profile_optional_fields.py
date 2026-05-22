"""add profile optional fields

Revision ID: a1b2c3d4e5f
Revises: 8c9d0e1f2a3b
Create Date: 2026-05-22
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '8c9d0e1f2a3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('date_of_birth', sa.Date(), nullable=True))
    op.add_column('profiles', sa.Column('country', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'country')
    op.drop_column('profiles', 'date_of_birth')
