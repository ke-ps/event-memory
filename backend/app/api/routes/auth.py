from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me", summary="Identidad autenticada")
def get_current_identity(
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, str | None]:
    return {"uid": user.uid, "email": user.email}
