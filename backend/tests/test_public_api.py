from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_current_user

AsUser = Callable[[str, str | None], None]

EVENTS_URL = "/api/v1/events"
PUBLIC_URL = "/api/v1/public/events"
SLUG = "ana-y-luis"

PUBLIC_KEYS = {
    "event_type",
    "title",
    "slug",
    "event_date",
    "start_time",
    "timezone",
    "details",
    "locations",
}


def create_event(client: TestClient) -> None:
    response = client.post(
        EVENTS_URL,
        json={
            "event_type": "wedding",
            "details": {"partner_one_name": "Ana", "partner_two_name": "Luis"},
            "event_date": "2027-06-12",
        },
    )
    assert response.status_code == 201


def publish(client: TestClient) -> None:
    assert client.post(f"{EVENTS_URL}/me/publish").status_code == 200


def test_public_event_returns_published_wedding(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    publish(client)

    response = client.get(f"{PUBLIC_URL}/{SLUG}")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == PUBLIC_KEYS
    assert body["slug"] == SLUG
    assert body["details"]["partner_one_name"] == "Ana"


def test_public_event_hides_draft(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)

    response = client.get(f"{PUBLIC_URL}/{SLUG}")

    assert response.status_code == 404
    assert response.json()["code"] == "event_not_found"


def test_public_event_unknown_slug(client: TestClient) -> None:
    response = client.get(f"{PUBLIC_URL}/does-not-exist")

    assert response.status_code == 404
    assert response.json()["code"] == "event_not_found"


def test_public_event_is_case_insensitive(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    publish(client)

    response = client.get(f"{PUBLIC_URL}/ANA-Y-LUIS")

    assert response.status_code == 200


def test_public_event_after_unpublish(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    publish(client)
    assert client.post(f"{EVENTS_URL}/me/unpublish").status_code == 200

    response = client.get(f"{PUBLIC_URL}/{SLUG}")

    assert response.status_code == 404
    assert response.json()["code"] == "event_not_found"


def test_public_event_needs_no_token(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    publish(client)
    client.app.dependency_overrides.pop(get_current_user, None)

    response = client.get(f"{PUBLIC_URL}/{SLUG}")

    assert response.status_code == 200


@pytest.mark.parametrize("slug", ["%00", "a%00b", "a" * 81, "ñu"])
def test_public_event_invalid_slug_is_plain_404(client: TestClient, slug: str) -> None:
    unknown = client.get(f"{PUBLIC_URL}/does-not-exist")

    response = client.get(f"{PUBLIC_URL}/{slug}")

    assert response.status_code == 404
    assert response.json() == unknown.json()


def test_public_event_draft_404_matches_unknown_slug(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    unknown = client.get(f"{PUBLIC_URL}/does-not-exist")

    response = client.get(f"{PUBLIC_URL}/{SLUG}")

    assert response.status_code == 404
    assert response.json() == unknown.json()


def test_public_event_exposes_location_time(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    place = {
        "label": "Ceremonia",
        "venue_name": "Iglesia",
        "address": "Calle Mayor 1",
        "start_time": "17:00:00",
    }
    saved = client.put(f"{EVENTS_URL}/me/locations", json={"locations": [place]})
    assert saved.status_code == 200
    publish(client)

    location = client.get(f"{PUBLIC_URL}/{SLUG}").json()["locations"][0]

    assert set(location) == {"label", "venue_name", "address", "position", "start_time"}
    assert location["start_time"] == "17:00:00"


def test_public_event_exposes_the_texts(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    create_event(client)
    client.put(
        f"{EVENTS_URL}/me",
        json={
            "title": None,
            "slug": SLUG,
            "details": {
                "partner_one_name": "Ana",
                "partner_two_name": "Luis",
                "welcome_text": "Bienvenidos",
                "story": "Nos conocimos en Toledo",
            },
            "event_date": "2027-06-12",
            "start_time": None,
        },
    )
    client.post(f"{EVENTS_URL}/me/publish")

    details = client.get(f"{PUBLIC_URL}/{SLUG}").json()["details"]

    assert details["welcome_text"] == "Bienvenidos"
    assert details["story"] == "Nos conocimos en Toledo"
