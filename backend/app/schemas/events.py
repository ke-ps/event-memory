from datetime import date, datetime, time
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, StringConstraints


def _normalize_slug(value: object) -> object:
    # pydantic checks the pattern before to_lower, so normalize first.
    return value.strip().lower() if isinstance(value, str) else value


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: str
    details: dict[str, Any]
    event_date: date | None = None


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)] | None
    slug: Annotated[
        str,
        BeforeValidator(_normalize_slug),
        StringConstraints(min_length=3, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$"),
    ]
    details: dict[str, Any]
    event_date: date | None
    start_time: time | None


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    label: str
    venue_name: str
    address: str
    position: int


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    title: str
    slug: str
    status: str
    event_date: date | None
    start_time: time | None
    timezone: str
    details: dict[str, Any]
    locations: list[LocationRead]
    created_at: datetime
    updated_at: datetime


class PublicLocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    venue_name: str
    address: str
    position: int


class PublicEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type: str
    title: str
    slug: str
    event_date: date | None
    start_time: time | None
    timezone: str
    details: dict[str, Any]
    locations: list[PublicLocationRead]
