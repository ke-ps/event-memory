from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.events import PublicEventRead
from app.services.events import get_published_event

router = APIRouter()


@router.get(
    "/events/{slug}",
    response_model=PublicEventRead,
    summary="Consultar un evento publicado por su dirección",
)
def get_public_event(
    slug: str,
    session: Annotated[Session, Depends(get_db)],
) -> PublicEventRead:
    return PublicEventRead.model_validate(get_published_event(session, slug))
