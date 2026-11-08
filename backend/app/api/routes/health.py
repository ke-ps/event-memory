from fastapi import APIRouter

from app.services.health import get_health_status

router = APIRouter()


@router.get("/health", summary="Estado de la API")
def health_check() -> dict[str, str]:
    return get_health_status()
