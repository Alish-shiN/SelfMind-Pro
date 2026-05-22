"""merge ai quiz and profile community image heads

Revision ID: 56bfe6cb96ed
Revises: 2c3d4e5f6a7b, b2c3d4e5f6a7
Create Date: 2026-05-22 18:11:10.871661

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56bfe6cb96ed'
down_revision: Union[str, Sequence[str], None] = ('2c3d4e5f6a7b', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
