from collections.abc import Callable

from fastapi.testclient import TestClient

AsUser = Callable[[str, str | None], None]

URL = "/api/v1/events"


def payload(**overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "event_type": "wedding",
        "details": {"partner_one_name": "Ana", "partner_two_name": "Luis"},
        "event_date": "2027-06-12",
    }
    body.update(overrides)
    return body


def test_create_event_returns_201(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.post(URL, json=payload())

    assert response.status_code == 201
    body = response.json()
    assert body["title"]
    assert body["slug"]
    assert body["status"] == "draft"
    assert body["locations"] == []
    assert body["event_date"] == "2027-06-12"
    assert "owner_firebase_uid" not in body


def test_create_event_without_date(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.post(URL, json=payload(event_date=None))

    assert response.status_code == 201
    assert response.json()["event_date"] is None


def test_create_second_event_returns_409(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    client.post(URL, json=payload())

    response = client.post(URL, json=payload())

    assert response.status_code == 409
    assert response.json()["code"] == "event_already_exists"


def test_blank_name_returns_422_with_field(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.post(
        URL, json=payload(details={"partner_one_name": "  ", "partner_two_name": "Luis"})
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert any(error["field"] == "details.partner_one_name" for error in body["errors"])
    assert client.get(f"{URL}/me").status_code == 404


def test_extra_body_field_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.post(URL, json=payload(owner_firebase_uid="x"))

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_unsupported_type_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.post(URL, json=payload(event_type="birthday"))

    assert response.status_code == 422
    assert response.json()["code"] == "unsupported_event_type"


def test_get_my_event(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    created = client.post(URL, json=payload()).json()

    response = client.get(f"{URL}/me")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_my_event_without_event(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.get(f"{URL}/me")

    assert response.status_code == 404
    assert response.json()["code"] == "event_not_found"


def test_users_do_not_see_each_others_event(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-a", None)
    client.post(URL, json=payload())

    as_user("uid-b", None)
    response = client.get(f"{URL}/me")

    assert response.status_code == 404


def test_requires_authentication(client: TestClient) -> None:
    post = client.post(URL, json=payload())
    get = client.get(f"{URL}/me")

    assert post.status_code == 401
    assert post.json()["code"] == "missing_token"
    assert get.status_code == 401
    assert get.json()["code"] == "missing_token"


def update_payload(**overrides: object) -> dict[str, object]:
    body: dict[str, object] = {
        "title": "Nuestra boda",
        "details": {"partner_one_name": "Ana", "partner_two_name": "Luis"},
        "event_date": "2027-06-12",
        "start_time": "18:30",
    }
    body.update(overrides)
    return body


def test_update_event_returns_200(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    created = client.post(URL, json=payload()).json()

    response = client.put(f"{URL}/me", json=update_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Nuestra boda"
    assert body["start_time"] == "18:30:00"
    assert body["slug"] == created["slug"]
    assert "owner_firebase_uid" not in body


def test_update_event_without_event_returns_404(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)

    response = client.put(f"{URL}/me", json=update_payload())

    assert response.status_code == 404
    assert response.json()["code"] == "event_not_found"


def test_update_event_missing_field_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    client.post(URL, json=payload())
    body = update_payload()
    del body["start_time"]

    response = client.put(f"{URL}/me", json=body)

    assert response.status_code == 422
    result = response.json()
    assert result["code"] == "validation_error"
    assert any(error["field"] == "start_time" for error in result["errors"])


def test_update_event_extra_field_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    created = client.post(URL, json=payload()).json()

    response = client.put(f"{URL}/me", json=update_payload(slug="otra"))

    assert response.status_code == 422
    assert client.get(f"{URL}/me").json()["slug"] == created["slug"]


def test_update_event_title_too_long_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    client.post(URL, json=payload())

    response = client.put(f"{URL}/me", json=update_payload(title="x" * 151))

    assert response.status_code == 422
    assert any(error["field"] == "title" for error in response.json()["errors"])


def test_update_event_invalid_details_returns_422(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    client.post(URL, json=payload())

    response = client.put(
        f"{URL}/me",
        json=update_payload(details={"partner_one_name": "", "partner_two_name": "Luis"}),
    )

    assert response.status_code == 422
    result = response.json()
    assert result["code"] == "validation_error"
    assert any(error["field"] == "details.partner_one_name" for error in result["errors"])


def test_update_event_without_token_returns_401(client: TestClient) -> None:
    response = client.put(f"{URL}/me", json=update_payload())

    assert response.status_code == 401
    assert response.json()["code"] == "missing_token"


def test_update_event_only_touches_own_event(client: TestClient, as_user: AsUser) -> None:
    as_user("uid-1", None)
    original = client.post(URL, json=payload()).json()
    as_user("uid-2", None)
    client.post(URL, json=payload())

    assert client.put(f"{URL}/me", json=update_payload(title="Otro título")).status_code == 200

    as_user("uid-1", None)
    assert client.get(f"{URL}/me").json()["title"] == original["title"]
