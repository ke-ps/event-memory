"""Add the optional start time to event locations.

Revision ID: 20261109_01
Revises: 20261104_01
Create Date: 2026-11-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261109_01"
down_revision: Union[str, None] = "20261104_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("event_locations", sa.Column("start_time", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("event_locations", "start_time")
