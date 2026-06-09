"""merge firebase and feature migration heads

Revision ID: b2c1c3b1a87b
Revises: ab12cd34ef56, d4f9a12b7c3e
Create Date: 2026-06-03 06:56:43.428734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c1c3b1a87b'
down_revision: Union[str, Sequence[str], None] = ('ab12cd34ef56', 'd4f9a12b7c3e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
