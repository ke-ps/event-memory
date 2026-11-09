# Diseño: gestionar los lugares de la boda

**Fecha:** 2026-11-09
**Fase:** 4 — Página pública («Información, fecha y ubicación con enlace al mapa»)
**Issue:** #32
**Estado:** aprobado en conversación, pendiente de revisión del documento

## 1. Objetivo

Que la pareja gestione desde el panel los lugares de su boda (ceremonia, celebración…) y que los invitados los vean en la página pública con un enlace para abrirlos en el mapa. La página pública sigue en texto plano: el estilo llega con la plantilla.

## 2. Decisiones

| # | Decisión | Motivo |
| --- | --- | --- |
| D1 | Cada lugar tiene una hora opcional (`start_time`), además de etiqueta, nombre del sitio y dirección. | Lo habitual en una boda son dos sitios a dos horas distintas; sin ella, la pareja la escribiría en la etiqueta. |
| D2 | El enlace al mapa se genera automáticamente con el nombre del sitio y la dirección, y no se guarda. | Sin cuenta, clave ni coste; la pareja no hace nada; no se muestra a los invitados un enlace escrito por el usuario. |
| D3 | El enlace aparece también en el panel. | La pareja comprueba que lleva al sitio correcto antes de compartirlo. |
| D4 | La lista se guarda completa con un único `PUT`. | Una boda tiene pocos lugares y la pareja los prepara juntos; es todo o nada; el orden sale de la lista. |
| D5 | Los lugares no son obligatorios para publicar y se pueden cambiar con la boda publicada. | `PLAN.md` solo exige la fecha; si cambia el sitio, los invitados deben verlo. |
| D6 | Máximo 10 lugares por boda. | Ninguna boda real llega y limita el tamaño de una página que se sirve sin sesión. |
| D7 | Ordenar con botones «Subir» y «Bajar». | Sin dependencias y funciona igual con teclado y en el móvil. |
| D8 | Sin diseño visual. | El diseño parte del prompt del propietario (plantilla de boda). |

**Coste aceptado de D4:** los lugares reciben ids nuevos al guardar. Hoy nada los referencia y la API pública no los expone; si en el futuro algo los usa (por ejemplo, el módulo de agenda), habrá que conservarlos entonces.

## 3. Datos

| Campo | Regla |
| --- | --- |
| `label` | Obligatorio, 1–60 caracteres tras recortar espacios. Texto libre. |
| `venue_name` | Obligatorio, 1–150 caracteres tras recortar espacios. |
| `address` | Obligatoria, 1–300 caracteres tras recortar espacios. |
| `start_time` | Hora ISO o `null`. Debe venir en el cuerpo. |

**Migración:** añade `start_time` (`Time`, admite `NULL`) a `event_locations`. No afecta a datos existentes: los lugares actuales quedan sin hora. El `downgrade` elimina la columna.

## 4. API

### `PUT /api/v1/events/me/locations` (autenticado)

```json
{
  "locations": [
    { "label": "Ceremonia", "venue_name": "Iglesia de San Juan", "address": "Calle Mayor 1, Toledo", "start_time": "17:00" },
    { "label": "Celebración", "venue_name": "Finca El Olivar", "address": "Ctra. X, km 5", "start_time": null }
  ]
}
```

* La posición de cada lugar es su índice en la lista (desde 0) y la calcula el servidor; no se envía.
* Lista vacía: válida, borra todos los lugares.
* No se admiten campos adicionales (`extra="forbid"`), tampoco dentro de cada lugar.
* Borra los lugares anteriores e inserta los nuevos en una sola transacción; si algo falla, se conserva la lista anterior.

Respuesta `200`: `EventRead` con los lugares nuevos, ordenados por `position`.

| Caso | HTTP | `code` |
| --- | --- | --- |
| Sin token, token inválido, Firebase no disponible | 401 / 401 / 503 | `missing_token` / `invalid_token` / `auth_unavailable` |
| El usuario no tiene boda | 404 | `event_not_found` |
| Cuerpo inválido o más de 10 lugares | 422 | `validation_error`, con `errors[].field` (`locations.1.address`, `locations`…) |

El evento se busca siempre por el dueño del token.

### Respuestas existentes

`LocationRead` (en `EventRead`) y `PublicLocationRead` (en la API pública) añaden `start_time`. `PublicLocationRead` sigue sin `id`.

## 5. Backend

| Archivo | Cambio |
| --- | --- |
| `migrations/versions/` | Migración que añade `event_locations.start_time`. |
| `app/models/event_location.py` | Columna `start_time`. |
| `app/schemas/events.py` | `LocationWrite` y `EventLocationsUpdate` (máx. 10). `start_time` en `LocationRead` y `PublicLocationRead`. |
| `app/repositories/events.py` | `replace_locations(session, event, locations)`, sin `commit`. |
| `app/services/events.py` | `update_own_event_locations(session, owner_uid, data) -> Event`: busca por dueño (404), reemplaza, `commit`, `refresh`; `rollback` si hay error. |
| `app/api/routes/events.py` | `PUT /events/me/locations` → 200 `EventRead`. Solo HTTP. |

## 6. Frontend

| Archivo | Cambio |
| --- | --- |
| `app/events/event.models.ts` | `start_time` en `EventLocation` y `PublicEvent.locations`; tipos `EventLocationWrite` y `EventLocationsUpdateRequest`. |
| `app/events/event-api.service.ts` | `updateLocations(request): Promise<EventRead>` → `PUT /events/me/locations`. |
| `app/events/event-map.ts` (nuevo) | `eventMapUrl(venueName, address): string` → `https://www.google.com/maps/search/?api=1&query=<«nombre, dirección» codificado>`. |
| `app/events/event-locations-form.component.ts` (nuevo) | Reactive Form con `FormArray`. Una fila por lugar (etiqueta, nombre, dirección, hora) con «Subir», «Bajar» y «Quitar». «Añadir lugar», desactivado con 10 filas. Sin lugares, empieza con una fila vacía. Pista: «La hora de cada lugar es opcional. Úsala si la ceremonia y la celebración son a horas distintas». «Guardar» (desactivado mientras envía) y «Cancelar». Salidas `saved(EventRead)` y `cancelled`. |
| `app/events/event-summary.component.ts` | Lista de lugares con etiqueta, hora, sitio, dirección y «Ver en el mapa» (nueva pestaña); «Todavía no habéis añadido lugares» si no hay; botón «Añadir lugares» o «Editar lugares», que emite `editLocations`. |
| `app/dashboard/dashboard-page.component.ts` | Estado `editingLocations`; `saved` actualiza el evento y vuelve a `ready`; `cancelled` vuelve a `ready`. |
| `app/public/public-event-page.component.ts` | Tras la fecha, lista de lugares en orden con los mismos datos y «Ver en el mapa». Sin lugares, no muestra esa sección. |

**Errores:** los errores del servidor se muestran bajo su campo (`locations.<fila>.<campo>`). Cualquier cambio en el formulario los borra, porque subir, bajar o quitar filas cambia su número y un error quedaría en la fila equivocada. El formulario valida las mismas reglas que el servidor. Si el error no corresponde a un campo visible, se muestra un mensaje general.

La hora se envía como `HH:MM` o `null`, y se muestra con los cinco primeros caracteres.

Textos con ids `events.locations.*` y `public.locations.*`; se regenera `messages.xlf`.

## 7. Tests

### Backend

* Servicio: guardar; reemplazar la lista anterior; orden según la lista; lista vacía; hora opcional; sin boda (404); no toca los lugares de otra boda; se pueden cambiar con la boda publicada.
* API: 200 con el cuerpo completo; 422 por más de 10, por campo vacío o solo espacios (con `field` exacto), por campo extra y por falta de `start_time`; 404; 401; aislamiento entre dos usuarios; la API pública incluye `start_time` y no `id`.

### Frontend

* `event-map`: tildes, comas y símbolos codificados.
* `event-api.service`: método, URL, cabecera y cuerpo de `updateLocations`.
* `event-locations-form`: se rellena; empieza con una fila vacía sin lugares; añade hasta 10; quita; sube y baja (extremos desactivados); valida; envía en el orden visible con hora o `null`; error del servidor bajo su fila y campo; el error se borra al cambiar la lista; cancelar no llama a la API; doble envío.
* `dashboard`: abre el formulario, guardar actualiza el resumen, cancelar vuelve sin cambios; lugares y enlace visibles; mensaje sin lugares.
* `public-event-page`: lugares en orden, hora y enlace; sin lugares no aparece la sección.

## 8. Documentación

* `PROJECT_CONTEXT.md`: endpoint nuevo, columna `start_time` y enlace al mapa generado en el frontend.
* `PLAN.md`: marcar «Información, fecha y ubicación con enlace al mapa» y añadir las reglas de los lugares (hora opcional, máximo 10, no obligatorios para publicar, enlace automático).

## 9. Fuera de alcance

Mapa incrustado, enlace de mapa escrito por la pareja, arrastrar para ordenar, conservar ids de lugares, foto principal y diseño de la página pública.
