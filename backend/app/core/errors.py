"""Uniform API error responses.

Every error response has the shape ``{"code": str, "message": str}``. ``code`` is the stable
contract the frontend uses to show translated messages; ``message`` is a human-readable
fallback that may change. Validation errors also include ``errors``: a list of
``{"field": str, "code": str}``.
"""

from collections.abc import Mapping, Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

REQUEST_LOCATIONS = {"body", "query", "path", "header", "cookie"}

HTTP_STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    429: "too_many_requests",
}

HTTP_STATUS_MESSAGES = {
    404: "El recurso solicitado no existe.",
    405: "Método no permitido para este recurso.",
}


class AppError(Exception):
    """An expected application error with a stable code, raised by services and routers."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = dict(headers) if headers else None


def error_body(code: str, message: str) -> dict[str, Any]:
    return {"code": code, "message": message}


def _field_name(location: Sequence[str | int]) -> str:
    parts = list(location)
    if len(parts) > 1 and parts[0] in REQUEST_LOCATIONS:
        parts = parts[1:]
    return ".".join(str(part) for part in parts)


async def _handle_app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.code, exc.message),
        headers=exc.headers,
    )


async def _handle_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    content = error_body("validation_error", "Los datos enviados no son válidos.")
    content["errors"] = [
        {"field": _field_name(error["loc"]), "code": error["type"]} for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content=content)


async def _handle_http_exception(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    status_code = exc.status_code
    code = HTTP_STATUS_CODES.get(status_code, "internal_error" if status_code >= 500 else "error")
    message = HTTP_STATUS_MESSAGES.get(status_code, "No se pudo completar la petición.")
    return JSONResponse(
        status_code=status_code,
        content=error_body(code, message),
        headers=getattr(exc, "headers", None),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
