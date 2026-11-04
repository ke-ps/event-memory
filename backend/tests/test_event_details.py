import pytest
from pydantic import ValidationError

from app.schemas.event_details import UnknownEventTypeError, validate_event_details


def test_valid_wedding_details_are_normalized() -> None:
    assert validate_event_details(
        "wedding", {"partner_one_name": "  Ana ", "partner_two_name": "Luis"}
    ) == {"partner_one_name": "Ana", "partner_two_name": "Luis"}


def test_accented_names_are_accepted() -> None:
    result = validate_event_details(
        "wedding", {"partner_one_name": "José", "partner_two_name": "Begoña"}
    )

    assert result["partner_two_name"] == "Begoña"


@pytest.mark.parametrize("name", ["", "   ", "a" * 101])
def test_invalid_name_length_is_rejected(name: str) -> None:
    with pytest.raises(ValidationError):
        validate_event_details("wedding", {"partner_one_name": name, "partner_two_name": "Luis"})


def test_name_of_100_characters_is_accepted() -> None:
    name = "a" * 100

    result = validate_event_details(
        "wedding", {"partner_one_name": name, "partner_two_name": "Luis"}
    )

    assert result["partner_one_name"] == name


def test_missing_partner_name_is_rejected() -> None:
    with pytest.raises(ValidationError):
        validate_event_details("wedding", {"partner_one_name": "Ana"})


def test_non_string_name_is_rejected() -> None:
    with pytest.raises(ValidationError):
        validate_event_details("wedding", {"partner_one_name": 123, "partner_two_name": "Luis"})


def test_extra_fields_are_rejected() -> None:
    with pytest.raises(ValidationError):
        validate_event_details(
            "wedding",
            {
                "partner_one_name": "Ana",
                "partner_two_name": "Luis",
                "child_name": "Lucía",
            },
        )


def test_unknown_event_type_is_rejected() -> None:
    with pytest.raises(UnknownEventTypeError):
        validate_event_details("baptism", {"child_name": "Lucía"})
