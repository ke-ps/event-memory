import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin.exceptions import FirebaseError
from google.auth.exceptions import GoogleAuthError

from app.core.config import settings


class InvalidIdentityTokenError(Exception):
    """Raised when a Firebase identity token is invalid or expired."""


class FirebaseAuthenticationUnavailableError(Exception):
    """Raised when Firebase cannot be configured or reached."""


def _get_firebase_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        if not settings.firebase_project_id:
            raise FirebaseAuthenticationUnavailableError from None

        try:
            return firebase_admin.initialize_app(
                credential=credentials.ApplicationDefault(),
                options={"projectId": settings.firebase_project_id},
            )
        except (FirebaseError, GoogleAuthError, ValueError) as error:
            raise FirebaseAuthenticationUnavailableError from error


def verify_identity_token(id_token: str) -> dict[str, str | None]:
    try:
        claims = firebase_auth.verify_id_token(id_token, app=_get_firebase_app())
    except (firebase_auth.InvalidIdTokenError, ValueError) as error:
        raise InvalidIdentityTokenError from error
    except (FirebaseError, GoogleAuthError) as error:
        raise FirebaseAuthenticationUnavailableError from error

    return {"uid": claims["uid"], "email": claims.get("email")}
