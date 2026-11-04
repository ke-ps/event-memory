import pytest
from fastapi.testclient import TestClient

from app.api.routes import auth as auth_routes
from app.main import app
from app.services.auth import (
    FirebaseAuthenticationUnavailableError,
    InvalidIdentityTokenError,
)

client = TestClient(app)
ME_URL = "/api/v1/auth/me"


def test_me_without_token_returns_401() -> None:
    response = client.get(ME_URL)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_me_with_non_bearer_scheme_returns_401() -> None:
    response = client.get(ME_URL, headers={"Authorization": "Basic abc"})

    assert response.status_code == 401


def test_me_with_valid_token_returns_identity(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_verify(token: str) -> dict[str, str | None]:
        assert token == "valid-token"
        return {"uid": "user-123", "email": "pareja@example.com"}

    monkeypatch.setattr(auth_routes, "verify_identity_token", fake_verify)

    response = client.get(ME_URL, headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    assert response.json() == {"uid": "user-123", "email": "pareja@example.com"}


def test_me_with_invalid_token_returns_401(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_verify(token: str) -> dict[str, str | None]:
        raise InvalidIdentityTokenError

    monkeypatch.setattr(auth_routes, "verify_identity_token", fake_verify)

    response = client.get(ME_URL, headers={"Authorization": "Bearer expired-token"})

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_me_when_firebase_unavailable_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_verify(token: str) -> dict[str, str | None]:
        raise FirebaseAuthenticationUnavailableError

    monkeypatch.setattr(auth_routes, "verify_identity_token", fake_verify)

    response = client.get(ME_URL, headers={"Authorization": "Bearer any-token"})

    assert response.status_code == 503
