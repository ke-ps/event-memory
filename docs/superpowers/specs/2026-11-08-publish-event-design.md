# Diseño: publicar la boda con una URL propia

**Fecha:** 2026-11-08
**Fase:** 4 — Página pública («URL pública editable y única» y «Publicar y despublicar el evento»)
**Issue:** #30
**Estado:** aprobado en conversación, pendiente de revisión del documento

## 1. Objetivo

Que la pareja elija la URL de su boda, la publique para que cualquiera con el enlace la vea en `/e/<identificador>`, y la despublique cuando quiera, sin perder datos. La página pública es mínima y sin diseño: la sustituirá la plantilla de boda.

## 2. Decisiones

| # | Decisión | Motivo |
| --- | --- | --- |
| D1 | Se confirman las propuestas de `PLAN.md`: URL `/e/<identificador>`, la boda empieza en borrador y solo es visible al publicarla, y la fecha es obligatoria para publicar. | Decisión del propietario. |
| D2 | La URL solo se puede cambiar en borrador. Publicada, queda fija; para cambiarla hay que despublicar. | En borrador nadie tiene el enlace, así que cambiarla no rompe nada; publicada, cambiarla rompería invitaciones, mensajes y QR ya repartidos. |
| D3 | Con la boda publicada se pueden cambiar título, nombres, fecha y hora, pero no vaciar la fecha. | Una boda puede cambiar de fecha por causas mayores y los invitados deben verla en el mismo enlace; una boda publicada siempre tiene fecha (D1). |
| D4 | Despublicar solo cambia el estado; no borra ningún dato y no pide confirmación. | Es reversible con un clic y el cambio se ve al instante en el panel. |
| D5 | La URL se edita en el formulario «Editar»; publicar y despublicar son acciones propias (`POST`). | La URL es un dato más de la boda; publicar es una acción con condiciones y errores propios. |
| D6 | La API pública vive bajo `/api/v1/public/...` y responde lo mismo (404) para una boda en borrador y una inexistente. | Evita conflictos con `/events/me` y no revela qué bodas existen. |
| D7 | Página pública mínima en `/e/:slug`, con «Ver página pública» y «Copiar enlace» en el panel. | Permite probar el flujo completo como la pareja; el enlace y la copia se mantienen con la plantilla. |
| D8 | Sin diseño visual. | El diseño parte del prompt del propietario (plantilla de boda). |

## 3. Reglas de la URL (`slug`)

* Formato: `^[a-z0-9]+(-[a-z0-9]+)*$` (el mismo que la restricción `slug_format` de la base de datos), entre 3 y 80 caracteres.
* Antes de validar, el servidor recorta espacios de los extremos y pasa a minúsculas (`Ana-y-Luis` → `ana-y-luis`).
* Única entre todas las bodas. La propia URL actual siempre es válida.
* Sin palabras reservadas: la página vive bajo `/e/` y la API bajo `/public/`, así que no puede chocar con otras rutas.

## 4. API

### `PUT /api/v1/events/me` (cambio)

El cuerpo incluye `slug` (obligatorio, reglas de §3). Nuevos errores:

| Caso | HTTP | `code` | `errors` |
| --- | --- | --- | --- |
| Formato o longitud inválidos | 422 | `validation_error` | `[{field: "slug", code: <tipo de Pydantic>}]` |
| URL usada por otra boda | 409 | `slug_taken` | `[{field: "slug", code: "slug_taken"}]` |
| Boda publicada y URL distinta de la actual | 409 | `slug_locked` | `[{field: "slug", code: "slug_locked"}]` |
| Boda publicada y `event_date` vacía | 422 | `event_date_required` | `[{field: "event_date", code: "event_date_required"}]` |

Si dos peticiones eligen la misma URL a la vez, la restricción única `uq_events_slug` decide y la perdedora recibe 409 `slug_taken`.

### `POST /api/v1/events/me/publish` (autenticado)

Respuesta `200`: `EventRead` con `status: "published"`. Si ya estaba publicada, no cambia nada y responde `200`. Sin fecha: 422 `event_date_required` (con `errors` en `event_date`). Sin boda: 404 `event_not_found`.

### `POST /api/v1/events/me/unpublish` (autenticado)

Respuesta `200`: `EventRead` con `status: "draft"`. Si ya estaba en borrador, responde `200`. Sin boda: 404 `event_not_found`.

### `GET /api/v1/public/events/{slug}` (sin autenticación)

Respuesta `200`: `PublicEventRead`:

```json
{
  "event_type": "wedding", "title": "Ana y Luis", "slug": "ana-y-luis",
  "event_date": "2027-06-12", "start_time": "18:30:00", "timezone": "Europe/Madrid",
  "details": { "partner_one_name": "Ana", "partner_two_name": "Luis" },
  "locations": [{ "label": "…", "venue_name": "…", "address": "…", "position": 1 }]
}
```

No incluye `id`, `owner_firebase_uid`, `status`, `main_photo_path`, `created_at` ni `updated_at`, ni los `id` de los lugares. Si la boda no existe o está en borrador: 404 `event_not_found`. La búsqueda por `slug` no distingue mayúsculas (se pasa a minúsculas).

## 5. Backend

| Archivo | Cambio |
| --- | --- |
| `app/schemas/events.py` | `slug` en `EventUpdate` (recorte, minúsculas, patrón, 3–80). `PublicEventRead` y `PublicLocationRead`. |
| `app/services/events.py` | `update_own_event` aplica D2, D3 y la unicidad (409 `slug_taken`, también si salta `uq_events_slug` al hacer `commit`). `publish_own_event`, `unpublish_own_event`, `get_published_event(session, slug)`. |
| `app/repositories/events.py` | `get_by_slug(session, slug)`; `slug_exists` admite excluir el propio evento si hace falta. |
| `app/api/routes/events.py` | `POST /events/me/publish` y `POST /events/me/unpublish`. |
| `app/api/routes/public.py` (nuevo) | `GET /public/events/{slug}`, sin `get_current_user`; registrado en `app/api/router.py` con prefijo `/public`. |

## 6. Frontend

| Archivo | Cambio |
| --- | --- |
| `app/events/event.models.ts` | `slug` en `EventUpdateRequest`; tipo `PublicEvent`. |
| `app/events/event-api.service.ts` | `publish()` y `unpublish()` → `Promise<EventRead>`. |
| `app/public/public-event-api.service.ts` (nuevo) | `get(slug)` → `Promise<PublicEvent \| null>` (`null` en 404), sin token. |
| `app/public/public-event-page.component.ts` (nuevo) | Ruta `e/:slug` sin guard. Estados: cargando, visible (título y fecha con hora como en el resumen), no disponible («Esta página no está disponible.»), error (mensaje + «Reintentar»). |
| `app/app.routes.ts` | Ruta `e/:slug` antes de `**`. |
| `app/events/event-publication.component.ts` (nuevo) | Dentro del resumen. Borrador: «Borrador» + «Publicar» (desactivado sin fecha, con la pista «Añade la fecha para poder publicar»). Publicada: «Publicada», el enlace completo, «Ver página pública» (nueva pestaña), «Copiar enlace» («Enlace copiado» o aviso de copiarlo a mano si el navegador lo bloquea) y «Despublicar». Botones desactivados mientras se guarda; error general con `apiErrorMessage`. Emite `changed(EventRead)`. El enlace es `window.location.origin + '/e/' + slug`. |
| `app/events/event-summary.component.ts` | El estado pasa al componente de publicación; reenvía `changed`. |
| `app/events/event-edit-form.component.ts` | Campo «Dirección web» con prefijo `/e/`, relleno con el `slug`; editable en borrador (pista «Así será el enlace de vuestra boda») y desactivado si está publicada (pista «Para cambiarla, despublica la boda»). Errores de `slug` bajo su campo. |
| `app/dashboard/dashboard-page.component.ts` | `changed` del resumen actualiza el evento. |
| `app/core/api-error-messages.ts` | `apiFieldErrors` lee `errors` de cualquier respuesta, no solo de `validation_error`. Mensajes nuevos: `slug_taken` («Esa dirección ya está en uso.»), `slug_locked`, `event_date_required` y formato de URL inválido (`string_pattern_mismatch`). |

Textos con ids `events.publication.*`, `events.edit.slug.*`, `public.*` y `errors.*`; se regenera `messages.xlf`.

## 7. Tests

### Backend

* Servicio y API de edición: cambiar la URL en borrador; recorte y minúsculas; formato inválido (422 en `slug`); URL de otra boda (409 `slug_taken`); misma URL publicada (200); URL distinta publicada (409 `slug_locked`); vaciar la fecha publicada (422 `event_date_required`); cambiar la fecha publicada (200).
* Publicar: sin fecha (422), con fecha (200 `published`), repetido (200), sin boda (404). Despublicar: (200 `draft`), repetido (200), conserva los datos.
* Pública: publicada (200, sin campos internos, sin token), borrador (404), inexistente (404), `slug` en mayúsculas (200).

### Frontend

* `public-event-api.service`: URL, sin cabecera `Authorization`, `null` en 404.
* `public-event-page`: cuatro estados y «Reintentar».
* `event-publication`: publicar, despublicar, botón desactivado sin fecha, copiar enlace (éxito y fallo), enlace correcto, error de API.
* `event-edit-form`: campo URL relleno, editable en borrador, desactivado publicada, error `slug_taken` bajo el campo, `slug` enviado.
* `api-error-messages`: errores por campo con un código distinto de `validation_error`.
* `dashboard`: el resumen refleja el cambio de estado.

## 8. Documentación

* `PLAN.md`: quitar «(propuesta)» de las tres reglas confirmadas; añadir «Una boda publicada siempre tiene fecha y su URL queda fija; para cambiar la URL hay que despublicarla»; añadir como decisión pendiente si se reservan las URLs de bodas publicadas que se borran (para que otra boda no ocupe un enlace ya repartido); marcar «URL pública editable y única» y «Publicar y despublicar el evento».
* `PROJECT_CONTEXT.md`: endpoints nuevos, API pública y códigos de error nuevos.

## 9. Fuera de alcance

Plantilla y diseño de la página pública, ubicación con mapa, foto principal, redirección de URLs antiguas, reserva de URLs de bodas borradas y SEO o vista previa al compartir el enlace.
