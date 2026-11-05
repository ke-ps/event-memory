from collections.abc import Callable, Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentUser, get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.main import app

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DATABASE_NAME = f"{settings.postgres_db}_test"


@pytest.fixture(scope="session")
def migrated_engine() -> Generator[Engine, None, None]:
    assert TEST_DATABASE_NAME.endswith("_test")
    test_engine = create_engine(
        URL.create(
            drivername="postgresql+psycopg",
            username=settings.postgres_user,
            password=settings.postgres_password or None,
            host=settings.postgres_host,
            port=settings.postgres_port,
            database=TEST_DATABASE_NAME,
        )
    )
    try:
        with test_engine.connect() as connection:
            config = Config(str(BACKEND_DIR / "alembic.ini"))
            config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
            connection.commit()
    except OperationalError:
        pytest.fail(
            f"Test database '{TEST_DATABASE_NAME}' is not reachable. Create it once "
            "(see docs/local-development.md, 'Base de datos de tests').",
            pytrace=False,
        )
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db_session(migrated_engine: Engine) -> Generator[Session, None, None]:
    connection = migrated_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def as_user(client: TestClient) -> Callable[[str, str | None], None]:
    def _as_user(uid: str, email: str | None = None) -> None:
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(uid=uid, email=email)

    return _as_user
