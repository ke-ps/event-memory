from datetime import date, datetime, time
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints


class EventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: str
    details: dict[str, Any]
    event_date: date | None = None


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)] | None
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
