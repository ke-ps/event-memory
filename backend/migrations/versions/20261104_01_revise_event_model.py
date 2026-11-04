"""Revise the event model and add event locations.

Revision ID: 20261104_01
Revises: 20261026_01
Create Date: 2026-11-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20261104_01"
down_revision: Union[str, None] = "20261026_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. New columns (required ones first nullable or with a default).
    op.add_column("events", sa.Column("title", sa.String(length=150), nullable=True))
    op.add_column("events", sa.Column("slug", sa.String(length=80), nullable=True))
    op.add_column(
        "events",
        sa.Column("status", sa.String(length=16), server_default="draft", nullable=False),
    )
    op.add_column("events", sa.Column("start_time", sa.Time(), nullable=True))
    op.add_column(
        "events",
        sa.Column("timezone", sa.String(length=64), server_default="Europe/Madrid", nullable=False),
    )
    op.add_column(
        "events",
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )

    # 2. New table.
    op.create_table(
        "event_locations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.Column("venue_name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.String(length=300), nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            name=op.f("fk_event_locations_event_id_events"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_event_locations")),
    )
    op.create_index(
        op.f("ix_event_locations_event_id"), "event_locations", ["event_id"], unique=False
    )

    # 3. Backfill existing rows.
    op.execute(
        """
        UPDATE events
        SET details = jsonb_build_object(
                'partner_one_name', partner_one_name,
                'partner_two_name', partner_two_name
            ),
            title = left(partner_one_name || ' y ' || partner_two_name, 150),
            slug = 'evento-' || left(replace(id::text, '-', ''), 12),
            status = 'draft'
        """
    )
    op.execute(
        """
        INSERT INTO event_locations (id, event_id, label, venue_name, address, position)
        SELECT gen_random_uuid(), id, 'Celebración', left(location, 150), left(location, 300), 0
        FROM events
        WHERE location IS NOT NULL
        """
    )

    # 4. Constraints.
    op.alter_column("events", "title", existing_type=sa.String(length=150), nullable=False)
    op.alter_column("events", "slug", existing_type=sa.String(length=80), nullable=False)
    op.create_unique_constraint(op.f("uq_events_slug"), "events", ["slug"])
    op.create_check_constraint(
        op.f("ck_events_slug_format"), "events", "slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"
    )
    op.create_check_constraint(
        op.f("ck_events_status_valid"), "events", "status IN ('draft', 'published')"
    )

    # 5. Drop the old columns.
    op.drop_column("events", "partner_one_name")
    op.drop_column("events", "partner_two_name")
    op.drop_column("events", "location")
    op.drop_column("events", "is_active")
    op.alter_column(
        "events", "event_type", existing_type=sa.String(length=32), server_default=None
    )


def downgrade() -> None:
    op.alter_column(
        "events", "event_type", existing_type=sa.String(length=32), server_default="wedding"
    )

    # Restore the old columns (required ones nullable until backfilled).
    # Locations with position > 0 cannot be represented in the old schema and are dropped.
    op.add_column("events", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("events", sa.Column("location", sa.String(length=500), nullable=True))
    op.add_column("events", sa.Column("partner_two_name", sa.String(length=100), nullable=True))
    op.add_column("events", sa.Column("partner_one_name", sa.String(length=100), nullable=True))

    op.execute(
        """
        UPDATE events
        SET partner_one_name = COALESCE(details->>'partner_one_name', ''),
            partner_two_name = COALESCE(details->>'partner_two_name', ''),
            location = (
                SELECT event_locations.venue_name
                FROM event_locations
                WHERE event_locations.event_id = events.id AND event_locations.position = 0
                LIMIT 1
            )
        """
    )
    op.alter_column(
        "events", "partner_one_name", existing_type=sa.String(length=100), nullable=False
    )
    op.alter_column(
        "events", "partner_two_name", existing_type=sa.String(length=100), nullable=False
    )

    op.drop_constraint(op.f("ck_events_status_valid"), "events", type_="check")
    op.drop_constraint(op.f("ck_events_slug_format"), "events", type_="check")
    op.drop_constraint(op.f("uq_events_slug"), "events", type_="unique")

    op.drop_index(op.f("ix_event_locations_event_id"), table_name="event_locations")
    op.drop_table("event_locations")

    op.drop_column("events", "details")
    op.drop_column("events", "timezone")
    op.drop_column("events", "start_time")
    op.drop_column("events", "status")
    op.drop_column("events", "slug")
    op.drop_column("events", "title")
