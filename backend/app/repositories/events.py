from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.event_location import EventLocation


def get_by_owner(session: Session, owner_uid: str) -> Event | None:
    return session.scalar(select(Event).where(Event.owner_firebase_uid == owner_uid))


def get_by_slug(session: Session, slug: str) -> Event | None:
    return session.scalar(select(Event).where(Event.slug == slug))


def slug_exists(session: Session, slug: str) -> bool:
    return session.scalar(select(Event.id).where(Event.slug == slug)) is not None


def add(session: Session, event: Event) -> Event:
    session.add(event)
    session.flush()
    return event


def delete(session: Session, event: Event) -> None:
    session.delete(event)
    session.flush()


def replace_locations(session: Session, event: Event, locations: list[EventLocation]) -> None:
    event.locations = locations
    session.flush()
