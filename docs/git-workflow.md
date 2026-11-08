# Git Workflow

The project follows a lightweight Git Flow-inspired workflow. GitHub Issues track work, Pull Requests review changes, and only release-ready code is promoted to `main`.

## Main branches

```text
main
develop
```

`main` represents stable/release-ready code. It is the repository's default branch.

`develop` is the integration branch for ongoing development.

## Issues

Every task gets a GitHub Issue **before** work starts, created with the **Tarea** template (`.github/ISSUE_TEMPLATE/tarea.md`): Contexto, Qué hay que hacer, Criterios de aceptación, Fuera de alcance and Referencia al plan.

* **Title:** explanatory, concise and unambiguous, in plain Spanish. No labels in the title (no `[BUG]`, no `feat:`) and no unnecessary symbols such as `@`, `:` or `;`. Example: `Crear evento desde el panel`.
* **Labels:** always one type label (`feature`, `fix`, `refactor`, `chore`, `docs`) and one priority label (`prioridad: alta`, `prioridad: media`, `prioridad: baja`).

## Task branches

Before starting a change:

1. Create or select the GitHub Issue for the task (see above).
2. Update the local `develop` branch from `origin/develop`.
3. Create a short-lived branch from `develop` for that issue.

Branch names use a prefix plus a short, direct description in lowercase words separated by hyphens, without spaces or special characters. Use these branch prefixes:

```text
feature/<short-description>
fix/<short-description>
docs/<short-description>
refactor/<short-description>
chore/<short-description>
```

Examples:

```text
feature/event-management
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

## Commits

Make one commit per logical change; avoid grouping unrelated modifications in a single commit. Commits follow Conventional Commits. Use the issue number in the commit body when useful. Do not add AI attribution (see `AGENTS.md`).

```text
feat(auth): add couple sign-in
fix(events): validate event date
docs(project): document GitHub workflow
refactor(events): separate repository queries
chore(project): update local setup
ci(project): configure GitHub Actions
```

## Pull Requests

Open a Pull Request from the task branch into `develop`. GitHub pre-fills the description with `.github/pull_request_template.md`.

* **Title:** Conventional Commits prefix followed by a clear sentence anyone on the team can understand, avoiding unnecessary technical jargon. Example: `feat(events): la pareja puede crear su boda desde el panel`. The title becomes the squash commit on `develop`.
* **Description:** this is where the full technical depth goes: how the problem was solved, the architecture and layers involved, decisions and discarded alternatives, dependencies added, migrations and configuration, how to test it and the validation performed. Scale the detail to the importance of the change: a major change is detailed; a minor fix needs only a concise explanation.

Each PR should:

* Reference the GitHub Issue (for example, `Closes #12`).
* Include screenshots for visible UI changes.
* Have its review feedback addressed and required automated checks passing before merge.

GitHub only closes issues automatically when the PR is merged into the default branch (`main`). Issues referenced by PRs into `develop` close when the release reaches `main`, or can be closed manually after merging.

Use **Squash and merge** so each issue lands as one readable commit on `develop`; keep the squash commit title in Conventional Commits format. If working alone, review the PR and its diff yourself before merging. When collaborating, require at least one approval from another contributor.

Even when working alone, Pull Requests are used to maintain a professional workflow and provide a reviewable development history.

## Releases

When `develop` is ready for a stable release, open a Pull Request from `develop` into `main`. Review the complete release diff, confirm required checks pass, and merge only after approval. `main` must contain release-ready code; ongoing work stays on `develop`.

Merge release Pull Requests with **Create a merge commit**, never with Squash and merge. Squashing `develop` into `main` creates a commit that `develop` does not contain, so the branches diverge and later releases show false diffs or conflicts. A merge commit keeps `main` and `develop` sharing the same history.

| Pull Request | Merge method |
| --- | --- |
| `feature/*`, `fix/*`, `docs/*`, `refactor/*`, `chore/*` → `develop` | Squash and merge |
| `develop` → `main` (release) | Create a merge commit |

Because releases need merge commits, keep both **Allow squash merging** and **Allow merge commits** enabled in the repository settings, and choose the method that matches the Pull Request type.

## GitHub branch protection

A repository ruleset applies to `main` and `develop`:

* Changes must arrive through a Pull Request; direct pushes, force pushes and branch deletion are blocked.
* The `Backend` and `Frontend` CI checks must pass before merging.
* When working alone, no second approval is required. In a team, require at least one approval from another contributor.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every Pull Request and push to `develop` and `main`:

* **Backend:** Ruff lint and format check, pytest, and Alembic migrations against a PostgreSQL service followed by `alembic check` to detect models that are out of sync with migrations.
* **Frontend:** ESLint, Prettier format check, Vitest unit tests and production build. CI creates `environment.local.ts` from the example file because the real one is not versioned.

The PR author must still record any manual validation performed that CI does not cover. Do not claim a check passed unless it was actually run.

## Working from several computers

The project is developed from more than one computer. Before leaving a computer, all work is committed and pushed (a `chore(session): ...` progress commit on the task branch if the task is unfinished), with a handoff note in the commit body. The `fin-sesion` and `inicio-sesion` skills in `.claude/skills/` automate this.
