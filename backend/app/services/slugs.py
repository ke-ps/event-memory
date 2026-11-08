import re
import unicodedata


def slugify(text: str, max_length: int = 80) -> str:
    """Convierte un texto en un identificador legible apto para URLs."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_marks = "".join(c for c in decomposed if not unicodedata.combining(c))
    slug = re.sub(r"[^a-z0-9]+", "-", without_marks.lower()).strip("-")
    return slug[:max_length].rstrip("-")
