from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WeddingDetails(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)

    partner_one_name: str = Field(min_length=1, max_length=100)
    partner_two_name: str = Field(min_length=1, max_length=100)
    welcome_text: str | None = Field(default=None, max_length=500)
    story: str | None = Field(default=None, max_length=2000)

    @field_validator("welcome_text", "story")
    @classmethod
    def empty_text_is_absent(cls, text: str | None) -> str | None:
        return text or None


class UnknownEventTypeError(ValueError):
    pass


EVENT_DETAILS_SCHEMAS: dict[str, type[BaseModel]] = {"wedding": WeddingDetails}


def validate_event_details(event_type: str, details: dict[str, Any]) -> dict[str, Any]:
    schema = EVENT_DETAILS_SCHEMAS.get(event_type)
    if schema is None:
        raise UnknownEventTypeError(event_type)
    return schema.model_validate(details).model_dump(mode="json", exclude_none=True)
