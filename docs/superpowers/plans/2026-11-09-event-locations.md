# Gestionar los lugares de la boda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The couple manages the wedding's places from the dashboard and guests see them on the public page with an automatic map link.

**Architecture:** Backend adds a nullable `start_time` column and `PUT /events/me/locations`, which replaces the whole list in one transaction. Frontend adds a `FormArray` form, a shared read-only location list used by the summary and the public page, and a pure map-URL helper.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pytest (real PostgreSQL `event_memory_test`); Angular 21 standalone, Signals, Reactive Forms, `$localize`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-event-locations-design.md`

## Global Constraints

- Backend commands run from `backend/` with `.venv/Scripts/python.exe`; frontend commands from `frontend/`.
- Before every commit: backend `python -m pytest`, `ruff check .`, `ruff format --check .`; frontend `npx ng test --watch=false`, `npm run lint`, `npm run format:check`, `npm run build`.
- Commits: Conventional Commits in Spanish, body `Refs #32`, no AI attribution (no `Co-Authored-By`, no "Generated with").
- Location fields: `label` 1–60, `venue_name` 1–150, `address` 1–300 (all after stripping); `start_time` time or `null`, required in the body. Maximum 10 locations. Position is the list index from 0, computed by the server.
- Empty list is valid and removes all locations. Locations are not required to publish and can change while published.
- Errors: `event_not_found` (404), `validation_error` (422) with `errors[].field` such as `locations.1.address`, auth errors unchanged.
- `PublicLocationRead` never includes `id`.
- Map URL: `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent("<venue_name>, <address>")`. Built in the frontend, never stored.
- No new dependencies. No visual design work (reuse existing styles).
- Never run migrations against the development database; the test suite migrates `event_memory_test`. Never read or print `backend/.env`.
- Every new fixed UI text has an `events.locations.*` custom ID; run `npm run extract-i18n` and commit `src/locale/messages.xlf`.

## Review Focus

1. A field with only spaces must be rejected with its exact field (`locations.0.label`), not saved blank (test in Task 1).
2. A rejected save must keep the previous list intact (test in Task 1).
3. After moving or removing a row, a server error must not stay on the wrong row (test in Task 3).
4. Addresses with tildes, `&`, `#` or `/` must produce a working map URL (test in Task 2).
5. The API returns `start_time` as `"17:00:00"`; the form must prefill `"17:00"` so the time input is not empty (test in Task 3).

---

### Task 1: Backend — column, schemas and `PUT /events/me/locations`

**Files:**
- Create: `backend/migrations/versions/20261109_01_add_location_start_time.py` (`revision = "20261109_01"`, `down_revision = "20261104_01"`)
- Modify: `backend/app/models/event_location.py`, `backend/app/schemas/events.py`, `backend/app/repositories/events.py`, `backend/app/services/events.py`, `backend/app/api/routes/events.py`, `PROJECT_CONTEXT.md`
- Test: `backend/tests/test_events_service.py`, `backend/tests/test_events_api.py`, `backend/tests/test_public_api.py`

**Interfaces:**
- Produces:
  - `EventLocation.start_time: Mapped[time | None]`.
  - `LocationWrite` (`extra="forbid"`): `label`, `venue_name`, `address` as `Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=<60|150|300>)]`; `start_time: time | None` (no default).
  - `EventLocationsUpdate` (`extra="forbid"`): `locations: list[LocationWrite] = Field(max_length=10)` (no default).
  - `start_time: time | None` added to `LocationRead` and `PublicLocationRead`.
  - `event_repository.replace_locations(session: Session, event: Event, locations: list[EventLocation]) -> None` (no commit).
  - `update_own_event_locations(session, owner_uid, data: EventLocationsUpdate) -> Event`.
  - Route `PUT /events/me/locations` → 200 `EventRead`.

- [ ] **Step 1: Write the failing tests**

```text
service: test_update_locations_saves_them              # 2 places -> labels, venue_name, address, start_time saved
service: test_update_locations_replaces_previous       # save 2, save 1 -> exactly 1 row in event_locations for that event
service: test_update_locations_keeps_list_order        # positions == [0, 1, 2] following the input order
service: test_update_locations_empty_list              # -> no locations
service: test_update_locations_optional_time           # start_time None saved as None
service: test_update_locations_without_event           # AppError 404 "event_not_found"
service: test_update_locations_does_not_touch_others   # uid-b's locations unchanged after uid-a saves
service: test_update_locations_while_published         # status "published" -> saved, status unchanged
schema:  test_location_rejects_blank_fields            # parametrize label/venue_name/address "   " -> ValidationError
schema:  test_location_rejects_too_long_fields         # 61 / 151 / 301 chars -> ValidationError
api: test_update_locations_returns_200                 # body.locations in order, each with id and start_time "17:00:00"; no owner_firebase_uid
api: test_update_locations_blank_field_returns_422     # first place label "   " -> "validation_error", a field "locations.0.label"
api: test_update_locations_more_than_10_returns_422    # 11 places -> 422, field "locations"
api: test_update_locations_extra_field_returns_422     # "position": 3 inside a place -> 422
api: test_update_locations_missing_time_returns_422    # place without "start_time" -> 422, field "locations.0.start_time"
api: test_rejected_update_keeps_previous_locations     # save 1 valid, then 422 -> GET /events/me still has the first list
api: test_update_locations_without_event_returns_404
api: test_update_locations_without_token_returns_401   # code "missing_token"
api: test_update_locations_only_touches_own_event      # uid-2 saves; uid-1 GET unchanged
public: test_public_event_exposes_location_time        # published with one place -> set(location) == {"label","venue_name","address","position","start_time"}
```

- [ ] **Step 2: Run** `.venv/Scripts/python.exe -m pytest tests/test_events_service.py tests/test_events_api.py tests/test_public_api.py -q` — expected: FAIL (import error / missing column).
- [ ] **Step 3: Implement.** Migration adds nullable `start_time` (`sa.Time()`); `downgrade` drops it. `replace_locations` assigns `event.locations = locations` (the relationship has `cascade="all, delete-orphan"`) and flushes. The service looks the event up with `get_own_event`, builds `EventLocation` objects with `position=index`, then commit + refresh, rollback and re-raise on error. Update `PROJECT_CONTEXT.md`: the endpoint, the `start_time` column, the replace-the-list rule, and that the map link is generated in the frontend.
- [ ] **Step 4: Run** the full backend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): API para guardar los lugares de la boda` (body `Refs #32`).

---

### Task 2: Frontend — types, API client, map link and read-only list

**Files:**
- Modify: `frontend/src/app/events/event.models.ts`, `event-api.service.ts`, `event-api.service.spec.ts`
- Create: `frontend/src/app/events/event-map.ts`, `event-map.spec.ts`, `event-location-list.component.ts`, `event-location-list.component.spec.ts`

**Interfaces:**
- Produces:
  - `EventLocation.start_time: string | null` (so `PublicEvent.locations`, already `Omit<EventLocation,'id'>[]`, gets it too).
  - `EventLocationWrite { label: string; venue_name: string; address: string; start_time: string | null }`; `EventLocationsUpdateRequest { locations: EventLocationWrite[] }`.
  - `EventApiService.updateLocations(request: EventLocationsUpdateRequest): Promise<EventRead>` → `PUT ${apiBaseUrl}/events/me/locations` with Bearer.
  - `eventMapUrl(venueName: string, address: string): string`.
  - `EventLocationListComponent`, selector `app-event-location-list`, `locations = input.required<Omit<EventLocation, 'id'>[]>()`. Renders a `<ul>`; each item shows `label + eventTimeSuffix(start_time)` (existing helper in `events/event-time.ts`, e.g. «Ceremonia, 17:00»), `venue_name`, `address` and a link «Ver en el mapa» (`i18n="@@events.locations.map"`, `target="_blank"`, `rel="noopener"`).

- [ ] **Step 1: Write the failing tests**

```text
map: encodes the venue and the address        # eventMapUrl("Finca Ñandú", "Calle Álamo 1 & 2, #3/B") === base + encodeURIComponent("Finca Ñandú, Calle Álamo 1 & 2, #3/B")
api: updateLocations sends PUT with Bearer and the exact body, resolves with the response
list: shows label with time, venue and address  # "Ceremonia, 17:00", "Iglesia", "Calle Mayor 1"
list: shows the label alone without a time      # "Celebración" and not "Celebración,"
list: links each place to the map               # href === eventMapUrl(...), target "_blank", rel "noopener"
list: keeps the given order
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement.** Fix any existing fixtures that build `EventLocation` so they compile.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): cliente de la API y lista de lugares con enlace al mapa` (body `Refs #32`).

---

### Task 3: Frontend — locations form

**Files:**
- Create: `frontend/src/app/events/event-locations-form.component.ts`, `event-locations-form.component.spec.ts`

**Interfaces:**
- Consumes: `EventApiService.updateLocations`, `EventLocationWrite` (Task 2); `notBlank` (`event-form-errors.ts`); `apiErrorMessage`, `apiFieldErrors`.
- Produces: `EventLocationsFormComponent`, selector `app-event-locations-form`, `event = input.required<EventRead>()`, outputs `saved = output<EventRead>()`, `cancelled = output<void>()`.

`FormArray` of groups (`label`, `venueName`, `address`, `startTime`; non-nullable). Text controls: `required`, `notBlank`, `maxLength` 60/150/300. Input ids `location-label-<i>`, `location-venue-<i>`, `location-address-<i>`, `location-time-<i>`; error elements `<input id>-error`. One error element per field: client error first (only when touched), then `apiErrors()['locations.<i>.<label|venue_name|address|start_time>']`. Prefill once in `ngOnInit` with `startTime: start_time?.slice(0, 5) ?? ''`; when the event has no locations, start with one empty row.

Buttons per row: «Subir» (disabled on the first row), «Bajar» (disabled on the last), «Quitar». «Añadir lugar» disabled at 10 rows. «Guardar» (`Guardando…` and disabled while saving, submit ignored while saving) and «Cancelar» (`type="button"`). Hint: «La hora de cada lugar es opcional. Úsala si la ceremonia y la celebración son a horas distintas». Subscribing once to the array's `valueChanges` with `takeUntilDestroyed()` clears all API errors on any change. If the response has no error for a visible field, show `apiErrorMessage` with `role="alert"`. Submit marks all as touched when invalid and does not call the API. Payload: trimmed texts, `start_time: startTime || null`, in visible order. All ids `events.locations.*`. Styles copied from the edit form (no new design).

- [ ] **Step 1: Write the failing tests**

```text
prefills the rows from the event              # start_time "17:00:00" -> #location-time-0 value "17:00"
starts with one empty row without locations
adds rows up to 10                            # 10 rows -> «Añadir lugar» disabled
removes a row
moves a row up and down                       # values follow; first row «Subir» and last row «Bajar» disabled
requires the text fields                      # blank label -> update not called, error in #location-label-0-error
sends the rows in the visible order           # after moving: request order, trimmed, start_time "17:00" or null; emits saved
allows saving an empty list                   # remove the only row -> updateLocations({locations: []})
shows a server error under its row and field  # 422 errors [{field:"locations.1.address", code:"string_too_long"}] -> text in #location-address-1-error, no role="alert"
clears server errors when the list changes    # after that error, move a row -> #location-address-1-error absent
shows the general message for a non-field error # 422 errors [{field:"locations", code:"too_long"}] -> role="alert"
sends only once while saving
cancel emits cancelled without calling the API
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement** the component.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): formulario para gestionar los lugares` (body `Refs #32`).

---

### Task 4: Frontend — summary, dashboard, public page, i18n and plan

**Files:**
- Modify: `frontend/src/app/events/event-summary.component.ts`, `frontend/src/app/dashboard/dashboard-page.component.ts`, `dashboard-page.component.spec.ts`, `frontend/src/app/public/public-event-page.component.ts`, `public-event-page.component.spec.ts`, `frontend/src/locale/messages.xlf` (regenerated), `PLAN.md`

**Interfaces:**
- Consumes: `EventLocationListComponent` (Task 2), `EventLocationsFormComponent` (Task 3).
- Produces: `EventSummaryComponent` output `editLocations = output<void>()`; dashboard state `'editingLocations'` added to the union.

Summary: below the date, `<app-event-location-list>` when there are locations, otherwise «Todavía no habéis añadido lugares» (`events.locations.empty`); a button «Añadir lugares» (`events.locations.add`) or «Editar lugares» (`events.locations.edit`) that emits `editLocations`. Public page: after the date line, `<app-event-location-list>` only when `locations.length > 0`.

- [ ] **Step 1: Write the failing tests** (`updateLocations: vi.fn()` in the dashboard API mock)

```text
dashboard: shows the empty message without locations      # and button «Añadir lugares»
dashboard: lists the places with their map link           # button «Editar lugares»
dashboard: opens the locations form                       # click -> app-event-locations-form present, summary absent
dashboard: returns to the summary with the saved places   # form emits saved -> new place shown
dashboard: returns to the summary on cancel               # form emits cancelled -> unchanged
public: shows the places in order with their map link
public: shows no list without places                      # app-event-location-list absent
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement**; run `npm run extract-i18n` and check the `events.locations.*` ids are in `messages.xlf`. In `PLAN.md`, tick «Información, fecha y ubicación con enlace al mapa» and add under the public page decisions: «Cada lugar tiene etiqueta, nombre, dirección y una hora opcional; una boda admite hasta 10 lugares. Los lugares no son obligatorios para publicar y se pueden cambiar con la boda publicada. El enlace al mapa se genera automáticamente con el nombre del sitio y la dirección.»
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): la pareja gestiona los lugares y los invitados los ven` (body `Refs #32`).
