"""Create the initial events table.

Revision ID: 20261026_01
Revises: None
Create Date: 2026-10-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261026_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=32), server_default="wedding", nullable=False),
        sa.Column("partner_one_name", sa.String(length=100), nullable=False),
        sa.Column("partner_two_name", sa.String(length=100), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("location", sa.String(length=500), nullable=True),
        sa.Column("main_photo_path", sa.String(length=1024), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_events"),
    )
    op.create_index("ix_events_owner_firebase_uid", "events", ["owner_firebase_uid"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_events_owner_firebase_uid", table_name="events")
    op.drop_table("events")
