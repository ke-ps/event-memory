# Diseño: crear y consultar el evento

**Fecha:** 2026-11-05
**Fase:** 3 — Gestión del evento («Crear evento» y «Consultar el evento propio»)
**Issue:** #23
**Estado:** aprobado en conversación, pendiente de revisión del documento

## 1. Objetivo

Que una pareja autenticada pueda crear su boda desde el panel con un formulario mínimo y verla al volver a entrar. Es el primer CRUD del proyecto: fija la capa de repositorio, la dependencia de usuario autenticado, los esquemas de petición y respuesta, la traducción de códigos de error en el frontend y los tests contra PostgreSQL.

## 2. Decisiones

| # | Decisión | Motivo |
| --- | --- | --- |
| D1 | Formulario mínimo: dos nombres (obligatorios) y fecha (opcional). Título y URL se generan. | Crear la boda en segundos; el resto se completa en «Editar evento». |
| D2 | Crear y consultar en la misma tarea. | El panel necesita saber si ya hay boda para mostrar formulario o resumen. |
| D3 | Cuerpo de petición genérico: `event_type` + `details` + `event_date`. | Un tipo de evento nuevo no cambia la API, solo el contenido de `details`. |
| D4 | Un evento por cuenta; un segundo intento devuelve 409 `event_already_exists`. | Regla de `PLAN.md`, aplicada en el servicio. |
| D5 | El dueño sale siempre del token; `owner_firebase_uid` no se devuelve. | Seguridad y no exponer datos internos. |
| D6 | Slug: minúsculas, sin tildes, `ñ`→`n`, no alfanumérico→`-`, máx. 80; si existe, sufijo `-2`, `-3`… | URL legible y única. |
| D7 | Tests de backend contra una base PostgreSQL real `event_memory_test`, con una transacción por test que se deshace. | Prueba restricciones, JSONB y SQL reales. |
| D8 | El frontend traduce los errores por `code` con `$localize`; código desconocido → mensaje genérico. | Uso real de los códigos estables de la API. |
| D9 | Sin diseño visual: estilo actual del panel. | El diseño parte del prompt del propietario (fase 4). |

## 3. API

### `POST /api/v1/events` (autenticado)

Petición:

```json
{
  "event_type": "wedding",
  "details": { "partner_one_name": "Ana", "partner_two_name": "Luis" },
  "event_date": "2027-06-12"
}
```

* `event_type`: obligatorio, texto.
* `details`: obligatorio, objeto; se valida con `validate_event_details(event_type, details)`.
* `event_date`: opcional (`null` o ausente), fecha ISO.
* No se admiten campos adicionales (`extra="forbid"`).

Respuesta `201`: `EventRead` (abajo).

### `GET /api/v1/events/me` (autenticado)

Respuesta `200`: `EventRead` del evento del usuario. `404` `event_not_found` si no tiene.

### `EventRead`

```json
{
  "id": "uuid", "event_type": "wedding", "title": "Ana y Luis", "slug": "ana-y-luis",
  "status": "draft", "event_date": "2027-06-12", "start_time": null,
  "timezone": "Europe/Madrid",
  "details": { "partner_one_name": "Ana", "partner_two_name": "Luis" },
  "locations": [], "created_at": "…", "updated_at": "…"
}
```

`locations` es una lista de `LocationRead` (`id`, `label`, `venue_name`, `address`, `position`), ordenada por `position`. No incluye `owner_firebase_uid`.

### Errores

| Caso | HTTP | `code` |
| --- | --- | --- |
| Sin token o esquema distinto de Bearer | 401 | `missing_token` |
| Token inválido o caducado | 401 | `invalid_token` |
| Firebase no disponible | 503 | `auth_unavailable` |
| Ya existe un evento del usuario | 409 | `event_already_exists` |
| `event_type` no admitido | 422 | `unsupported_event_type` |
| Cuerpo inválido (también `details` inválido) | 422 | `validation_error`, con `errors[].field` (`details.partner_one_name`, `event_date`…) |
| `GET /me` sin evento | 404 | `event_not_found` |

Los errores de `details` detectados por el servicio se devuelven con el mismo formato que la validación de FastAPI: `field` con prefijo `details.` y `code` igual al tipo de error de Pydantic (`string_too_short`, `missing`, `extra_forbidden`…).

### Generación

* **Título:** `"{partner_one_name} y {partner_two_name}"` (valores ya normalizados por `WeddingDetails`), truncado a 150.
* **Slug:** `slugify(title)`; si queda vacío, `evento`. Si existe, se prueban `-2`, `-3`… (el sufijo cabe dentro de los 80 caracteres). Si el `INSERT` falla por la restricción única del slug (creación simultánea), se reintenta con el siguiente sufijo hasta 5 veces; después, error 409 `slug_conflict`.

## 4. Backend

| Archivo | Responsabilidad |
| --- | --- |
| `app/api/dependencies.py` | `CurrentUser` (`uid`, `email`) y `get_current_user(credentials) -> CurrentUser`, que lanza `AppError` 401/503. `/auth/me` pasa a usarla. |
| `app/api/routes/events.py` | `POST /events` (201) y `GET /events/me`. Solo HTTP. Registrado en `app/api/router.py` con prefijo `/events`. |
| `app/schemas/events.py` | `EventCreate`, `EventRead`, `LocationRead` (Pydantic, `from_attributes`). |
| `app/services/events.py` | `create_event(session, owner_uid, data) -> Event` y `get_own_event(session, owner_uid) -> Event`. Reglas D4–D6, `commit`, conversión de errores a `AppError`. |
| `app/services/slugs.py` | `slugify(text: str, max_length: int = 80) -> str` (función pura). |
| `app/repositories/events.py` | `get_by_owner(session, owner_uid)`, `slug_exists(session, slug)`, `add(session, event)`. Sin reglas de negocio ni `commit`. |

La sesión llega con la dependencia existente `get_db`. El servicio hace `commit` al final y `rollback` si hay error.

## 5. Frontend

| Archivo | Responsabilidad |
| --- | --- |
| `app/events/event.models.ts` | Tipos `EventRead`, `EventLocation`, `EventCreateRequest`, `WeddingDetails`. |
| `app/events/event-api.service.ts` | `create(request)` y `getMine()`; obtiene el token de `AuthService` y envía `Authorization: Bearer`. `getMine()` devuelve `null` en 404. |
| `app/core/api-error-messages.ts` | `apiErrorMessage(error): string` (mensaje general traducido por `code`) y `apiFieldErrors(error): Record<string, string>` (mensaje por campo para `validation_error`). Códigos desconocidos → mensaje genérico. |
| `app/events/event-create-form.component.ts` | Reactive Form: dos nombres (obligatorios, máx. 100, sin solo espacios) y fecha opcional; muestra errores del navegador y de la API por campo; emite el evento creado. |
| `app/events/event-summary.component.ts` | Título, fecha con `DatePipe` (`longDate`, español) o «Fecha por decidir», y estado «Borrador»/«Publicado». |
| `app/dashboard/dashboard-page.component.ts` | Estados con Signals: `loading`, `empty` (formulario), `ready` (resumen), `error` (mensaje + reintentar). Tras crear, pasa a `ready` sin recargar. |

Todos los textos con ids `events.*` o `errors.*`; se regenera `messages.xlf`.

## 6. Tests

### Backend

* `tests/conftest.py`: engine contra `event_memory_test` (mismos credenciales que `backend/.env`, nombre `{POSTGRES_DB}_test`); al inicio de la sesión de tests aplica `alembic upgrade head`; fixture `db_session` con transacción externa y `join_transaction_mode="create_savepoint"` que se deshace al acabar cada test; fixture `client` que sustituye `get_db` y `get_current_user`. Si la base de tests no está accesible, los tests que la usan fallan con un mensaje que indica cómo crearla.
* `test_slugs.py`: tildes, ñ, mayúsculas, espacios y símbolos repetidos, guiones en los extremos, texto vacío, límite de 80.
* `test_events_service.py`: título, slug único con sufijo, un evento por cuenta, tipo no admitido, `details` inválido, reintento por conflicto de slug.
* `test_events_api.py`: 201 con cuerpo completo y sin `owner_firebase_uid`, 409, 422 con `field`, 422 `unsupported_event_type`, `GET /me` 200 y 404, 401 sin token, aislamiento entre dos usuarios.

### Frontend

* `event-api.service.spec.ts`: URL, cabecera, cuerpo, `getMine()` → `null` en 404.
* `api-error-messages.spec.ts`: código conocido, desconocido, error sin cuerpo, errores por campo.
* `event-create-form.component.spec.ts`: validación, envío, errores de API por campo.
* `dashboard-page.component.spec.ts`: los cuatro estados y la transición tras crear.

### CI

En el job de backend, antes de los tests, crear `event_memory_test` en el servicio PostgreSQL.

## 7. Documentación

* `docs/local-development.md`: crear `event_memory_test` (pgAdmin o SQL, una vez por ordenador) y arrancar el backend con `GOOGLE_APPLICATION_CREDENTIALS`.
* `PROJECT_CONTEXT.md`: capas con su ejemplo (`events`), dependencia `get_current_user`, estrategia de tests con PostgreSQL y nuevos códigos de error.
* `PLAN.md`: marcar «Crear evento» y «Consultar el evento propio».

## 8. Fuera de alcance

Editar y eliminar el evento, gestionar lugares, hora y zona horaria desde la interfaz, publicar, editar la URL y cualquier diseño visual.
