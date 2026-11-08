# Editar el evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The couple edits title, names, date and start time of their wedding from the dashboard via `PUT /api/v1/events/me`.

**Architecture:** Backend adds `EventUpdate` + `update_own_event` (service, reusing the create helpers for details validation and title generation) and a `PUT /events/me` route. Frontend adds `update()` to the API client, extracts shared form helpers from the create form, adds an edit form component, and wires an `editing` state into the dashboard with an «Editar» button in the summary.

**Tech Stack:** FastAPI, SQLAlchemy 2, Pydantic 2, pytest (real PostgreSQL `event_memory_test`); Angular 21 standalone, Signals, Reactive Forms, `$localize`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-edit-event-design.md`

## Global Constraints

- Backend commands run from `backend/` with `.venv/Scripts/python.exe`; frontend commands from `frontend/`.
- Before every commit: backend `python -m pytest`, `ruff check .`, `ruff format --check .`; frontend `npx ng test --watch=false`, `npm run lint`, `npm run format:check`, `npm run build`.
- Commits: Conventional Commits in Spanish, body `Refs #25`, no AI attribution (no `Co-Authored-By`, no "Generated with").
- Editable fields only: `title`, `details` (`partner_one_name`, `partner_two_name`), `event_date`, `start_time`. `slug`, `status`, `timezone`, `event_type`, locations and owner never change.
- `title`: stripped, max 150; empty or `null` → `"{partner_one_name} y {partner_two_name}"` truncated to 150. Partner names 1–100 chars after stripping.
- Error codes (exact): `event_not_found` (404), `validation_error` (422, with `errors[].field` such as `title`, `details.partner_one_name`, `start_time`), auth errors unchanged.
- `owner_firebase_uid` never appears in API responses; the event is always looked up by the token's owner.
- No new dependencies. No visual design work (keep current dashboard styles). No database migration.
- Every new fixed UI text has an `events.edit.*` or `events.summary.*` custom ID; run `npm run extract-i18n` and commit `src/locale/messages.xlf`.

## Review Focus

1. The API returns `start_time` as `"18:30:00"`; an `<input type="time">` prefilled with that may show empty — the edit form must prefill `"18:30"` (test in Task 4).
2. A title made only of spaces must regenerate from the names, not be saved as blank (test in Task 1).
3. Changing a name without touching the title keeps the old title (spec D2) (test in Task 1).
4. Clearing the date or time sends `null` and really clears the stored value (tests in Tasks 1 and 4).
5. Double-clicking «Guardar» must not send two requests; the save button is disabled while saving (test in Task 4).

---

### Task 1: Backend — update rules in the service

**Files:**
- Modify: `backend/app/schemas/events.py`
- Modify: `backend/app/services/events.py`
- Test: `backend/tests/test_events_service.py`

**Interfaces:**
- Consumes: `create_event`, `get_own_event`, `event_repository.get_by_owner`, `validate_event_details`, `AppError`.
- Produces:
  - `EventUpdate` (Pydantic, `extra="forbid"`): `title: Annotated[str, StringConstraints(strip_whitespace=True, max_length=150)] | None`, `details: dict[str, Any]`, `event_date: date | None`, `start_time: time | None` — all four required (no defaults).
  - `update_own_event(session: Session, owner_uid: str, data: EventUpdate) -> Event`.
  - Internal refactor: `_validated_details(event_type: str, details: dict[str, Any]) -> dict[str, Any]` (was taking `EventCreate`) and `_generated_title(details: dict[str, Any]) -> str`; `create_event` uses both with unchanged behavior.

- [ ] **Step 1: Write the failing tests** (in `test_events_service.py`, using the existing `wedding()` helper to create the event first)

```python
def edit(**overrides: object) -> EventUpdate:
    body = {
        "title": "La boda de Ana y Luis",
        "details": {"partner_one_name": "Ana", "partner_two_name": "Luis"},
        "event_date": date(2027, 6, 12),
        "start_time": time(18, 30),
    }
    body.update(overrides)
    return EventUpdate(**body)

test_update_event_changes_editable_fields
    # create, then update(edit()) -> title "La boda de Ana y Luis", event_date 2027-06-12, start_time 18:30
test_update_event_keeps_slug_status_and_timezone
    # slug/status/timezone/event_type equal to the values before the update
test_update_event_with_empty_title_regenerates_it
    # parametrize title in [None, "", "   "] with names "Marta"/"Pablo" -> title == "Marta y Pablo"
test_update_event_strips_title
    # title "  Nuestra boda  " -> "Nuestra boda"
test_update_event_changing_names_keeps_custom_title
    # set title "Nuestra boda", then update names to "Eva"/"Luis" with title "Nuestra boda" -> title unchanged, details updated
test_update_event_can_clear_date_and_time
    # update with event_date=None, start_time=None -> both None after refresh
test_update_event_without_event
    # AppError status 404, code "event_not_found"
test_update_event_with_invalid_details
    # details {"partner_one_name": "", "partner_two_name": "Luis"} -> AppError 422 "validation_error",
    # errors contains {"field": "details.partner_one_name", "code": "string_too_short"}
test_update_event_title_too_long_is_rejected_by_schema
    # pytest.raises(ValidationError): EventUpdate(title="x" * 151, ...)
```

- [ ] **Step 2: Run** `.venv/Scripts/python.exe -m pytest tests/test_events_service.py -q` — expected: FAIL (`EventUpdate` / `update_own_event` not defined).

- [ ] **Step 3: Implement** `EventUpdate` and `update_own_event`. Order: look up the event by owner (404 if none), then validate `details` with that event's own `event_type`. Title: `data.title or _generated_title(details)`. Assign fields, `session.commit()`, `session.refresh(event)`; `session.rollback()` and re-raise on any exception.

- [ ] **Step 4: Run** the full backend checks (Global Constraints) — expected: all PASS, existing create tests unchanged.

- [ ] **Step 5: Commit** — `feat(events): reglas de negocio para editar el evento` (body `Refs #25`).

---

### Task 2: Backend — `PUT /api/v1/events/me`

**Files:**
- Modify: `backend/app/api/routes/events.py`
- Test: `backend/tests/test_events_api.py`
- Modify: `PROJECT_CONTEXT.md` (events endpoints and the title rule)

**Interfaces:**
- Consumes: `EventUpdate`, `update_own_event` (Task 1); fixtures `client`, `as_user`.
- Produces: `PUT /api/v1/events/me` → 200 `EventRead`.

- [ ] **Step 1: Write the failing tests**

```python
def update_payload(**overrides): ...  # title "Nuestra boda", same details, event_date "2027-06-12", start_time "18:30"

test_update_event_returns_200
    # create via POST, PUT /events/me -> 200, title "Nuestra boda", start_time "18:30:00",
    # slug unchanged from the POST response, "owner_firebase_uid" not in body
test_update_event_without_event_returns_404          # code "event_not_found"
test_update_event_missing_field_returns_422          # body without "start_time" -> code "validation_error", a field "start_time"
test_update_event_extra_field_returns_422            # body with "slug": "otra" -> 422, slug unchanged on GET
test_update_event_title_too_long_returns_422         # "x" * 151 -> 422, errors contains field "title"
test_update_event_without_token_returns_401          # code "missing_token"
test_update_event_only_touches_own_event
    # uid-1 and uid-2 each create; uid-2 PUTs; GET as uid-1 returns the original title
```

- [ ] **Step 2: Run** `.venv/Scripts/python.exe -m pytest tests/test_events_api.py -q` — expected: FAIL (405 Method Not Allowed).

- [ ] **Step 3: Implement** the route `update_my_event` (`@router.put("/me", response_model=EventRead, summary="Editar el evento del usuario")`), HTTP only. Update `PROJECT_CONTEXT.md` with the endpoint and the title rule (one or two lines, next to the existing events endpoints).

- [ ] **Step 4: Run** the full backend checks — expected: all PASS.

- [ ] **Step 5: Commit** — `feat(events): API para editar el evento` (body `Refs #25`).

---

### Task 3: Frontend — API client and shared form helpers

**Files:**
- Modify: `frontend/src/app/events/event.models.ts`
- Modify: `frontend/src/app/events/event-api.service.ts`, `event-api.service.spec.ts`
- Create: `frontend/src/app/events/event-form-errors.ts`
- Modify: `frontend/src/app/events/event-create-form.component.ts` (use the helpers; behavior unchanged)

**Interfaces:**
- Produces:
  - `EventUpdateRequest { title: string | null; details: WeddingDetails; event_date: string | null; start_time: string | null }`.
  - `EventApiService.update(request: EventUpdateRequest): Promise<EventRead>` → `PUT ${apiBaseUrl}/events/me` with `Authorization: Bearer <token>`.
  - In `event-form-errors.ts`:
    - `notBlank(control: AbstractControl<string>): ValidationErrors | null` (moved from the create form).
    - `clearApiErrorOnEdit(form: FormGroup, apiFields: Record<string, string>, apiErrors: WritableSignal<Record<string, string>>): void` — subscribes each control's `valueChanges` (with `takeUntilDestroyed()`, so it must be called from a constructor) and removes that control's API key.
    - `hasVisibleFieldError(fieldErrors: Record<string, string>, apiFields: Record<string, string>): boolean`.

- [ ] **Step 1: Write the failing test** in `event-api.service.spec.ts`: `update()` sends `PUT` to `.../events/me` with the bearer header and the exact request body, and resolves with the response.
- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL (`update` is not a function).
- [ ] **Step 3: Implement** the model, `update()`, and `event-form-errors.ts`; make the create form import `notBlank`, `clearApiErrorOnEdit` and `hasVisibleFieldError` instead of its local copies.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS, including every existing create-form test unchanged.
- [ ] **Step 5: Commit** — `feat(events): cliente de la API para editar el evento` (body `Refs #25`).

---

### Task 4: Frontend — edit form component

**Files:**
- Create: `frontend/src/app/events/event-edit-form.component.ts`
- Test: `frontend/src/app/events/event-edit-form.component.spec.ts`

**Interfaces:**
- Consumes: `EventApiService.update`, `notBlank`, `clearApiErrorOnEdit`, `hasVisibleFieldError` (Task 3); `apiErrorMessage`, `apiFieldErrors`.
- Produces: `EventEditFormComponent`, selector `app-event-edit-form`; `event = input.required<EventRead>()`; outputs `saved = output<EventRead>()` and `cancelled = output<void>()`.

Form controls (non-nullable): `title` (`maxLength(150)`), `partnerOneName` / `partnerTwoName` (`required`, `maxLength(100)`, `notBlank`), `eventDate` (`''` or `YYYY-MM-DD`), `startTime` (`''` or `HH:MM`). API field map: `title`→`title`, names→`details.partner_*_name`, `eventDate`→`event_date`, `startTime`→`start_time`. One error element per field (client error first, then API error), ids `edit-<field>-error`. Hint under the title: «Si lo dejas vacío, se usarán vuestros nombres». Buttons «Guardar» (`Guardando…` while saving, disabled while saving) and «Cancelar» (`type="button"`). Styles copied from the create form (no new design).

- [ ] **Step 1: Write the failing tests**

```text
prefills the form from the event            # title, names, date "2027-06-12", startTime "18:30" from start_time "18:30:00"
sends the edited values                     # update called with {title, details trimmed, event_date, start_time: "18:30"}; emits saved with the response
sends null for an empty title, date and time
does not submit with a blank name           # "   " -> update not called, error "Escribe un nombre." shown
shows an API field error under its field    # 422 errors [{field: "title", code: "string_too_long"}] -> message inside #edit-title-error
shows the general message for a non-field error   # 404 event_not_found -> role="alert" text from apiErrorMessage
disables Guardar while saving and sends only once # two clicks before the promise resolves -> update called once
cancel emits cancelled without calling the API
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL (component not found).
- [ ] **Step 3: Implement** the component. Prefill in an `effect`-free way: patch the form once from `event()` in `ngOnInit`. Send `title.trim() || null`, names trimmed, `eventDate || null`, `startTime || null`.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): formulario para editar el evento` (body `Refs #25`).

---

### Task 5: Frontend — summary, dashboard, i18n and plan

**Files:**
- Modify: `frontend/src/app/events/event-summary.component.ts`
- Modify: `frontend/src/app/dashboard/dashboard-page.component.ts`, `dashboard-page.component.spec.ts`
- Modify: `frontend/src/locale/messages.xlf` (regenerated)
- Modify: `PLAN.md` (tick «Editar el evento»)

**Interfaces:**
- Consumes: `EventEditFormComponent` (Task 4).
- Produces: `EventSummaryComponent` output `edit = output<void>()`; dashboard state type `'loading' | 'empty' | 'ready' | 'editing' | 'error'`.

Summary: after the date text, when `start_time` is set, append `, HH:MM` (first five characters), e.g. «12 de junio de 2027, 18:30». Button «Editar» (`i18n="@@events.summary.edit"`, `type="button"`) emits `edit`.

- [ ] **Step 1: Write the failing tests** in `dashboard-page.component.spec.ts` (add `update: vi.fn()` to the API mock)

```text
shows the start time in the summary          # start_time "18:30:00", event_date "2027-06-12" -> text contains "12 de junio de 2027, 18:30"
opens the edit form from the summary         # click "Editar" -> app-event-edit-form present, summary absent
returns to the summary with the saved event  # edit form emits saved({...event, title: "Nuestra boda"}) -> summary shows "Nuestra boda"
returns to the summary on cancel             # edit form emits cancelled -> summary shows the original title
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement** summary and dashboard changes; run `npm run extract-i18n` and check that `messages.xlf` contains the new `events.edit.*` and `events.summary.edit` ids; tick «Editar el evento» in `PLAN.md`.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): la pareja edita su boda desde el panel` (body `Refs #25`).
