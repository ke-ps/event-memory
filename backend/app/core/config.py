from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Event Memory API"
    api_v1_prefix: str = "/api/v1"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "event_memory"
    postgres_user: str = "event_memory"
    postgres_password: str = ""
    frontend_origin: str = "http://localhost:4200"
    firebase_project_id: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
