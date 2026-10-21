# Project Plan

## Objetivo

Construir una plataforma web escalable que permita crear páginas digitales para eventos y compartir información, confirmaciones y recuerdos con los asistentes.

El primer producto desarrollado será un MVP orientado a bodas.

---

# Fases

## Fase 0 — Project Setup

**Objetivo:** preparar el repositorio, la documentación y las bases del proyecto.

* [x] Configurar estructura del monorepo.
* [x] Configurar Git y GitHub.
* [x] Definir flujo de ramas.
* [x] Crear documentación inicial.
* [x] Definir convenciones de desarrollo.

---

## Fase 1 — Technical Foundation

**Objetivo:** crear y conectar las aplicaciones frontend y backend.

* [x] Inicializar aplicación Angular.
* [x] Inicializar aplicación FastAPI.
* [x] Configurar PostgreSQL para desarrollo local.
* [x] Configurar variables de entorno.
* [x] Definir estructura inicial del backend.
* [x] Definir estructura inicial del frontend.
* [x] Crear health check del backend.
* [x] Documentar cómo ejecutar el proyecto localmente.

---

## Fase 2 — Authentication

**Objetivo:** permitir que las parejas puedan gestionar sus eventos mediante una cuenta.

* [ ] Configurar Firebase Authentication.
* [ ] Registro.
* [ ] Inicio de sesión.
* [ ] Cierre de sesión.
* [ ] Protección de rutas.
* [ ] Integración del usuario autenticado con el backend.

---

## Fase 3 — Event Management

**Objetivo:** permitir a una pareja crear y gestionar una boda.

* [ ] Diseñar modelo de datos de eventos.
* [ ] Crear evento.
* [ ] Consultar evento.
* [ ] Editar evento.
* [ ] Desactivar evento.
* [ ] Gestionar información básica de la boda.
* [ ] Añadir fotografía principal.

---

## Fase 4 — Public Event

**Objetivo:** crear la página pública que podrán consultar los invitados.

* [ ] Definir URL pública del evento.
* [ ] Crear primera plantilla.
* [ ] Mostrar información de la boda.
* [ ] Mostrar fecha.
* [ ] Mostrar ubicación.
* [ ] Mostrar fotografía principal.
* [ ] Crear diseño responsive.

---

## Fase 5 — Guests & RSVP

**Objetivo:** permitir gestionar invitados y confirmaciones.

* [ ] Diseñar modelo de invitados.
* [ ] Crear invitados.
* [ ] Editar invitados.
* [ ] Eliminar/desactivar invitados.
* [ ] Crear formulario de confirmación.
* [ ] Registrar asistencia.
* [ ] Registrar número de asistentes.
* [ ] Registrar alergias o restricciones alimentarias.
* [ ] Mostrar confirmaciones en el panel.

---

## Fase 6 — Photo Gallery

**Objetivo:** permitir compartir fotografías del evento.

* [ ] Configurar Supabase Storage.
* [ ] Diseñar modelo de fotografías.
* [ ] Subir fotografías.
* [ ] Asociar fotografías al evento.
* [ ] Crear galería.
* [ ] Permitir subida por invitados.
* [ ] Crear acceso mediante QR.
* [ ] Gestionar fotografías desde el panel.

---

## Fase 7 — Dashboard

**Objetivo:** crear un panel central para gestionar la boda.

* [ ] Dashboard principal.
* [ ] Resumen del evento.
* [ ] Gestión de información.
* [ ] Gestión de invitados.
* [ ] Gestión de fotografías.
* [ ] Acceso a la página pública.

---

## Fase 8 — Product MVP

**Objetivo:** convertir el proyecto técnico en un producto presentable.

* [ ] Crear landing page.
* [ ] Crear página de precios.
* [ ] Mejorar plantillas.
* [ ] Mejorar personalización.
* [ ] SEO básico.
* [ ] Optimización responsive.
* [ ] Gestión de errores.
* [ ] Estados de carga.
* [ ] Validaciones.
* [ ] Preparación para despliegue.

---

# Fuera del MVP

Estas funcionalidades no forman parte de la primera versión:

* Pagos.
* Suscripciones.
* Dominios personalizados.
* Aplicación móvil.
* Emails automáticos.
* IA.
* Marketplace.
* Otros tipos de eventos.

Podrán evaluarse posteriormente según las necesidades del producto.

---

# Futuro

Una vez validado el MVP de bodas, se podrá estudiar la incorporación de:

* Nacimientos.
* Bautizos.
* Cumpleaños.
* Comuniones.
* Graduaciones.
* Otros eventos.
* Herramientas específicas para fotógrafos.
