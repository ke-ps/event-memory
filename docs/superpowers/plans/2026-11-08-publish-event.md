# Publicar la boda con una URL propia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The couple chooses their wedding URL while in draft, publishes and unpublishes it from the dashboard, and anyone with the link sees a minimal page at `/e/<slug>`.

**Architecture:** Backend extends `PUT /events/me` with `slug` and the published-state rules, adds `POST /events/me/publish|unpublish`, and a new unauthenticated router `/public/events/{slug}`. Frontend generalises field errors, adds publish/unpublish to the API client, a URL field in the edit form, a publication component inside the summary, and a public page with its own token-less API service.

**Tech Stack:** FastAPI, SQLAlchemy 2, Pydantic 2, pytest (real PostgreSQL `event_memory_test`); Angular 21 standalone, Signals, Reactive Forms, `$localize`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-publish-event-design.md`

## Global Constraints

- Backend commands run from `backend/` with `.venv/Scripts/python.exe`; frontend commands from `frontend/`.
- Before every commit: backend `python -m pytest`, `ruff check .`, `ruff format --check .`; frontend `npx ng test --watch=false`, `npm run lint`, `npm run format:check`, `npm run build`.
- Commits: Conventional Commits in Spanish, body `Refs #30`, no AI attribution (no `Co-Authored-By`, no "Generated with").
- Slug: stripped and lowercased before validation; pattern `^[a-z0-9]+(-[a-z0-9]+)*$`; length 3–80; unique; the event's own current slug is always valid.
- Published event: slug cannot change (409 `slug_locked`), `event_date` cannot be null (422 `event_date_required`); title, names, date and time can change.
- Error codes (exact): `slug_taken` (409), `slug_locked` (409), `event_date_required` (422), `event_not_found` (404), `validation_error` (422). `slug_taken`, `slug_locked` and `event_date_required` carry `errors: [{field, code}]` with field `slug` or `event_date` and code equal to the error code.
- Publish/unpublish are idempotent (200 when already in that state) and never delete data.
- Public API: `GET /api/v1/public/events/{slug}`, no authentication, same 404 `event_not_found` for draft and non-existent; never exposes `id`, `owner_firebase_uid`, `status`, `main_photo_path`, `created_at`, `updated_at` or location ids.
- No new dependencies. No visual design work (reuse existing styles). No database migration.
- Every new fixed UI text has an `events.publication.*`, `events.edit.slug.*`, `public.*` or `errors.*` custom ID; run `npm run extract-i18n` and commit `src/locale/messages.xlf`.

## Review Focus

1. A slug typed as `"Ana Y Luis "` (inner spaces) must come back as a 422 field error on `slug`, never a 500 (test in Task 1).
2. Editing a published wedding sends its unchanged slug — that must succeed, not raise `slug_locked` (test in Task 1).
3. Two couples choosing the same slug concurrently: the unique constraint fires on commit and must map to 409 `slug_taken`, not a 500 (test in Task 1).
4. `navigator.clipboard` is missing or rejects (insecure context, permissions): «Copiar enlace» must show the manual-copy hint, not throw (test in Task 7).
5. A wedding published and then unpublished must disappear from the public URL (tests in Tasks 3 and 6).

---

### Task 1: Backend — slug in the edit and published-state rules

**Files:**
- Modify: `backend/app/schemas/events.py`, `backend/app/services/events.py`
- Test: `backend/tests/test_events_service.py`, `backend/tests/test_events_api.py`

**Interfaces:**
- Produces: `EventUpdate.slug: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]` (required). `update_own_event(session, owner_uid, data)` unchanged signature, new rules.

- [ ] **Step 1: Write the failing tests.** Add `"slug": "ana-y-luis"` to the service `edit()` helper and the API `update_payload()` helper (the ownership API test passes the second user's own slug, `ana-y-luis-2`). Service tests:

```text
test_update_event_changes_slug_in_draft            # slug "boda-ana-luis" -> event.slug == "boda-ana-luis"
test_update_event_normalizes_slug                  # EventUpdate slug "  Boda-Ana  " -> "boda-ana"
test_update_event_slug_invalid_format_rejected     # parametrize ["ab", "ana y luis", "-ana", "ana--luis", "ñu-ñu", "x"*81] -> pydantic ValidationError
test_update_event_slug_taken                       # uid-b owns "ana-y-luis-2"; uid-a sets "ana-y-luis-2" -> AppError 409 "slug_taken",
                                                   #   errors == [{"field": "slug", "code": "slug_taken"}]
test_update_event_slug_taken_on_commit             # monkeypatch repository slug_exists -> False, target slug owned by other -> 409 "slug_taken" (no IntegrityError leaks)
test_update_published_event_with_same_slug        # status "published" (set directly), same slug, new date -> succeeds
test_update_published_event_slug_locked            # published, different slug -> 409 "slug_locked", errors [{"field": "slug", "code": "slug_locked"}], slug unchanged
test_update_published_event_cannot_clear_date      # published, event_date None -> 422 "event_date_required", errors [{"field": "event_date", "code": "event_date_required"}]
test_update_published_event_can_change_date        # published, event_date 2027-09-18 -> saved
```

API tests: `test_update_event_slug_with_spaces_returns_422` (`"Ana Y Luis "` → 422 `validation_error`, a field `slug`), `test_update_event_slug_taken_returns_409` (code `slug_taken`, `errors[0].field == "slug"`).

- [ ] **Step 2: Run** `.venv/Scripts/python.exe -m pytest tests/test_events_service.py tests/test_events_api.py -q` — expected: FAIL.
- [ ] **Step 3: Implement.** In `update_own_event`, after details validation and before assigning: if published and `data.slug != event.slug` → `slug_locked`; if published and `data.event_date is None` → `event_date_required`; if `data.slug != event.slug` and `slug_exists` → `slug_taken`. Assign `event.slug = data.slug`. If `commit` raises `IntegrityError` on the `uq_events_slug` constraint (reuse `_is_slug_conflict`), rollback and raise `slug_taken`.
- [ ] **Step 4: Run** the full backend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): la pareja elige la URL de su boda` (body `Refs #30`).

---

### Task 2: Backend — publish and unpublish

**Files:**
- Modify: `backend/app/services/events.py`, `backend/app/api/routes/events.py`
- Test: `backend/tests/test_events_service.py`, `backend/tests/test_events_api.py`

**Interfaces:**
- Produces: `publish_own_event(session, owner_uid) -> Event`, `unpublish_own_event(session, owner_uid) -> Event`; routes `POST /events/me/publish` and `POST /events/me/unpublish` → 200 `EventRead`.

- [ ] **Step 1: Write the failing tests**

```text
service: test_publish_event_without_date      # AppError 422 "event_date_required", errors [{"field": "event_date", "code": "event_date_required"}], status stays "draft"
service: test_publish_event                   # with date -> status "published"
service: test_publish_event_twice             # second call -> still "published", no error
service: test_unpublish_event_keeps_data      # publish then unpublish -> "draft"; title, slug, details, date unchanged
service: test_unpublish_draft_event           # -> "draft", no error
service: test_publish_without_event           # 404 "event_not_found"; same for unpublish
api: test_publish_returns_200                 # body status "published", no owner_firebase_uid
api: test_publish_without_date_returns_422    # code "event_date_required"
api: test_unpublish_returns_200               # status "draft"
api: test_publish_without_token_returns_401   # code "missing_token"
```

- [ ] **Step 2: Run** the two test files — expected: FAIL.
- [ ] **Step 3: Implement** both service functions (lookup by owner via `get_own_event`, commit/refresh, rollback on error) and the two routes (HTTP only).
- [ ] **Step 4: Run** the full backend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): publicar y despublicar la boda` (body `Refs #30`).

---

### Task 3: Backend — public API

**Files:**
- Modify: `backend/app/schemas/events.py`, `backend/app/repositories/events.py`, `backend/app/services/events.py`, `backend/app/api/router.py`
- Create: `backend/app/api/routes/public.py`, `backend/tests/test_public_api.py`
- Modify: `PROJECT_CONTEXT.md` (new endpoints, public API, new error codes)

**Interfaces:**
- Produces: `PublicLocationRead` (`label`, `venue_name`, `address`, `position`), `PublicEventRead` (`event_type`, `title`, `slug`, `event_date`, `start_time`, `timezone`, `details`, `locations: list[PublicLocationRead]`), `event_repository.get_by_slug(session, slug) -> Event | None`, `get_published_event(session, slug: str) -> Event` (lowercases the slug; 404 `event_not_found` if missing or draft). Route `GET /public/events/{slug}` mounted with prefix `/public`, tag `public`, no `get_current_user`.

- [ ] **Step 1: Write the failing tests** in `test_public_api.py` (create via the authenticated API with `as_user`, then call the public URL; the public route must work even with no user set)

```text
test_public_event_returns_published_wedding   # 200; keys == {"event_type","title","slug","event_date","start_time","timezone","details","locations"}
test_public_event_hides_draft                 # draft -> 404 "event_not_found"
test_public_event_unknown_slug                # 404 "event_not_found"
test_public_event_is_case_insensitive         # GET /public/events/ANA-Y-LUIS -> 200
test_public_event_after_unpublish             # publish, unpublish -> 404
test_public_event_needs_no_token              # published by uid-1, then request without any auth override -> 200
```

- [ ] **Step 2: Run** `.venv/Scripts/python.exe -m pytest tests/test_public_api.py -q` — expected: FAIL (404 for every route).
- [ ] **Step 3: Implement** schemas, repository, service, router and registration; update `PROJECT_CONTEXT.md` (endpoints, the public API rule from D6, error codes `slug_taken`, `slug_locked`, `event_date_required`).
- [ ] **Step 4: Run** the full backend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): API pública de la boda` (body `Refs #30`).

---

### Task 4: Frontend — field errors, API client and messages

**Files:**
- Modify: `frontend/src/app/core/api-error-messages.ts`, `api-error-messages.spec.ts`
- Modify: `frontend/src/app/events/event.models.ts`, `event-api.service.ts`, `event-api.service.spec.ts`

**Interfaces:**
- Produces: `apiFieldErrors(error)` reads `errors` from any error body (not only `validation_error`); field messages for `slug_taken` («Esa dirección ya está en uso.»), `slug_locked` («Para cambiar la dirección, despublica la boda.»), `event_date_required` («Añade la fecha para poder publicar.»), `string_pattern_mismatch` («Usa solo minúsculas, números y guiones.»); general messages (`apiErrorMessage`) for the same three codes. `EventUpdateRequest.slug: string`. `PublicEvent` type (`event_type`, `title`, `slug`, `event_date`, `start_time`, `timezone`, `details: WeddingDetails`, `locations: {label, venue_name, address, position}[]`). `EventApiService.publish(): Promise<EventRead>` → `POST .../events/me/publish`; `unpublish()` → `POST .../events/me/unpublish` (both with Bearer, empty body).

- [ ] **Step 1: Write the failing tests:** field errors returned for a 409 `slug_taken` body with `errors`; general message for `event_date_required`; `publish()` and `unpublish()` method/URL/header.
- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement.** The edit form must keep compiling: it will send `slug` in Task 5, so add `slug: this.event().slug` to its request now (no UI yet).
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): cliente de la API para publicar la boda` (body `Refs #30`).

---

### Task 5: Frontend — URL field in the edit form

**Files:**
- Modify: `frontend/src/app/events/event-edit-form.component.ts`, `event-edit-form.component.spec.ts`

**Interfaces:**
- Consumes: `EventUpdateRequest.slug`, `apiFieldErrors` (Task 4).

Control `slug` (non-nullable, `required`, `minLength(3)`, `maxLength(80)`, `pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)` after the user's value is trimmed and lowercased on submit), input id `edit-slug`, label «Dirección web», visible prefix `/e/`, error element `edit-slug-error`, API field map `slug`→`slug`. Draft: hint «Así será el enlace de vuestra boda». Published: control disabled, hint «Para cambiarla, despublica la boda»; the request still sends the current slug (`getRawValue()`).

- [ ] **Step 1: Write the failing tests**

```text
prefills the URL field                      # value "ana-y-luis"
sends the edited slug lowercased            # "Boda-Ana " -> update called with slug "boda-ana"
shows a format error for an invalid slug    # "ana y luis" -> update not called, error text in #edit-slug-error
disables the URL field when published       # event status "published" -> input disabled, hint text shown, submit still sends slug "ana-y-luis"
shows slug_taken under the URL field        # 409 {code: "slug_taken", errors: [{field: "slug", code: "slug_taken"}]} -> «Esa dirección ya está en uso.» in #edit-slug-error
shows event_date_required under the date    # 422 event_date_required with errors on event_date -> message in #edit-event-date-error
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement** the field (ids `events.edit.slug.label`, `events.edit.slug.hint`, `events.edit.slug.lockedHint`, `events.edit.slug.invalid`, `events.edit.slug.required`).
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): campo de dirección web al editar la boda` (body `Refs #30`).

---

### Task 6: Frontend — public page

**Files:**
- Create: `frontend/src/app/public/public-event-api.service.ts`, `public-event-api.service.spec.ts`, `public-event-page.component.ts`, `public-event-page.component.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `PublicEvent` (Task 4).
- Produces: `PublicEventApiService.get(slug: string): Promise<PublicEvent | null>` → `GET ${apiBaseUrl}/public/events/${encodeURIComponent(slug)}`, no `Authorization` header, `null` on 404, rethrows other errors. `PublicEventPageComponent` on route `e/:slug` (no guard, declared before `**`). States `'loading' | 'ready' | 'unavailable' | 'error'`. Ready: `<h1>` title and the date line formatted like the summary (`longDate` + `, HH:MM`, or «Fecha por decidir»). Unavailable: «Esta página no está disponible.» Error: `apiErrorMessage` + «Reintentar».

- [ ] **Step 1: Write the failing tests**

```text
service: requests the public URL without Authorization       # header absent
service: returns null on 404
page: shows the title and date of a published wedding       # "Ana y Luis", "12 de junio de 2027, 18:30" (whitespace-normalized)
page: shows unavailable when the API returns null
page: shows the error and retries                            # first call rejects (status 0), click «Reintentar» -> second call, ready
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement** service, page (ids `public.loading`, `public.unavailable`, `public.retry`, `public.dateTbd`) and route. Read the slug from `ActivatedRoute` param `slug`.
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): página pública mínima de la boda` (body `Refs #30`).

---

### Task 7: Frontend — publication in the dashboard, i18n and plan

**Files:**
- Create: `frontend/src/app/events/event-publication.component.ts`, `event-publication.component.spec.ts`
- Modify: `frontend/src/app/events/event-summary.component.ts`, `frontend/src/app/dashboard/dashboard-page.component.ts`, `dashboard-page.component.spec.ts`
- Modify: `frontend/src/locale/messages.xlf` (regenerated), `PLAN.md`

**Interfaces:**
- Consumes: `EventApiService.publish/unpublish` (Task 4).
- Produces: `EventPublicationComponent`, selector `app-event-publication`, `event = input.required<EventRead>()`, `changed = output<EventRead>()`. `EventSummaryComponent` gets `changed = output<EventRead>()` (re-emitted) and drops its own status paragraph. Dashboard: `(changed)` on the summary sets the event.

Draft: «Borrador» + «Publicar» (disabled when `event_date` is null, hint «Añade la fecha para poder publicar»). Published: «Publicada», the full link `window.location.origin + '/e/' + slug` as visible text, «Ver página pública» (`<a target="_blank" rel="noopener">`), «Copiar enlace» (`navigator.clipboard.writeText`; success «Enlace copiado»; missing API or rejection → «No se pudo copiar. Copia el enlace a mano.»), «Despublicar». Buttons disabled while a request runs; API failure → `apiErrorMessage` with `role="alert"`. Ids `events.publication.*`.

- [ ] **Step 1: Write the failing tests**

```text
publication: shows Borrador and publishes             # click «Publicar» -> publish called once, emits changed with the response
publication: disables Publicar without a date         # event_date null -> button disabled, hint shown, publish not called on click
publication: shows the link and unpublishes           # published -> text contains origin + "/e/ana-y-luis", href of «Ver página pública» equals it; click «Despublicar» -> unpublish called, changed emitted
publication: copies the link                          # clipboard.writeText stub resolves -> called with the link, «Enlace copiado»
publication: falls back when the clipboard fails      # navigator.clipboard undefined -> «No se pudo copiar. Copia el enlace a mano.», no throw
publication: shows the API error                      # publish rejects 422 event_date_required -> role="alert" with «Añade la fecha para poder publicar.»
dashboard: publishing updates the summary             # publication emits changed({...event, status: "published"}) -> «Publicada» shown
```

- [ ] **Step 2: Run** `npx ng test --watch=false` — expected: FAIL.
- [ ] **Step 3: Implement** the component, wire summary and dashboard; run `npm run extract-i18n` and check the new ids are in `messages.xlf`. Update `PLAN.md`: remove «(propuesta)» from the URL, draft/publish and date-required rules; add «Una boda publicada siempre tiene fecha y su URL queda fija; para cambiar la URL hay que despublicarla.»; add under the public page decisions «Pendiente de decidir: si se reservan las URLs de bodas publicadas que se borran, para que otra boda no ocupe un enlace ya repartido.»; tick «URL pública editable y única» and «Publicar y despublicar el evento».
- [ ] **Step 4: Run** the full frontend checks — expected: all PASS.
- [ ] **Step 5: Commit** — `feat(events): la pareja publica su boda desde el panel` (body `Refs #30`).
