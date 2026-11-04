# Diseño: revisión del modelo de eventos

**Fecha:** 2026-11-04
**Fase:** 3 — Gestión del evento (tarea «Revisar el modelo»)
**Estado:** implementado

## 1. Objetivo

Adaptar el modelo de datos de eventos a las decisiones de `PLAN.md` antes de construir el CRUD:

* Separar los datos comunes de los datos propios de cada tipo de evento, para añadir tipos nuevos sin migraciones.
* Añadir título, URL pública (slug), estado borrador/publicado, hora de inicio y zona horaria.
* Sustituir la ubicación única por una lista de lugares.
* Eliminar el estado «activo/desactivado».

## 2. Decisiones

| # | Decisión | Motivo |
| --- | --- | --- |
| D1 | Los datos propios del tipo se guardan en una columna `details` (JSONB) validada con Pydantic según `event_type`. | Añadir un tipo = un esquema de Pydantic, sin migración ni cambios en la tabla, el repositorio o los endpoints. |
| D2 | `status` con dos valores: `draft` y `published`. Se elimina `is_active`. | «Desactivar» no aporta nada que no cubran despublicar y eliminar. |
| D3 | Eliminar un evento es un borrado definitivo (con confirmación fuerte en la interfaz). Sin papelera en el MVP. | Simplicidad y cumplimiento del RGPD. La papelera queda para después del MVP. |
| D4 | La regla es «un evento por cuenta», aplicada en el servicio, no en la base de datos. | Se puede relajar para profesionales sin migración. Se acepta el caso extremo de dos creaciones simultáneas. |
| D5 | `status` es texto con una restricción `CHECK`, no un `ENUM` de PostgreSQL. | Añadir valores a un `ENUM` requiere migraciones engorrosas. |
| D6 | Los lugares van en una tabla propia `event_locations` (uno o varios por evento). | Información esencial para el invitado (ceremonia y celebración), común a todos los tipos. |
| D7 | El enlace al mapa se genera a partir de la dirección al mostrarlo; no se guardan coordenadas. | Sin claves de API ni coste; las coordenadas se pueden añadir después. |
| D8 | La fecha es opcional en borrador y obligatoria para publicar (regla del servicio, fase 4). | La caducidad cuenta desde la fecha del evento. |

## 3. Esquema

### Tabla `events`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | `UUID` | PK |
| `owner_firebase_uid` | `VARCHAR(128)` | `NOT NULL`, índice |
| `event_type` | `VARCHAR(32)` | `NOT NULL`, sin valor por defecto |
| `title` | `VARCHAR(150)` | `NOT NULL` |
| `slug` | `VARCHAR(80)` | `NOT NULL`, único, `CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')` |
| `status` | `VARCHAR(16)` | `NOT NULL`, por defecto `'draft'`, `CHECK (status IN ('draft', 'published'))` |
| `event_date` | `DATE` | nullable |
| `start_time` | `TIME` | nullable |
| `timezone` | `VARCHAR(64)` | `NOT NULL`, por defecto `'Europe/Madrid'` |
| `details` | `JSONB` | `NOT NULL`, por defecto `'{}'` |
| `main_photo_path` | `VARCHAR(1024)` | nullable |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, por defecto `now()` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, por defecto `now()`, se actualiza desde el ORM |

Se eliminan: `partner_one_name`, `partner_two_name`, `location`, `is_active`.

### Tabla `event_locations`

| Columna | Tipo | Restricciones |
| --- | --- | --- |
| `id` | `UUID` | PK |
| `event_id` | `UUID` | `NOT NULL`, índice, FK a `events.id` con `ON DELETE CASCADE` |
| `label` | `VARCHAR(60)` | `NOT NULL` (por ejemplo, «Ceremonia») |
| `venue_name` | `VARCHAR(150)` | `NOT NULL` |
| `address` | `VARCHAR(300)` | `NOT NULL` |
| `position` | `SMALLINT` | `NOT NULL` (orden de visualización) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, por defecto `now()` |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, por defecto `now()`, se actualiza desde el ORM |

### Contenido de `details` por tipo

`wedding`:

```json
{ "partner_one_name": "Ana", "partner_two_name": "Luis" }
```

Validación (Pydantic): ambos nombres obligatorios, sin espacios sobrantes, entre 1 y 100 caracteres; no se admiten campos adicionales. Un `event_type` desconocido se rechaza.

## 4. Componentes

| Archivo | Responsabilidad |
| --- | --- |
| `backend/app/models/event.py` | Modelo `Event` actualizado y relación con sus lugares (ordenados por `position`). |
| `backend/app/models/event_location.py` | Modelo `EventLocation`. |
| `backend/app/models/__init__.py` | Exporta ambos modelos (necesario para Alembic). |
| `backend/app/schemas/event_details.py` | Esquema `WeddingDetails` y una función que valida `details` según `event_type`. |
| `backend/migrations/versions/20261104_01_revise_event_model.py` | Migración del esquema conservando los datos. |
| `backend/tests/test_event_details.py` | Tests del esquema de `details`. |

## 5. Migración `20261104_01`

**upgrade:**

1. Añadir `title`, `slug`, `status`, `start_time`, `timezone` y `details` (las obligatorias primero como nullable o con valor por defecto).
2. Crear `event_locations`.
3. Rellenar las filas existentes:
   * `details` ← `{"partner_one_name": …, "partner_two_name": …}`
   * `title` ← `partner_one_name || ' y ' || partner_two_name`
   * `slug` ← `'evento-' || left(replace(id::text, '-', ''), 12)`
   * `status` ← `'draft'`
   * Si `location` no es nulo, insertar un lugar con `label = 'Celebración'`, `venue_name = location`, `address = location`, `position = 0`.
4. Marcar `title` y `slug` como `NOT NULL`; crear el índice único de `slug` y las restricciones `CHECK`.
5. Eliminar `partner_one_name`, `partner_two_name`, `location`, `is_active` y quitar el valor por defecto de `event_type`.

**downgrade:** proceso inverso. Restaura las columnas antiguas a partir de `details` y del primer lugar de cada evento (`location`), `is_active = true`, y elimina `event_locations` y las columnas nuevas.

## 6. Validación

* Tests de `WeddingDetails` y de la validación por tipo: boda válida, nombres vacíos o solo con espacios, nombres demasiado largos, campos adicionales y tipo desconocido.
* CI: `alembic upgrade head` + `alembic check` contra PostgreSQL.
* Manual (local): `alembic upgrade head`, `alembic check`, `alembic downgrade -1`, `alembic upgrade head`, con al menos una fila de prueba con lugar para verificar que los datos se conservan.

## 7. Documentación

* `PROJECT_CONTEXT.md`: actualizar «Initial event model» y las decisiones arquitectónicas.
* `PLAN.md`: «Desactivar el evento» → «Eliminar el evento»; regla «un evento por cuenta».

## 8. Fuera de alcance

Endpoints, generación automática de slugs, reglas de publicación, formularios, esquemas de petición y respuesta de la API, y la capa de repositorio. Todo ello pertenece a «Crear evento» y a la fase 4.
