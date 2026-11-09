from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_current_user
from app.db.session import get_db
from app.schemas.events import EventCreate, EventLocationsUpdate, EventRead, EventUpdate
from app.services.events import (
    create_event,
    delete_own_event,
    get_own_event,
    publish_own_event,
    unpublish_own_event,
    update_own_event,
    update_own_event_locations,
)

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=EventRead,
    summary="Crear el evento del usuario",
)
def create_my_event(
    data: EventCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(create_event(session, user.uid, data))


@router.get("/me", response_model=EventRead, summary="Consultar el evento del usuario")
def get_my_event(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(get_own_event(session, user.uid))


@router.put("/me", response_model=EventRead, summary="Editar el evento del usuario")
def update_my_event(
    data: EventUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(update_own_event(session, user.uid, data))


@router.put(
    "/me/locations", response_model=EventRead, summary="Guardar los lugares del evento del usuario"
)
def update_my_event_locations(
    data: EventLocationsUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(update_own_event_locations(session, user.uid, data))


@router.post("/me/publish", response_model=EventRead, summary="Publicar el evento del usuario")
def publish_my_event(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(publish_own_event(session, user.uid))


@router.post("/me/unpublish", response_model=EventRead, summary="Despublicar el evento del usuario")
def unpublish_my_event(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> EventRead:
    return EventRead.model_validate(unpublish_own_event(session, user.uid))


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar el evento del usuario",
)
def delete_my_event(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_db)],
) -> None:
    delete_own_event(session, user.uid)
