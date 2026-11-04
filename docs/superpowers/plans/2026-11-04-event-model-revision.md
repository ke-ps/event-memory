# Event Model Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wedding-only `events` columns with common columns plus a validated `details` JSONB, add `event_locations`, and migrate existing data.

**Architecture:** SQLAlchemy models describe the target schema; a hand-written Alembic migration (`20261104_01`) transforms the existing table preserving data; a Pydantic schema validates `details` per `event_type`. No API or UI changes.

**Tech Stack:** Python 3.14, SQLAlchemy 2, Alembic, Pydantic 2, PostgreSQL 18, pytest, Ruff.

**Spec:** `docs/superpowers/specs/2026-11-04-event-model-design.md`

## Global Constraints

- Run all commands from `backend/` with the virtual environment active (`.venv/Scripts/python.exe` on Windows).
- Never modify `migrations/versions/20261026_01_create_events_table.py`.
- Constraint and index names come from the naming convention in `app/db/base.py`; do not hard-code different names.
- Allowed `event_type` values in the MVP: `wedding` only. Allowed `status` values: `draft`, `published`.
- Default `timezone`: `Europe/Madrid`. Default `status`: `draft`. Default `details`: `{}`.
- Slug format: `^[a-z0-9]+(-[a-z0-9]+)*$`, max 80 characters, unique.
- Wedding names: required, whitespace stripped, 1–100 characters, no extra fields.
- Commits in Conventional Commits, without AI attribution.
- `ruff check .`, `ruff format --check .` and `pytest` must pass before each commit.

## Review Focus

- Names with accents or `ñ` (`"José"`, `"Begoña"`) must be accepted → test in Task 1.
- Names made only of spaces must be rejected, not stored as empty strings → test in Task 1.
- A non-string name (`123`) must be rejected rather than coerced → test in Task 1.
- An existing event with `location = NULL` must migrate without creating an empty location → manual check in Task 2.
- Downgrade of an event with two locations must restore `location` from the one with `position = 0` → manual check in Task 2.

---

### Task 1: `details` validation schema

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty)
- Create: `backend/app/schemas/event_details.py`
- Test: `backend/tests/test_event_details.py`

**Interfaces:**
- Produces:
  - `class WeddingDetails(pydantic.BaseModel)` with `partner_one_name: str` and `partner_two_name: str`; `model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)`; each field `Field(min_length=1, max_length=100)`.
  - `class UnknownEventTypeError(ValueError)`
  - `EVENT_DETAILS_SCHEMAS: dict[str, type[BaseModel]] = {"wedding": WeddingDetails}`
  - `def validate_event_details(event_type: str, details: dict[str, Any]) -> dict[str, Any]` — returns the validated, normalized dict (`model_dump()`); raises `UnknownEventTypeError` for unknown types and `pydantic.ValidationError` for invalid data.

- [ ] **Step 1: Write the failing tests** in `tests/test_event_details.py`:

```python
def test_valid_wedding_details_are_normalized():
    assert validate_event_details(
        "wedding", {"partner_one_name": "  Ana ", "partner_two_name": "Luis"}
    ) == {"partner_one_name": "Ana", "partner_two_name": "Luis"}

def test_accented_names_are_accepted():
    result = validate_event_details(
        "wedding", {"partner_one_name": "José", "partner_two_name": "Begoña"}
    )
    assert result["partner_two_name"] == "Begoña"

@pytest.mark.parametrize("name", ["", "   ", "a" * 101])
def test_invalid_name_length_is_rejected(name):
    with pytest.raises(ValidationError):
        validate_event_details("wedding", {"partner_one_name": name, "partner_two_name": "Luis"})

def test_missing_partner_name_is_rejected():  # only partner_one_name given → ValidationError
def test_non_string_name_is_rejected():       # partner_one_name=123 → ValidationError
def test_extra_fields_are_rejected():         # adds "child_name": "Lucía" → ValidationError
def test_unknown_event_type_is_rejected():    # "baptism" → UnknownEventTypeError
def test_name_of_100_characters_is_accepted(): # "a" * 100 → accepted
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_event_details.py -v`
Expected: collection error, `ModuleNotFoundError: No module named 'app.schemas'`.

- [ ] **Step 3: Implement the interfaces above** in `app/schemas/event_details.py`. `validate_event_details` looks up `EVENT_DETAILS_SCHEMAS`, raises `UnknownEventTypeError(event_type)` if missing, otherwise `schema.model_validate(details).model_dump()`.

- [ ] **Step 4: Run tests and lint**

Run: `python -m pytest -v && python -m ruff check . && python -m ruff format --check .`
Expected: all tests pass (6 existing + new), Ruff clean.

- [ ] **Step 5: Commit**

```bash
git add app/schemas tests/test_event_details.py
git commit -m "feat(events): validar los datos propios del tipo de evento"
```

---

### Task 2: Models, migration and documentation

**Files:**
- Modify: `backend/app/models/event.py`
- Create: `backend/app/models/event_location.py`
- Modify: `backend/app/models/__init__.py` (export `Event`, `EventLocation`)
- Create: `backend/migrations/versions/20261104_01_revise_event_model.py`
- Modify: `PROJECT_CONTEXT.md` (section 8 "Initial event model" → "Event model"; section 9 decisions)
- Modify: `PLAN.md` (section 4 "Cuentas y eventos" and Phase 3 tasks)

**Interfaces:**
- Produces:
  - `Event` columns exactly as spec §3 `events`. `details: Mapped[dict[str, Any]]` with `JSONB` from `sqlalchemy.dialects.postgresql`, `server_default=text("'{}'::jsonb")`. `slug` with `unique=True`. `__table_args__` with `CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="slug_format")` and `CheckConstraint("status IN ('draft', 'published')", name="status_valid")`.
  - `Event.locations: Mapped[list["EventLocation"]]` — `relationship(back_populates="event", cascade="all, delete-orphan", passive_deletes=True, order_by="EventLocation.position")`.
  - `EventLocation` (table `event_locations`) columns exactly as spec §3; `event_id` with `ForeignKey("events.id", ondelete="CASCADE")`, `index=True`; `event: Mapped["Event"] = relationship(back_populates="locations")`.
  - Migration `revision = "20261104_01"`, `down_revision = "20261026_01"`.

- [ ] **Step 1: Update the models** per Interfaces. `updated_at` on both tables keeps `server_default=func.now(), onupdate=func.now()`.

- [ ] **Step 2: Verify Alembic detects the drift**

Run: `python -m alembic check`
Expected: FAIL listing added/removed columns and the new table (proves the models changed).

- [ ] **Step 3: Write the migration** following spec §5 in order. `upgrade`: add new columns nullable or with server defaults → `op.create_table("event_locations", ...)` → backfill with `op.execute` (SQL in spec §5, `details` via `jsonb_build_object`) → `alter_column` `title`/`slug` to `nullable=False` → `create_unique_constraint` on `slug` and `create_check_constraint` for `slug_format` and `status_valid` (use `op.f()` names matching the naming convention) → drop old columns → `alter_column("event_type", server_default=None)`. `downgrade`: reverse order; `location` from the `position = 0` row; `partner_*_name` from `details->>'partner_one_name'` / `'partner_two_name'` (`COALESCE(..., '')`); `is_active = true`.

- [ ] **Step 4: Prepare test data with the old schema**

Run: `python -m alembic downgrade base && python -m alembic upgrade 20261026_01`, then insert via `psql`:

```sql
INSERT INTO events (id, owner_firebase_uid, partner_one_name, partner_two_name, location)
VALUES (gen_random_uuid(), 'uid-a', 'Ana', 'Luis', 'Finca El Olivar'),
       (gen_random_uuid(), 'uid-b', 'José', 'Begoña', NULL);
```

- [ ] **Step 5: Upgrade and verify**

Run: `python -m alembic upgrade head && python -m alembic check`
Expected: `No new upgrade operations detected.` Then `SELECT title, slug, status, details FROM events;` → `Ana y Luis` / `José y Begoña`, slugs `evento-<12 hex>`, `draft`, names in `details`. `SELECT * FROM event_locations;` → exactly one row (`Celebración`, `Finca El Olivar`, position 0); none for José y Begoña.

- [ ] **Step 6: Verify downgrade restores data**

Insert a second location (`position = 1`, venue `Iglesia`) for Ana y Luis, then run `python -m alembic downgrade -1`.
Expected: `events` has `partner_one_name`, `location = 'Finca El Olivar'` for Ana y Luis, `NULL` for José y Begoña, `is_active = true`; `event_locations` no longer exists. Run `python -m alembic upgrade head` again and confirm it succeeds. Finally `DELETE FROM events;` to leave the database clean.

- [ ] **Step 7: Update documentation**
  - `PROJECT_CONTEXT.md` §8: describe `events` (common columns, `details` JSONB validated per type, `status`, `slug`, `timezone`) and `event_locations`; remove the sentence about reviewing the model at the start of Phase 3. §9: one-event-per-account rule (replace "one active event"), `status` instead of activation, `details` decision.
  - `PLAN.md` §4: "un evento activo" → "un evento"; Phase 3: mark "Revisar el modelo" as done and replace "Desactivar el evento" with "Eliminar el evento (borrado definitivo con confirmación)".

- [ ] **Step 8: Run the full check**

Run: `python -m pytest && python -m ruff check . && python -m ruff format --check .`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add app/models migrations/versions/20261104_01_revise_event_model.py ../PROJECT_CONTEXT.md ../PLAN.md
git commit -m "feat(events): revisar el modelo de eventos y añadir lugares"
```
