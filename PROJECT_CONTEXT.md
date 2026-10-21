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

The project follows a lightweight Git Flow-inspired workflow. GitHub Issues track work, Pull Requests review changes, and only release-ready code is promoted to `main`.

### Main branches

```text
main
develop
```

`main` represents stable/release-ready code.

`develop` is the integration branch for ongoing development.

### Feature branches

Before starting a change:

1. Create or select a GitHub Issue describing the goal and acceptance criteria.
2. Update the local `develop` branch from `origin/develop`.
3. Create a short-lived branch from `develop` for that issue.

Use these branch prefixes:

```text
feature/<short-description>
fix/<short-description>
docs/<short-description>
refactor/<short-description>
chore/<short-description>
```

Examples:

```text
feature/project-setup
feature/authentication
feature/event-management
feature/photo-gallery
```

Additional examples across branch types:

```text
feature/guest-rsvp
fix/event-date-validation
docs/github-workflow
refactor/event-repository
chore/dependency-update
```

Do not develop directly on `main` or `develop`. Keep branches focused on one issue and delete them after they are merged.

Example commands after selecting an Issue:

```bash
git switch develop
git pull origin develop
git switch -c feature/short-description
```

### Commits

Commits follow Conventional Commits and describe one logical change. Use the issue number in the commit body when useful.

```text
feat(auth): add couple sign-in
fix(events): validate event date
docs(project): document GitHub workflow
refactor(events): separate repository queries
chore(project): update local setup
```

### Pull Requests

Open a Pull Request from the task branch into `develop`. Each PR should:

* Link the GitHub Issue and close it on merge (for example, `Closes #12`).
* Summarize the change and note any setup or configuration steps.
* State what validation was performed and include screenshots for visible UI changes when useful.
* Have its review feedback addressed and required automated checks passing before merge.

Use **Squash and merge** so each issue lands as one readable commit on `develop`; keep the squash commit title in Conventional Commits format. If working alone, review the PR and its diff yourself before merging. When collaborating, require at least one approval from another contributor.

Even when working alone, Pull Requests are used to maintain a professional workflow and provide a reviewable development history.

### Releases

When `develop` is ready for a stable release, open a Pull Request from `develop` into `main`. Review the complete release diff, confirm required checks pass, and merge only after approval. `main` must contain release-ready code; ongoing work stays on `develop`.

### GitHub branch protection

Configure rulesets for `main` and `develop` to:

* Require changes to arrive through a Pull Request; block direct pushes and force pushes.
* Require applicable automated checks before merging once CI checks are configured.
* In a team, require at least one approval from another contributor. When working alone, require a PR but do not require an approval from a second person.

Until CI is configured, the PR author must record the manual validation performed. Do not claim a check passed unless it was actually run.

---

## 13. Current Status

The initial technical foundation is in place: Angular frontend, FastAPI backend, local PostgreSQL configuration, and a backend health check. Authentication and product features have not yet been implemented.
