# Create and View Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An authenticated couple creates its wedding from the dashboard with a minimal form (two names, optional date) and sees it on return.

**Architecture:** FastAPI Router → Service → Repository over the existing `Event` model; a reusable `get_current_user` dependency; backend tests against a real PostgreSQL test database with per-test rollback. Angular standalone components with Signals and Reactive Forms; API error codes translated with `$localize`.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pytest, PostgreSQL 18; Angular 21, Vitest, `@angular/localize`.

**Spec:** `docs/superpowers/specs/2026-11-05-create-event-design.md`

## Global Constraints

- Backend commands run from `backend/` with `.venv/Scripts/python.exe`; frontend commands from `frontend/`.
- Before every commit: backend `python -m pytest`, `ruff check .`, `ruff format --check .`; frontend `npx ng test --watch=false`, `npm run lint`, `npm run format:check`, `npm run build`.
- Commits: Conventional Commits, body `Refs #23`, no AI attribution.
- Error codes (exact): `missing_token`, `invalid_token`, `auth_unavailable`, `event_already_exists` (409), `unsupported_event_type` (422), `validation_error` (422), `event_not_found` (404), `slug_conflict` (409).
- `event_type` accepted: `wedding` only. Title max 150. Slug max 80, format `^[a-z0-9]+(-[a-z0-9]+)*$`. Partner names 1–100 chars after stripping.
- `owner_firebase_uid` never appears in API responses and never comes from the request body.
- Test database name: `{POSTGRES_DB}_test` (locally `event_memory_test`), same credentials as `backend/.env`. Never print or read the database password.
- No new dependencies. No visual design work (keep current dashboard styles).
- Every fixed UI text is marked for translation with an `events.*` or `errors.*` custom ID; run `npm run extract-i18n` and commit `src/locale/messages.xlf`.

## Review Focus

- Names with accents/ñ (`José`, `Begoña`) → title keeps accents, slug `jose-y-begona` → test in Task 2 and Task 3.
- Two 100-char names → title truncated to 150 and slug ≤ 80 even with a `-2` suffix → test in Task 3.
- Names made only of spaces → 422 with `field` `details.partner_one_name`, nothing stored → test in Task 4.
- `GET /events/me` of user B never returns user A's event → test in Task 4.
- Frontend: a network failure in `getMine()` shows the error state with retry, not the empty form → test in Task 6.

---

### Task 1: Test database infrastructure and `get_current_user`

**Files:**
- Create: `backend/tests/conftest.py`
- Create: `backend/app/api/dependencies.py`
- Modify: `backend/app/api/routes/auth.py` (use the dependency)
- Modify: `.github/workflows/ci.yml` (create the test database)
- Test: `backend/tests/test_database.py`, existing `backend/tests/test_auth.py`

**Interfaces:**
- Produces:
  - `@dataclass(frozen=True) class CurrentUser: uid: str; email: str | None` in `app/api/dependencies.py`.
  - `def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)]) -> CurrentUser` — same 401/503 `AppError`s and `WWW-Authenticate` header as today's `/auth/me`; calls `verify_identity_token` looked up from `app.api.dependencies` (tests monkeypatch `app.api.dependencies.verify_identity_token`).
  - `/auth/me` returns `{"uid": user.uid, "email": user.email}` from `Depends(get_current_user)`.
  - Fixtures in `conftest.py`: `db_session` (function scope: `Session` bound to a connection inside an outer transaction, `join_transaction_mode="create_savepoint"`, rolled back after the test), `client` (TestClient with `get_db` overridden to `db_session`), `as_user` (callable `as_user(uid: str, email: str | None = None)` that overrides `get_current_user`; overrides cleared after each test).
  - Conftest sets `os.environ["POSTGRES_DB"] = f"{Settings().postgres_db}_test"` **before importing anything from `app`**, so `app.db.session.engine` and Alembic both target the test database. A session-scoped autouse-free fixture `migrated_engine` runs `alembic.command.upgrade(cfg, "head")` once (config from `backend/alembic.ini` with absolute `script_location`); `db_session` depends on it. If connecting fails with `OperationalError`, call `pytest.fail("Test database '<name>' is not reachable. Create it once (see docs/local-development.md, 'Base de datos de tests').", pytrace=False)`.

- [ ] **Step 1: Update `test_auth.py`** to monkeypatch `app.api.dependencies.verify_identity_token` instead of `app.api.routes.auth.verify_identity_token` (assertions unchanged). Write `test_database.py`:

```python
def test_migrations_create_events_tables(db_session):
    tables = set(inspect(db_session.connection()).get_table_names())
    assert {"events", "event_locations", "alembic_version"} <= tables

def test_each_test_starts_with_empty_events(db_session):  # count of events == 0
```

- [ ] **Step 2: Run** `python -m pytest -v` → test_auth fails (attribute missing on `app.api.dependencies`), test_database errors (fixture `db_session` not found).
- [ ] **Step 3: Implement** the dependency, the route change and `conftest.py` per Interfaces.
- [ ] **Step 4: CI** — in the backend job, before "Tests", add step "Create test database": `PGPASSWORD=ci-only-password psql -h localhost -U event_memory -d event_memory -c "CREATE DATABASE event_memory_test"`.
- [ ] **Step 5: Ask the controller to confirm `event_memory_test` exists locally** (owner `event_memory`) before running; then run the full backend check → all pass (21 existing + 2 new).
- [ ] **Step 6: Commit** `test(backend): probar contra una base de datos PostgreSQL de tests`.

---

### Task 2: `slugify`

**Files:**
- Create: `backend/app/services/slugs.py`
- Test: `backend/tests/test_slugs.py`

**Interfaces:**
- Produces: `def slugify(text: str, max_length: int = 80) -> str` — NFKD normalize, drop combining marks (so `ñ`→`n`), lowercase, every run of non `[a-z0-9]` → single `-`, strip leading/trailing `-`, cut to `max_length` and strip a trailing `-` left by the cut. Returns `""` when nothing remains.

- [ ] **Step 1: Write tests:**

```python
@pytest.mark.parametrize(("text", "expected"), [
    ("Ana y Luis", "ana-y-luis"),
    ("José y Begoña", "jose-y-begona"),
    ("  ÁLVARO   &  Íñigo!! ", "alvaro-inigo"),
    ("María-José y Zoë", "maria-jose-y-zoe"),
    ("¡¡¡", ""),
])
def test_slugify(text, expected): assert slugify(text) == expected

def test_slugify_respects_max_length_without_trailing_hyphen():
    result = slugify("a" * 79 + " b")
    assert len(result) <= 80 and not result.endswith("-")
```

- [ ] **Step 2: Run** `python -m pytest tests/test_slugs.py -v` → ModuleNotFoundError.
- [ ] **Step 3: Implement** with `unicodedata` and `re`.
- [ ] **Step 4: Full backend check** → pass.
- [ ] **Step 5: Commit** `feat(events): generar URLs legibles a partir de texto`.

---

### Task 3: Schemas, repository and service

**Files:**
- Create: `backend/app/schemas/events.py`
- Create: `backend/app/repositories/__init__.py` (empty), `backend/app/repositories/events.py`
- Create: `backend/app/services/events.py`
- Test: `backend/tests/test_events_service.py`

**Interfaces:**
- Consumes: `slugify` (Task 2); `validate_event_details`, `UnknownEventTypeError` (`app/schemas/event_details.py`); `AppError` (`app/core/errors.py`); fixture `db_session` (Task 1).
- Produces:
  - `class EventCreate(BaseModel)`: `event_type: str`, `details: dict[str, Any]`, `event_date: date | None = None`; `model_config = ConfigDict(extra="forbid")`.
  - `class LocationRead(BaseModel)`: `id: UUID`, `label: str`, `venue_name: str`, `address: str`, `position: int`; `from_attributes=True`.
  - `class EventRead(BaseModel)`: `id`, `event_type`, `title`, `slug`, `status`, `event_date`, `start_time: time | None`, `timezone`, `details: dict[str, Any]`, `locations: list[LocationRead]`, `created_at`, `updated_at`; `from_attributes=True`. No owner field.
  - Repository (`app/repositories/events.py`), no commits: `get_by_owner(session, owner_uid: str) -> Event | None`, `slug_exists(session, slug: str) -> bool`, `add(session, event: Event) -> Event` (add + flush).
  - Service (`app/services/events.py`):
    - `def create_event(session: Session, owner_uid: str, data: EventCreate) -> Event`
    - `def get_own_event(session: Session, owner_uid: str) -> Event`
    - Errors raised as `AppError`: existing event → 409 `event_already_exists`; unknown type → 422 `unsupported_event_type`; invalid details → `AppError` 422 `validation_error` whose response also carries `errors` — add an optional `errors: list[dict[str, str]] | None = None` parameter to `AppError` and include it in the body when present (update `app/core/errors.py` and `tests/test_errors.py` with one test: `AppError(..., errors=[...])` → body has `errors`); each item `{"field": "details." + ".".join(loc), "code": error["type"]}`; no event → 404 `event_not_found`; slug unique violation after 5 attempts → 409 `slug_conflict`.
    - Title `f"{one} y {two}"[:150]` from validated details. Slug base `slugify(title) or "evento"`; candidate `base`, then `f"{base[:80 - len(suffix)].rstrip('-')}-{n}"` for n = 2, 3… until `slug_exists` is false. Insert inside `session.begin_nested()`; on `IntegrityError` whose constraint is `uq_events_slug`, retry with the next suffix (max 5 attempts). `session.commit()` at the end; `session.rollback()` and re-raise on any other error. `event_type` and validated `details` stored as given; `status`/`timezone` use model defaults.

- [ ] **Step 1: Write tests** (`db_session`):
  - `test_create_event_generates_title_and_slug` → title `"Ana y Luis"`, slug `"ana-y-luis"`, status `"draft"`, timezone `"Europe/Madrid"`, owner `"uid-a"`.
  - `test_create_event_with_accents` → `"José y Begoña"`, `"jose-y-begona"`.
  - `test_duplicate_slug_gets_suffix` → second couple Ana y Luis (`uid-b`) gets `"ana-y-luis-2"`, third `"ana-y-luis-3"`.
  - `test_long_names_are_truncated` → names `"a"*100` and `"b"*100`: `len(title) == 150`; with a second such event, slug ends `"-2"` and `len(slug) <= 80`.
  - `test_second_event_for_same_owner_is_rejected` → `AppError` with `status_code == 409`, `code == "event_already_exists"`.
  - `test_unknown_event_type_is_rejected` → 422 `unsupported_event_type`.
  - `test_invalid_details_are_rejected_with_field_errors` → `partner_one_name="  "` → 422 `validation_error`, `errors` contains `{"field": "details.partner_one_name", "code": "string_too_short"}`; no row stored.
  - `test_get_own_event` returns the created event; `test_get_own_event_without_event` → 404 `event_not_found`.
- [ ] **Step 2: Run** → ModuleNotFoundError.
- [ ] **Step 3: Implement** per Interfaces (plus the `AppError.errors` extension and its test).
- [ ] **Step 4: Full backend check** → pass.
- [ ] **Step 5: Commit** `feat(events): reglas de negocio para crear y consultar el evento`.

---

### Task 4: Events API and backend docs

**Files:**
- Create: `backend/app/api/routes/events.py`
- Modify: `backend/app/api/router.py` (`include_router(events_router, prefix="/events", tags=["events"])`)
- Modify: `PROJECT_CONTEXT.md` (§4 layers with the `events` example and `get_current_user`; new "Testing" paragraph: PostgreSQL test database, per-test rollback, fixtures; §9 error code list adds the five new codes)
- Modify: `docs/local-development.md` (new subsection "Base de datos de tests": create `event_memory_test` owned by `event_memory` in pgAdmin or `CREATE DATABASE event_memory_test OWNER event_memory;`; and how to start the backend with `GOOGLE_APPLICATION_CREDENTIALS` to use the dashboard)
- Test: `backend/tests/test_events_api.py`

**Interfaces:**
- Consumes: `create_event`, `get_own_event`, `EventCreate`, `EventRead` (Task 3); `get_current_user`, `CurrentUser` (Task 1); `get_db`.
- Produces: `POST /api/v1/events` → 201 `EventRead`; `GET /api/v1/events/me` → 200 `EventRead`. Route order: `/me` declared so it is not shadowed.

- [ ] **Step 1: Write tests** (`client`, `as_user`):
  - `test_create_event_returns_201` → body has `title`, `slug`, `status == "draft"`, `locations == []`, `event_date == "2027-06-12"`, and `"owner_firebase_uid" not in body`.
  - `test_create_event_without_date` → `event_date is None`.
  - `test_create_second_event_returns_409` → `code == "event_already_exists"`.
  - `test_blank_name_returns_422_with_field` → `errors` contains `field == "details.partner_one_name"`; then `GET /me` → 404.
  - `test_extra_body_field_returns_422` → `{"owner_firebase_uid": "x", ...}` → 422 `validation_error`.
  - `test_unsupported_type_returns_422` → `code == "unsupported_event_type"`.
  - `test_get_my_event` → 200 same `id`; `test_get_my_event_without_event` → 404 `event_not_found`.
  - `test_users_do_not_see_each_others_event` → user A creates; as user B `GET /me` → 404.
  - `test_requires_authentication` → without `as_user`, `POST` and `GET /me` → 401 `missing_token`.
- [ ] **Step 2: Run** → 404s (routes missing).
- [ ] **Step 3: Implement** the router (thin: depends on `get_db` and `get_current_user`, returns `EventRead.model_validate(event)`).
- [ ] **Step 4: Update docs** per Files.
- [ ] **Step 5: Full backend check** → pass.
- [ ] **Step 6: Commit** `feat(events): API para crear y consultar el evento`.

---

### Task 5: Frontend models, API service and error messages

**Files:**
- Create: `frontend/src/app/events/event.models.ts`
- Create: `frontend/src/app/events/event-api.service.ts`
- Create: `frontend/src/app/core/api-error-messages.ts`
- Test: `frontend/src/app/events/event-api.service.spec.ts`, `frontend/src/app/core/api-error-messages.spec.ts`

**Interfaces:**
- Produces:
  - Types: `WeddingDetails { partner_one_name: string; partner_two_name: string }`, `EventLocation { id; label; venue_name; address; position: number }`, `EventRead` (fields of the spec, `status: 'draft' | 'published'`, `event_date: string | null`), `EventCreateRequest { event_type: 'wedding'; details: WeddingDetails; event_date: string | null }`.
  - `@Injectable({ providedIn: 'root' }) class EventApiService` with `create(request: EventCreateRequest): Promise<EventRead>` and `getMine(): Promise<EventRead | null>` (404 → `null`, other errors rethrown). Token from `AuthService.currentUser()?.getIdToken()`; if no user, reject with `Error('not_authenticated')`. URL `${environment.apiBaseUrl}/events` and `/events/me`.
  - `apiErrorMessage(error: unknown): string` — reads `HttpErrorResponse.error.code`; translated messages (`$localize` with ids `errors.<code>`) for: `event_already_exists`, `unsupported_event_type`, `validation_error`, `event_not_found`, `missing_token`, `invalid_token`, `auth_unavailable`, `slug_conflict`; status 0 → `errors.network`; anything else → `errors.unknown`.
  - `apiFieldErrors(error: unknown): Record<string, string>` — for `validation_error`, maps each `errors[].field` to a translated message by `code` (`string_too_short`/`missing` → `errors.field.required`, `string_too_long` → `errors.field.tooLong`, otherwise `errors.field.invalid`); `{}` otherwise.

- [ ] **Step 1: Write tests:**
  - API service (`HttpTestingController`, fake `AuthService` with `currentUser` signal of `{ getIdToken: () => Promise.resolve('tok') }`): `create` posts the exact body to `/events` with `Authorization: Bearer tok`; `getMine` GETs `/events/me`; 404 → `null`; 500 → rejects; no user → rejects `not_authenticated`.
  - Error messages: known code returns its message (assert equals the Spanish text); unknown code → generic; status 0 → network message; non-HTTP error → generic; `apiFieldErrors` maps `details.partner_one_name` + `string_too_short` → required message and returns `{}` for a 409.
- [ ] **Step 2: Run** `npx ng test --watch=false` → fail (modules missing).
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Full frontend check** → pass.
- [ ] **Step 5: Commit** `feat(events): cliente de la API de eventos y mensajes de error traducibles`.

---

### Task 6: Create form, summary and dashboard

**Files:**
- Create: `frontend/src/app/events/event-create-form.component.ts`
- Create: `frontend/src/app/events/event-summary.component.ts`
- Modify: `frontend/src/app/dashboard/dashboard-page.component.ts`
- Modify: `frontend/src/locale/messages.xlf` (regenerated), `PLAN.md` (mark «Crear evento» and «Consultar el evento propio»)
- Test: `frontend/src/app/events/event-create-form.component.spec.ts`, `frontend/src/app/dashboard/dashboard-page.component.spec.ts`

**Interfaces:**
- Consumes: `EventApiService`, `apiErrorMessage`, `apiFieldErrors`, `EventRead` (Task 5).
- Produces:
  - `EventCreateFormComponent` (`app-event-create-form`): Reactive Form `partnerOneName`, `partnerTwoName` (required, maxLength 100, custom validator rejecting whitespace-only), `eventDate` (optional, `<input type="date">`). On submit calls `EventApiService.create({ event_type: 'wedding', details: { partner_one_name, partner_two_name }, event_date: eventDate || null })`; `output<EventRead>() created`. Shows client-side errors when touched, API field errors under each input (`details.partner_one_name` → first name, `details.partner_two_name` → second, `event_date` → date) and the general `apiErrorMessage` otherwise. Submit disabled while saving.
  - `EventSummaryComponent` (`app-event-summary`): `input.required<EventRead>() event`; shows title, `event_date | date: 'longDate'` or «Fecha por decidir», and status label (`draft` → «Borrador», `published` → «Publicado»).
  - Dashboard: `state = signal<'loading' | 'empty' | 'ready' | 'error'>('loading')`, `event = signal<EventRead | null>(null)`; on init `getMine()` → `ready`/`empty`; on error → `error` with `apiErrorMessage` and a retry button; `(created)` → set event and `ready`. Keeps existing texts and styles.

- [ ] **Step 1: Write tests:**
  - Form: submit disabled when empty; whitespace-only name invalid; valid submit calls `create` with `event_date: null` when no date; emits `created`; API 422 with `details.partner_one_name` shows the required message under the first field.
  - Dashboard (fake `EventApiService`): shows form when `getMine` → `null`; shows summary title when it returns an event; shows error message and retry when it rejects (status 0), and retry calls `getMine` again; after the form emits `created`, summary is shown.
- [ ] **Step 2: Run** → fail.
- [ ] **Step 3: Implement** per Interfaces; mark every text with `events.*` ids.
- [ ] **Step 4: Run** `npm run extract-i18n` and update `PLAN.md`.
- [ ] **Step 5: Full frontend check** → pass.
- [ ] **Step 6: Commit** `feat(events): la pareja crea y ve su boda desde el panel`.
