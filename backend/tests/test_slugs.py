import pytest

from app.services.slugs import slugify


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Ana y Luis", "ana-y-luis"),
        ("José y Begoña", "jose-y-begona"),
        ("  ÁLVARO   &  Íñigo!! ", "alvaro-inigo"),
        ("María-José y Zoë", "maria-jose-y-zoe"),
        ("¡¡¡", ""),
    ],
)
def test_slugify(text, expected):
    assert slugify(text) == expected


def test_slugify_respects_max_length_without_trailing_hyphen():
    result = slugify("a" * 79 + " b")
    assert result == "a" * 79
