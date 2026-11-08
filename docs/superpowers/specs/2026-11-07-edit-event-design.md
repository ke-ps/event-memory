# Diseño: editar el evento

**Fecha:** 2026-11-07
**Fase:** 3 — Gestión del evento («Editar el evento»)
**Issue:** #25
**Estado:** aprobado en conversación, pendiente de revisión del documento

## 1. Objetivo

Que la pareja pueda corregir y completar los datos de su boda desde el panel: título, nombres, fecha y hora. Tras guardar, vuelve al resumen actualizado sin recargar la página.

## 2. Decisiones

| # | Decisión | Motivo |
| --- | --- | --- |
| D1 | Campos editables: título, los dos nombres, fecha y hora de inicio. | Lo que la pareja espera poder cambiar sin ampliar la tarea. Los lugares van con «Información, fecha y ubicación» (fase 4). |
| D2 | El título es un campo normal: el formulario lo trae relleno; cambiar un nombre no lo modifica. Vacío o `null` → se regenera «Nombre1 y Nombre2». | Predecible, sin migración, y con una forma sencilla de volver al título automático. |
| D3 | `PUT /api/v1/events/me` con todos los campos editables obligatorios (admiten `null` los opcionales). | Coherente con `GET /events/me` (un evento por cuenta); no se borra un dato por omitir un campo. |
| D4 | No cambian: `slug`, `status`, `timezone`, `event_type`, lugares ni dueño. | URL editable y publicar son de la fase 4; el tipo define el contenido de `details`. |
| D5 | El formulario de edición es un componente propio; la validación y los errores por campo se comparten con el de crear en un archivo común. | Campos, textos y salidas distintos; sin duplicar lógica. |
| D6 | Sin diseño visual: estilo actual del panel. | El diseño parte del prompt del propietario (fase 4). |

## 3. API

### `PUT /api/v1/events/me` (autenticado)

Petición:

```json
{
  "title": "La boda de Ana y Luis",
  "details": { "partner_one_name": "Ana", "partner_two_name": "Luis" },
  "event_date": "2027-06-12",
  "start_time": "18:30"
}
```

* Los cuatro campos son obligatorios en el cuerpo; `title`, `event_date` y `start_time` admiten `null`.
* `title`: se recortan los espacios de los extremos; máximo 150 caracteres. Vacío o `null` → `"{partner_one_name} y {partner_two_name}"` (misma regla y truncado que al crear).
* `details`: se valida con `validate_event_details(event.event_type, details)`.
* `event_date`: fecha ISO o `null`. `start_time`: hora ISO (`HH:MM` o `HH:MM:SS`) o `null`.
* No se admiten campos adicionales (`extra="forbid"`): enviar `slug`, `status`, `event_type`, etc. da 422.

Respuesta `200`: `EventRead` actualizado (mismo esquema que crear y consultar), con `updated_at` nuevo.

### Errores

| Caso | HTTP | `code` |
| --- | --- | --- |
| Sin token, token inválido, Firebase no disponible | 401 / 401 / 503 | `missing_token` / `invalid_token` / `auth_unavailable` |
| El usuario no tiene evento | 404 | `event_not_found` |
| Cuerpo inválido (campo ausente o extra, título largo, `details` inválido, fecha u hora mal formadas) | 422 | `validation_error`, con `errors[].field` (`title`, `details.partner_one_name`, `start_time`…) |

El evento se busca siempre por el dueño del token: no hay forma de editar el de otra persona.

## 4. Backend

| Archivo | Cambio |
| --- | --- |
| `app/schemas/events.py` | `EventUpdate` (`extra="forbid"`): `title: str \| None`, `details: dict`, `event_date: date \| None`, `start_time: time \| None`, todos sin valor por defecto. |
| `app/services/events.py` | `update_own_event(session, owner_uid, data) -> Event`: busca por dueño (404), valida `details` (mismo formato de errores que al crear), resuelve el título, asigna campos, `commit` y `refresh`; `rollback` si hay error. La generación del título se comparte con `create_event`. |
| `app/repositories/events.py` | Sin cambios previstos (`get_by_owner` ya existe). |
| `app/api/routes/events.py` | `PUT /events/me` → 200 `EventRead`. Solo HTTP. |

## 5. Frontend

| Archivo | Cambio |
| --- | --- |
| `app/events/event.models.ts` | Tipo `EventUpdateRequest`. |
| `app/events/event-api.service.ts` | `update(request): Promise<EventRead>` → `PUT /events/me` con `Authorization: Bearer`. |
| `app/events/event-form-errors.ts` (nuevo) | Validador «sin solo espacios» y lógica de errores de la API por campo, usados por ambos formularios. El formulario de crear pasa a usarlo sin cambiar su comportamiento. |
| `app/events/event-edit-form.component.ts` (nuevo) | Reactive Form: título (opcional, máx. 150, pista «Si lo dejas vacío, se usarán vuestros nombres»), dos nombres (obligatorios, máx. 100, sin solo espacios), fecha y hora opcionales. Relleno con el evento actual. Un error por campo (cliente o API); mensaje general si el error no corresponde a un campo visible. Salidas `saved(EventRead)` y `cancelled`. Título vacío → `null`. |
| `app/events/event-summary.component.ts` | Muestra la hora si existe junto a la fecha; botón «Editar» que emite `edit`. |
| `app/dashboard/dashboard-page.component.ts` | Estado `editing`; `edit` → `editing`; `saved` → `ready` con el evento nuevo; `cancelled` → `ready`. |

Todos los textos nuevos con ids `events.edit.*` (y `events.summary.*` para el resumen); se regenera `messages.xlf`.

## 6. Tests

### Backend

* `test_events_service.py`: actualiza título, nombres, fecha y hora; título vacío y `null` se regeneran; título con espacios se recorta; `slug`, `status` y `timezone` no cambian; sin evento → 404; `details` inválido → 422 con `details.*`.
* `test_events_api.py`: 200 con el cuerpo actualizado y sin `owner_firebase_uid`; 422 por campo ausente, campo extra (`slug`) y título de 151 caracteres (`field` = `title`); 404 sin evento; 401 sin token; un usuario no modifica el evento de otro.

### Frontend

* `event-api.service.spec.ts`: `update()` usa `PUT`, la URL, la cabecera y el cuerpo.
* `event-edit-form.component.spec.ts`: se rellena con el evento; validación de nombres y título; título vacío se envía como `null`; envío correcto emite `saved`; error de API por campo; cancelar emite `cancelled` sin llamar a la API.
* `event-summary` / `dashboard-page.component.spec.ts`: la hora se muestra; «Editar» abre el formulario; guardar vuelve al resumen con los datos nuevos; cancelar vuelve sin cambios.
* Los tests existentes del formulario de crear siguen pasando tras extraer la lógica común.

## 7. Documentación

* `PROJECT_CONTEXT.md`: endpoint `PUT /events/me` y regla del título.
* `PLAN.md`: marcar «Editar el evento».

## 8. Fuera de alcance

Lugares, zona horaria, URL editable, publicar o despublicar, eliminar el evento y cualquier diseño visual.
