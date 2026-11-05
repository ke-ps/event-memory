from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event


def get_by_owner(session: Session, owner_uid: str) -> Event | None:
    return session.scalar(select(Event).where(Event.owner_firebase_uid == owner_uid))


def slug_exists(session: Session, slug: str) -> bool:
    return session.scalar(select(Event.id).where(Event.slug == slug)) is not None


def add(session: Session, event: Event) -> Event:
    session.add(event)
    session.flush()
    return event
