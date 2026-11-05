import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.event import Event
from app.schemas.events import EventCreate
from app.services.events import create_event, get_own_event


def wedding(one: str = "Ana", two: str = "Luis") -> EventCreate:
    return EventCreate(
        event_type="wedding", details={"partner_one_name": one, "partner_two_name": two}
    )


def test_create_event_generates_title_and_slug(db_session: Session) -> None:
    event = create_event(db_session, "uid-a", wedding())

    assert event.title == "Ana y Luis"
    assert event.slug == "ana-y-luis"
    assert event.status == "draft"
    assert event.timezone == "Europe/Madrid"
    assert event.owner_firebase_uid == "uid-a"


def test_create_event_with_accents(db_session: Session) -> None:
    event = create_event(db_session, "uid-a", wedding("José", "Begoña"))

    assert event.title == "José y Begoña"
    assert event.slug == "jose-y-begona"


def test_duplicate_slug_gets_suffix(db_session: Session) -> None:
    create_event(db_session, "uid-a", wedding())
    second = create_event(db_session, "uid-b", wedding())
    third = create_event(db_session, "uid-c", wedding())

    assert second.slug == "ana-y-luis-2"
    assert third.slug == "ana-y-luis-3"


def test_long_names_are_truncated(db_session: Session) -> None:
    first = create_event(db_session, "uid-a", wedding("a" * 100, "b" * 100))
    second = create_event(db_session, "uid-b", wedding("a" * 100, "b" * 100))

    assert len(first.title) == 150
    assert second.slug.endswith("-2")
    assert len(second.slug) <= 80


def test_second_event_for_same_owner_is_rejected(db_session: Session) -> None:
    create_event(db_session, "uid-a", wedding())

    with pytest.raises(AppError) as exc_info:
        create_event(db_session, "uid-a", wedding("Eva", "Pau"))

    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "event_already_exists"


def test_unknown_event_type_is_rejected(db_session: Session) -> None:
    data = EventCreate(event_type="birthday", details={})

    with pytest.raises(AppError) as exc_info:
        create_event(db_session, "uid-a", data)

    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "unsupported_event_type"


def test_invalid_details_are_rejected_with_field_errors(db_session: Session) -> None:
    with pytest.raises(AppError) as exc_info:
        create_event(db_session, "uid-a", wedding("  ", "Luis"))

    assert exc_info.value.status_code == 422
    assert exc_info.value.code == "validation_error"
    assert {"field": "details.partner_one_name", "code": "string_too_short"} in (
        exc_info.value.errors or []
    )
    assert db_session.scalar(select(func.count()).select_from(Event)) == 0


def test_get_own_event(db_session: Session) -> None:
    created = create_event(db_session, "uid-a", wedding())

    assert get_own_event(db_session, "uid-a").id == created.id


def test_get_own_event_without_event(db_session: Session) -> None:
    with pytest.raises(AppError) as exc_info:
        get_own_event(db_session, "uid-a")

    assert exc_info.value.status_code == 404
    assert exc_info.value.code == "event_not_found"


def test_concurrent_slug_conflict_is_retried(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    create_event(db_session, "uid-a", wedding())
    calls = iter([False])  # first check misses the existing slug, as a concurrent insert would
    monkeypatch.setattr(
        "app.repositories.events.slug_exists",
        lambda session, slug: next(calls, slug == "ana-y-luis"),
    )

    event = create_event(db_session, "uid-b", wedding())

    assert event.slug == "ana-y-luis-2"


def test_persistent_slug_conflict_gives_up(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    create_event(db_session, "uid-a", wedding())
    monkeypatch.setattr("app.repositories.events.slug_exists", lambda session, slug: False)
    for n in range(2, 8):
        db_session.add(
            Event(
                owner_firebase_uid=f"x{n}",
                event_type="wedding",
                title="t",
                slug=f"ana-y-luis-{n}",
                details={},
            )
        )
    db_session.flush()

    with pytest.raises(AppError) as exc_info:
        create_event(db_session, "uid-b", wedding())

    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "slug_conflict"
