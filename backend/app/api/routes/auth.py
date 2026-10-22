from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.auth import (
    FirebaseAuthenticationUnavailableError,
    InvalidIdentityTokenError,
    verify_identity_token,
)

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


@router.get("/me", summary="Identidad autenticada")
def get_current_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, str | None]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token de acceso válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return verify_identity_token(credentials.credentials)
    except InvalidIdentityTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de acceso no es válido o ha caducado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except FirebaseAuthenticationUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de autenticación no está disponible.",
        ) from None
