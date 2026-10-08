# Event Memory

Plataforma web para crear y compartir recuerdos digitales de eventos.

## Descripción

Event Memory es una plataforma orientada inicialmente a bodas que permite a las parejas crear una página web personalizada para compartir la información de su evento con sus invitados.

Los invitados podrán consultar la información de la boda, confirmar su asistencia y compartir fotografías del evento.

El proyecto está diseñado desde el inicio con una arquitectura escalable que permita incorporar otros tipos de eventos en el futuro, como nacimientos, bautizos, cumpleaños o comuniones.

## MVP

La primera versión del producto estará centrada exclusivamente en bodas.

### Parejas

* Registro e inicio de sesión.
* Creación y edición de una boda.
* Información básica del evento.
* Fotografía principal.
* Selección de plantilla.
* Gestión de invitados.
* Consulta de confirmaciones.
* Consulta de fotografías compartidas.

### Invitados

* Acceso mediante una URL pública.
* Consulta de la información de la boda.
* Consulta de la ubicación.
* Confirmación de asistencia.
* Indicación del número de asistentes.
* Indicación de alergias o restricciones alimentarias.
* Subida de fotografías.

## Tecnologías

### Frontend

* Angular
* TypeScript
* Angular Signals
* Angular Router
* Reactive Forms
* Angular Material

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* PostgreSQL

### Servicios externos

* Firebase Authentication
* Supabase Storage

## Arquitectura

El proyecto utiliza un monorepo con frontend y backend separados:

```text
event-memory/
├── frontend/
├── backend/
└── docs/
```

El backend seguirá una arquitectura por capas:

```text
Router
  ↓
Service
  ↓
Repository
  ↓
Database
```

El frontend seguirá una separación entre componentes, servicios y modelos, utilizando Angular Signals para la gestión del estado cuando sea apropiado.

## Estado del proyecto

🚧 En desarrollo.

Actualmente se encuentra en la fase inicial de configuración del proyecto.

## Roadmap

Consulta [`PLAN.md`](./PLAN.md) para conocer las fases previstas del proyecto.

## Licencia

Pendiente de definir.
