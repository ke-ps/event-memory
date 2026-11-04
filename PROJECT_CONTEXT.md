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

Routers do not contain business logic.

### Service

* Business rules and application logic.
* Coordinating repositories and external services.

### Repository

* Database access, queries and persistence operations.

Repositories do not contain business rules. The repository layer and request/response schemas are introduced with the first CRUD resource (events).

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

### Initial event model

The `events` table stores the initial wedding event data:

* UUID identifier and Firebase UID of the owner (indexed).
* Event type, initially `wedding`.
* Names of the two partners.
* Optional event date, location, and main photograph storage path.
* Active status and creation/update timestamps.

Firebase remains an external identity provider, so the owner UID is not a PostgreSQL foreign key. The model is reviewed at the start of Phase 3 to separate common event data from type-specific data and to add time zone, public URL identifier and draft/published status (see `PLAN.md`).

---

## 9. Architectural Decisions

Agreed decisions that apply to new code. Items marked *pending* are implemented in Phase 3.

* **Event types:** common event data is separated from type-specific data so new types do not require redesigning the events table. Only `wedding` is accepted in the MVP.
* **One active event per account:** enforced in the service layer, not with a database constraint, so it can be relaxed later.
* **API errors (pending):** error responses carry a stable machine-readable `code` in addition to a human-readable message, so the frontend can show translated messages.
* **Internationalization (pending):** the UI is in Spanish and uses Angular's built-in i18n from the start; no third-party translation library. Dates and numbers are formatted through the locale (`es-ES`).
* **Time zones:** event times are stored with the event's time zone and displayed in that zone.

---

## 10. Current Status

The technical foundation is in place: Angular frontend, FastAPI backend, local PostgreSQL configuration and a backend health check. Firebase registration, sign-in and sign-out are implemented, and the backend verifies Firebase identity tokens. The frontend protects `/dashboard` by waiting for Firebase to restore the initial authentication state and redirects unauthenticated users to `/`. The initial SQLAlchemy event model and Alembic migration are in place. Quality tooling is configured: pytest and Ruff in the backend, Vitest, ESLint and Prettier in the frontend, and GitHub Actions CI running both on every Pull Request, with branch protection requiring both checks.
