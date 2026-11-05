from sqlalchemy import func, inspect, select
from sqlalchemy.orm import Session

from app.models.event import Event


def test_migrations_create_events_tables(db_session: Session) -> None:
    tables = set(inspect(db_session.connection()).get_table_names())

    assert {"events", "event_locations", "alembic_version"} <= tables


def test_each_test_starts_with_empty_events(db_session: Session) -> None:
    assert db_session.scalar(select(func.count()).select_from(Event)) == 0
