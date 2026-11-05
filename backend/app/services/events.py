from typing import Any

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.event import Event
from app.repositories import events as event_repository
from app.schemas.event_details import UnknownEventTypeError, validate_event_details
from app.schemas.events import EventCreate
from app.services.slugs import slugify

TITLE_MAX_LENGTH = 150
SLUG_MAX_LENGTH = 80
MAX_SLUG_ATTEMPTS = 5
SLUG_CONSTRAINT = "uq_events_slug"


def _validated_details(data: EventCreate) -> dict[str, Any]:
    try:
        return validate_event_details(data.event_type, data.details)
    except UnknownEventTypeError:
        raise AppError(
            422, "unsupported_event_type", "El tipo de evento no está admitido."
        ) from None
    except ValidationError as exc:
        errors = [
            {
                "field": "details." + ".".join(str(part) for part in error["loc"]),
                "code": error["type"],
            }
            for error in exc.errors()
        ]
        raise AppError(
            422, "validation_error", "Los datos enviados no son válidos.", errors=errors
        ) from None


def _candidate_slug(base: str, number: int) -> str:
    if number == 1:
        return base
    suffix = f"-{number}"
    return f"{base[: SLUG_MAX_LENGTH - len(suffix)].rstrip('-')}{suffix}"


def _is_slug_conflict(exc: IntegrityError) -> bool:
    diag = getattr(exc.orig, "diag", None)
    return getattr(diag, "constraint_name", None) == SLUG_CONSTRAINT


def create_event(session: Session, owner_uid: str, data: EventCreate) -> Event:
    details = _validated_details(data)
    if event_repository.get_by_owner(session, owner_uid) is not None:
        raise AppError(409, "event_already_exists", "Ya tienes un evento.")

    title = f"{details['partner_one_name']} y {details['partner_two_name']}"[:TITLE_MAX_LENGTH]
    base = slugify(title) or "evento"

    number = 1
    try:
        for _ in range(MAX_SLUG_ATTEMPTS):
            while event_repository.slug_exists(session, _candidate_slug(base, number)):
                number += 1
            event = Event(
                owner_firebase_uid=owner_uid,
                event_type=data.event_type,
                title=title,
                slug=_candidate_slug(base, number),
                event_date=data.event_date,
                details=details,
            )
            try:
                with session.begin_nested():
                    event_repository.add(session, event)
            except IntegrityError as exc:
                if not _is_slug_conflict(exc):
                    raise
                number += 1
                continue
            session.commit()
            return event
    except Exception:
        session.rollback()
        raise
    session.rollback()
    raise AppError(
        409, "slug_conflict", "No se pudo generar una dirección única. Inténtalo de nuevo."
    )


def get_own_event(session: Session, owner_uid: str) -> Event:
    event = event_repository.get_by_owner(session, owner_uid)
    if event is None:
        raise AppError(404, "event_not_found", "Todavía no has creado tu evento.")
    return event
