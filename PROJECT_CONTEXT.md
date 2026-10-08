# Project Context

## 1. Project Overview

Event Memory is a web platform for creating digital pages for events and sharing event information and memories with attendees.

The first product version is focused on weddings.

The architecture must allow the platform to support additional event types in the future without requiring a complete redesign.

---

## 2. Current MVP

The MVP focuses exclusively on weddings.

### Couple

The couple can:

* Create an account.
* Authenticate.
* Create and edit a wedding.
* Configure basic event information.
* Add a main photograph.
* Select an available template.
* Manage guests.
* View RSVP responses.
* View photographs shared by attendees.

### Guest

Guests do not need to create an account.

They can:

* Access a public event page.
* View wedding information.
* View the event location.
* Confirm attendance.
* Specify the number of attendees.
* Provide allergy or dietary restriction information.
* Upload photographs.

---

## 3. Technology Stack

### Frontend

* Angular
* TypeScript
* Angular Signals
* Angular Router
* Reactive Forms
* Angular Material when appropriate

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* PostgreSQL

### External Services

* Firebase Authentication
* Supabase Storage

---

## 4. Repository Structure

The project uses a monorepo.

```text
event-memory/
├── frontend/
├── backend/
├── docs/
├── AGENTS.md
├── PLAN.md
├── PROJECT_CONTEXT.md
├── README.md
└── .gitignore
```

The frontend and backend are independent applications contained in the same repository.

---

## 5. Backend Architecture

The backend will follow a layered architecture:

```text
Router
   ↓
Service
   ↓
Repository
   ↓
Database
```

### Router

Responsible for:

* HTTP endpoints.
* Request and response handling.
* Dependency injection.
* HTTP-level validation and status codes.

Routers should not contain business logic.

### Service

Responsible for:

* Business rules.
* Application logic.
* Coordinating repositories and external services.

### Repository

Responsible for:

* Database access.
* Queries.
* Persistence operations.

Repositories should not contain business rules.

---

## 6. Frontend Architecture

The frontend will use Angular standalone components.

Responsibilities should be separated between:

* Components.
* Services.
* Models/types.
* Routing.
* State management.

Angular Signals will be used for local and shared reactive state when appropriate.

Business logic should not be unnecessarily duplicated between components.

---

## 7. Authentication

Firebase Authentication will be responsible for user authentication.

The backend will validate the authenticated user's identity before allowing access to protected resources.

Guests accessing public event pages will not require an application account.

---

## 8. File Storage

Supabase Storage will be used for event photographs.

Photographs should not be stored directly inside PostgreSQL.

The database will store the metadata and references required to associate photographs with events.

---

## 9. Database

PostgreSQL will be the primary relational database.

SQLAlchemy will be used as the ORM/database abstraction layer.

Database schema changes must be managed through migrations.

---

## 10. Development Principles

* Prefer simple solutions over premature abstraction.
* Avoid unnecessary dependencies.
* Keep responsibilities separated.
* Validate data at appropriate boundaries.
* Do not duplicate business logic unnecessarily.
* Do not implement functionality that is not part of the current task.
* Do not introduce architectural complexity without a concrete requirement.
* Security and sensitive configuration must be handled through environment variables.
* Changes should be small and reviewable.

---

## 11. AI-Assisted Development

AI tools may be used to assist with development.

AI-generated changes must follow the existing architecture and project conventions.

AI should:

* Modify only files necessary for the requested task.
* Avoid unrelated refactoring.
* Explain significant architectural decisions.
* Avoid introducing new dependencies without justification.
* Preserve existing functionality.
* Ask for confirmation before making large changes.
* Ask for confirmation if a task requires modifying more than five files.

AI must not:

* Rewrite the architecture without approval.
* Replace working code unnecessarily.
* Add features outside the requested scope.
* Commit secrets or credentials.
* Modify project conventions without explicit approval.

---

## 12. Git Workflow

The project follows a Git Flow-inspired workflow.

### Main branches

```text
main
develop
```

`main` represents stable/release-ready code.

`develop` is the integration branch for ongoing development.

### Feature branches

Features are developed in dedicated branches:

```text
feature/<short-description>
```

Examples:

```text
feature/project-setup
feature/authentication
feature/event-management
feature/photo-gallery
```

Other branch types may be used when appropriate:

```text
fix/<short-description>
docs/<short-description>
refactor/<short-description>
```

Changes should not be developed directly on `main` or `develop`.

### Pull Requests

Completed branches are merged through Pull Requests.

Even when working alone, Pull Requests are used to maintain a professional workflow and provide a reviewable development history.

### Commits

Commits follow Conventional Commits.

Examples:

```text
feat(auth): implementar autenticación
fix(events): corregir validación de fecha
docs(project): actualizar documentación
refactor(events): separar lógica de negocio
chore(project): configurar entorno
```

---

## 13. Current Status

The project is currently in the initial repository setup phase.

No frontend or backend application has been implemented yet.
