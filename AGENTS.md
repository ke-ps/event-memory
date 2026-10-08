# AI Development Guidelines

## 1. Project Context

Before modifying the codebase, read:

* `README.md`
* `PLAN.md`
* `PROJECT_CONTEXT.md`

These files define the project's scope, roadmap, architecture and development conventions.

---

## 2. General Rules

When working on this project:

* Follow the existing architecture.
* Prefer simple and maintainable solutions.
* Do not introduce unnecessary complexity.
* Do not implement features outside the requested task.
* Do not perform unrelated refactors.
* Do not rewrite working code without a clear reason.
* Preserve existing functionality.
* Follow the project's naming and coding conventions.

---

## 3. Scope Control

Only modify the files necessary to complete the requested task.

If completing a task requires modifying more than five files:

1. Stop before making the changes.
2. Explain why the additional files are necessary.
3. Ask for confirmation.

Do not expand the scope of a task without approval.

---

## 4. Architecture

Respect the architecture defined in `PROJECT_CONTEXT.md`.

### Backend

Follow:

```text
Router → Service → Repository → Database
```

Business logic should not be placed inside routers.

Database access should not be placed directly inside services when a repository is appropriate.

### Frontend

Maintain a clear separation between:

* Components.
* Services.
* Models/types.
* Routing.
* State management.

Avoid placing excessive business logic inside components.

---

## 5. Dependencies

Do not install new dependencies automatically.

Before adding a dependency:

* Explain why it is necessary.
* Prefer existing project capabilities when possible.
* Consider whether the dependency is actively maintained.
* Avoid adding a dependency for functionality that can reasonably be implemented with the existing stack.

Ask for approval when the dependency has a significant architectural impact.

---

## 6. Security

Never:

* Commit passwords.
* Commit API keys.
* Commit Firebase credentials.
* Commit Supabase credentials.
* Expose secrets in source code.
* Disable security mechanisms simply to make development easier.

Use environment variables for sensitive configuration.

Do not weaken authentication or authorization to bypass development problems.

---

## 7. Database

Respect the existing database structure.

Database schema changes must use migrations.

Do not manually modify production database structures as part of normal development.

Before making significant schema changes, explain:

* What changes.
* Why it is necessary.
* Which existing data could be affected.

---

## 8. API

Follow REST conventions and the existing API structure.

Keep HTTP concerns inside routers/controllers and business rules inside services.

Validate incoming data using the project's validation mechanisms.

Use appropriate HTTP status codes.

Do not expose internal implementation details unnecessarily through API responses.

---

## 9. Frontend

Use Angular standalone APIs.

Prefer Angular Signals when reactive state is required.

Use Reactive Forms for forms.

Keep components focused on presentation and interaction.

Move reusable logic into services when appropriate.

Do not introduce a global state management library unless there is a concrete requirement for it.

---

## 10. Code Quality

Code should prioritize:

1. Correctness.
2. Readability.
3. Maintainability.
4. Simplicity.

Avoid clever code when a simpler implementation is easier to understand.

Use descriptive names.

Keep functions and components reasonably focused.

Do not optimize prematurely.

---

## 11. Testing

When tests exist, do not remove or weaken them to make a task pass.

For new functionality, consider appropriate tests based on the complexity and importance of the feature.

Critical business rules should have tests.

---

## 12. Git

Do not create commits automatically unless explicitly requested.

Before recommending a commit:

* Verify the changed files.
* Check the project status.
* Ensure no secrets or unnecessary files are included.

Use Conventional Commits.

Examples:

```text
feat(auth): implementar autenticación
fix(events): corregir validación
docs(project): actualizar documentación
refactor(events): separar lógica de negocio
chore(project): configurar entorno
```

---

## 13. Communication

Before making significant changes:

* Explain what will change.
* Explain why it is needed.
* Mention relevant trade-offs.

If the requirements are ambiguous and the decision could affect architecture, ask before implementing.

For small, obvious implementation details, proceed without unnecessary questions.

---

## 14. AI Behavior

The AI is an implementation assistant, not the owner of the architecture.

The AI must not independently:

* Change the technology stack.
* Redesign the architecture.
* Add major features.
* Introduce unnecessary abstractions.
* Replace libraries without justification.
* Modify unrelated parts of the project.

When a better architectural alternative is identified, explain it separately rather than silently changing the existing design.

---

## 15. Documentation

If a change modifies an important architectural decision, update the relevant documentation.

Do not update documentation unnecessarily for trivial implementation changes.

Documentation should describe the current state of the project, not hypothetical future functionality.

---

## 16. Definition of Done

A task is considered complete when:

* The requested functionality is implemented.
* Existing functionality still works.
* The code follows the project architecture.
* No unnecessary files or dependencies were introduced.
* Relevant validation/tests have been performed.
* Documentation is updated when necessary.
* The changes are ready to be reviewed in a Pull Request.
