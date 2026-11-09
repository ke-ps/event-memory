from datetime import date, datetime, time
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"
SLUG_MAX_LENGTH = 80
MAX_LOCATIONS = 10


RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


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
        StringConstraints(min_length=3, max_length=SLUG_MAX_LENGTH, pattern=SLUG_PATTERN),
    ]
    details: dict[str, Any]
    event_date: date | None
    start_time: time | None


class LocationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: Annotated[RequiredText, Field(max_length=60)]
    venue_name: Annotated[RequiredText, Field(max_length=150)]
    address: Annotated[RequiredText, Field(max_length=300)]
    start_time: time | None


class EventLocationsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locations: list[LocationWrite] = Field(max_length=MAX_LOCATIONS)


class PublicLocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    venue_name: str
    address: str
    start_time: time | None
    position: int


class LocationRead(PublicLocationRead):
    id: UUID


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
