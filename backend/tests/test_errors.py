from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.errors import AppError, register_exception_handlers


class ItemIn(BaseModel):
    name: str = Field(min_length=1)


def build_client() -> TestClient:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/conflict")
    def raise_app_error() -> None:
        raise AppError(
            status_code=409,
            code="event_already_exists",
            message="Ya tienes un evento.",
            headers={"X-Test": "yes"},
        )

    @app.post("/items")
    def create_item(item: ItemIn) -> ItemIn:
        return item

    return TestClient(app)


client = build_client()


def test_app_error_uses_code_and_message() -> None:
    response = client.get("/conflict")

    assert response.status_code == 409
    assert response.json() == {"code": "event_already_exists", "message": "Ya tienes un evento."}
    assert response.headers["X-Test"] == "yes"


def test_validation_error_lists_fields() -> None:
    response = client.post("/items", json={"name": ""})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert isinstance(body["message"], str)
    assert body["errors"] == [{"field": "name", "code": "string_too_short"}]


def test_validation_error_for_missing_body_field() -> None:
    response = client.post("/items", json={})

    assert response.status_code == 422
    assert response.json()["errors"] == [{"field": "name", "code": "missing"}]


def test_unknown_route_returns_not_found_code() -> None:
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_wrong_method_returns_method_not_allowed_code() -> None:
    response = client.delete("/items")

    assert response.status_code == 405
    assert response.json()["code"] == "method_not_allowed"
