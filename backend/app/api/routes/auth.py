from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.services.auth import (
    FirebaseAuthenticationUnavailableError,
    InvalidIdentityTokenError,
    verify_identity_token,
)

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)
BEARER_CHALLENGE = {"WWW-Authenticate": "Bearer"}


@router.get("/me", summary="Identidad autenticada")
def get_current_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str | None]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="missing_token",
            message="Se requiere un token de acceso válido.",
            headers=BEARER_CHALLENGE,
        )

    try:
        return verify_identity_token(credentials.credentials)
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
