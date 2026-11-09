# Project Context

Technical architecture and decisions of Event Memory. Product scope, decisions and roadmap live in `PLAN.md`; rules for AI-assisted development in `AGENTS.md`; the Git workflow in `docs/git-workflow.md`; local setup in `docs/local-development.md`.

---

## 1. Overview

Event Memory is a web platform for creating event pages and sharing information, attendance confirmations and photographs with guests. The first product is a wedding MVP. The architecture must support additional event types (christenings, birthdays…) and optional modules without a complete redesign.

---

## 2. Technology Stack

### Frontend

* Angular (standalone components) and TypeScript
* Angular Signals for reactive state
* Angular Router
* Reactive Forms
* Angular Material when appropriate

### Backend

* Python
* FastAPI
* SQLAlchemy 2 and Alembic
* Pydantic and pydantic-settings
* PostgreSQL

### External Services

* Firebase Authentication
* Supabase Storage

### Quality tooling

* Backend: pytest and Ruff.
* Frontend: Vitest (Angular unit-test builder with jsdom), angular-eslint and Prettier.
* CI: GitHub Actions (see `docs/git-workflow.md`).

---

## 3. Repository Structure

```text
event-memory/
├── .claude/skills/       # Project skills for Claude Code (session workflow)
├── .github/workflows/    # CI
├── backend/
│   ├── app/
│   │   ├── api/routes/   # Routers (HTTP layer)
│   │   ├── core/         # Configuration
│   │   ├── db/           # Declarative base and session
│   │   ├── models/       # SQLAlchemy models
│   │   └── services/     # Business logic
│   ├── migrations/       # Alembic
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/          # Feature folders (auth, dashboard) and services
│       └── environments/
├── docs/
├── AGENTS.md
├── CLAUDE.md
├── PLAN.md
├── PROJECT_CONTEXT.md
└── README.md
```

The frontend and backend are independent applications contained in the same repository.

---

## 4. Backend Architecture

The backend follows a layered architecture:

```text
Router → Service → Repository → Database
```

### Router

* HTTP endpoints, request and response handling.
* Dependency injection.
* HTTP-level validation and status codes.

Routers do not contain business logic. Example: `app/api/routes/events.py` only depends on `get_db` and `get_current_user` (from `app/api/dependencies.py`, which verifies the Firebase token and returns the authenticated `CurrentUser`), calls the service and returns the response schema.

### Service

* Business rules and application logic.
* Coordinating repositories and external services.

### Repository

* Database access, queries and persistence operations.

Repositories do not contain business rules. The repository layer and request/response schemas are introduced with the first CRUD resource (events).

### Testing

Backend tests run against a real PostgreSQL test database (`<POSTGRES_DB>_test`, e.g. `event_memory_test`), migrated to `head` once per session. Each test runs inside a transaction that is rolled back at the end, so tests do not leave data behind. Shared fixtures live in `backend/tests/conftest.py`: `db_session` (the per-test session), `client` (a `TestClient` with `get_db` overridden to that session) and `as_user(uid, email)` (overrides `get_current_user` to authenticate as a given user without Firebase). DB-backed tests must use the `db_session` / `client` fixtures, because the app's own engine (`app.db.session`) still targets the development database.

---

## 5. Frontend Architecture

The frontend uses Angular standalone components with responsibilities separated between components, services, models/types, routing and state. Angular Signals are used for local and shared reactive state when appropriate. Components focus on presentation and interaction; reusable logic lives in services.

---

## 6. Authentication

Firebase Authentication handles user authentication in the frontend. The backend verifies Firebase identity tokens before allowing access to protected resources. The owner of a resource is always taken from the verified token, never from the request body.

Guests do not have accounts. Public event pages and guest actions (attendance confirmation, photo uploads) are accessed through the event's public URL and, for confirmations, a personal guest link.

---

## 7. File Storage

Supabase Storage stores event photographs. Photographs are not stored in PostgreSQL; the database stores metadata and the storage object path.

---

## 8. Database

PostgreSQL is the primary relational database, accessed through SQLAlchemy. Schema changes are managed through Alembic migrations; applied migrations are never modified. A naming convention on the declarative base keeps constraint and index names predictable.

### Event model

The `events` table stores the data common to every event type:

* UUID identifier and Firebase UID of the owner (indexed).
* Event type (`wedding` in the MVP), title and unique public URL identifier (`slug`).
* `status`: `draft` or `published`, stored as text with a `CHECK` constraint.
* Optional event date and start time, and the time zone (default `Europe/Madrid`).
* `details`: a JSONB column with the data specific to the event type, validated with Pydantic according to `event_type` (`app/schemas/event_details.py`).
* Optional main photograph storage path and creation/update timestamps.

The `event_locations` table holds one or more places per event (label, venue name, address, optional start time and display position). It references `events` with `ON DELETE CASCADE`.

Firebase remains an external identity provider, so the owner UID is not a PostgreSQL foreign key.

---

## 9. Architectural Decisions

Agreed decisions that apply to new code.

* **Event types:** common event data is separated from type-specific data so new types do not require redesigning the events table. Only `wedding` is accepted in the MVP.
* **One event per account:** enforced in the service layer, not with a database constraint, so it can be relaxed later.
* **Event status:** an event is `draft` or `published`; there is no activation or deactivation. Deleting an event is permanent (no trash in the MVP).
* **Type-specific data:** stored in the `details` JSONB column and validated per `event_type` with Pydantic, so a new event type needs a schema but no migration. A wedding's `details` also hold two optional free texts, `welcome_text` (up to 500 characters) and `story` (up to 2000); empty texts are not stored. They are always rendered as plain text.
* **API errors:** every error response is `{"code": "...", "message": "..."}`. `code` is the stable, machine-readable contract the frontend translates; `message` is a Spanish fallback that may change. Validation errors (422, `validation_error`) add `errors: [{"field": "...", "code": "..."}]` with Pydantic's error types. Services and routers raise `AppError(status_code, code, message)` from `app/core/errors.py`; the handlers registered in `main.py` also convert validation errors and generic HTTP errors (`not_found`, `method_not_allowed`…). Current codes: `missing_token`, `invalid_token` (401), `auth_unavailable` (503), `validation_error` (422), `event_already_exists` (409), `unsupported_event_type` (422), `event_not_found` (404), `slug_conflict` (409), `slug_taken` (409), `slug_locked` (409), `event_date_required` (422). New codes use `snake_case` and are added to this list.
* **Internationalization:** the UI is in Spanish and uses Angular's built-in i18n (`@angular/localize`); no third-party translation library. The source locale is `es` (`angular.json` → `i18n.sourceLocale`), which sets `LOCALE_ID` and the Spanish date and number formats. Every fixed UI text is marked for translation with a stable custom ID in the form `area.element` (for example `auth.signIn.title`, `common.loading`): `i18n="@@id"` in templates and `` $localize`:@@id:text` `` in TypeScript. Texts that depend on a condition use `@if` blocks with one marked element per text, because text inside an expression cannot be extracted. The brand name «Event Memory» and user content are not marked. `npm run extract-i18n` writes `frontend/src/locale/messages.xlf`, which is versioned and is the source for future translations.
* **Time zones:** event times are stored with the event's time zone and displayed in that zone.
* **Editing the event:** `PUT /api/v1/events/me` replaces `title`, `slug`, `details`, `event_date` and `start_time`; `status`, `timezone`, `event_type`, locations and owner never change. `title`, `slug`, `event_date` and `start_time` are required in the body; `title`, `event_date` and `start_time` accept `null`, `slug` does not. The `slug` is trimmed and lowercased, must match `^[a-z0-9]+(-[a-z0-9]+)*$`, has 3–80 characters and is unique (`409 slug_taken`); it cannot change while the event is published (`409 slug_locked`). A published event cannot clear `event_date` (`422 event_date_required`). The title is free text of up to 150 characters; an empty or `null` title falls back to the one generated from the names, as on creation.
* **Event locations:** `PUT /api/v1/events/me/locations` replaces the whole list of places and returns the event (`locations` in the body is required; an empty list is valid). Each place has `label` (1–60), `venue_name` (1–150) and `address` (1–300), trimmed, plus `start_time` (required, accepts `null`); unknown fields are rejected and there can be at most 10 places. `position` is the index in the list, computed by the server. The map link is generated in the frontend from the venue name and the address; the backend stores no coordinates or URLs. Editing places works in `draft` and `published` and does not change the status.
* **Deleting the event:** `DELETE /api/v1/events/me` permanently deletes the owner's event and returns `204`; its locations are removed by the database cascade. There is no soft delete. Afterwards the owner can create a new event.
* **Publishing the event:** `POST /api/v1/events/me/publish` sets the status to `published` and `POST /api/v1/events/me/unpublish` back to `draft`; both return the event and are idempotent. Publishing requires `event_date` (`422 event_date_required`; clearing the date of a published event is rejected the same way). The `slug` is chosen by the owner in `PUT /api/v1/events/me` (`409 slug_taken` if already used) and is locked while the event is published (`409 slug_locked`).
* **Public API:** `GET /api/v1/public/events/{slug}` needs no authentication and is case-insensitive on the slug. A draft event and a non-existent slug both answer the same `404 event_not_found`, so drafts cannot be discovered. It exposes only `event_type`, `title`, `slug`, `event_date`, `start_time`, `timezone`, `details` and `locations` (`label`, `venue_name`, `address`, `start_time`, `position`); it never exposes `id`, `owner_firebase_uid`, `status`, `main_photo_path`, `created_at`, `updated_at` or location ids.

---

## 10. Current Status

The technical foundation is in place: Angular frontend, FastAPI backend, local PostgreSQL configuration and a backend health check. Firebase registration, sign-in and sign-out are implemented, and the backend verifies Firebase identity tokens. The frontend protects `/dashboard` by waiting for Firebase to restore the initial authentication state and redirects unauthenticated users to `/`. The revised event model (common columns plus a `details` JSONB validated per event type, and `event_locations`) and its Alembic migrations are in place. Quality tooling is configured: pytest and Ruff in the backend, Vitest, ESLint and Prettier in the frontend, and GitHub Actions CI running both on every Pull Request, with branch protection requiring both checks.
