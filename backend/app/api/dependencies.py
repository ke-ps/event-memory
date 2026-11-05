from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.services.auth import (
    FirebaseAuthenticationUnavailableError,
    InvalidIdentityTokenError,
    verify_identity_token,
)

bearer_scheme = HTTPBearer(auto_error=False)
BEARER_CHALLENGE = {"WWW-Authenticate": "Bearer"}


@dataclass(frozen=True)
class CurrentUser:
    uid: str
    email: str | None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="missing_token",
            message="Se requiere un token de acceso válido.",
            headers=BEARER_CHALLENGE,
        )

    try:
        identity = verify_identity_token(credentials.credentials)
    except InvalidIdentityTokenError:
        raise AppError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_token",
            message="El token de acceso no es válido o ha caducado.",
            headers=BEARER_CHALLENGE,
        ) from None
    except FirebaseAuthenticationUnavailableError:
        raise AppError(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="auth_unavailable",
            message="El servicio de autenticación no está disponible.",
        ) from None

    return CurrentUser(uid=identity["uid"], email=identity["email"])
