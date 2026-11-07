# Plan de producto

Este documento recoge **qué** se construye y **por qué**: la visión, las decisiones de producto y el roadmap por fases. Las decisiones técnicas (cómo se construye) están en `PROJECT_CONTEXT.md`. Cada tarea del roadmap se convierte en un GitHub Issue antes de empezarla.

Las decisiones marcadas como **(propuesta)** tienen un valor por defecto pendiente de confirmar.

---

## 1. Visión

Event Memory es una plataforma para crear la página web de un evento y compartirla con los invitados: información del evento, confirmación de asistencia y fotografías compartidas.

El primer producto es un **MVP para bodas**. La plataforma está pensada para admitir después otros tipos de evento (bautizos, cumpleaños, comuniones, nacimientos, graduaciones…) sin rediseñar su base.

---

## 2. Usuarios

| Usuario | Descripción | Cuenta |
| --- | --- | --- |
| **Organizador** | Crea y gestiona el evento. En una boda, la pareja. | Sí (Firebase Authentication) |
| **Invitado** | Consulta la página, confirma su asistencia y sube fotos. | No |
| **Profesional** (futuro) | Wedding planners o fotógrafos que gestionan eventos de varios clientes. | Sí |

---

## 3. Conceptos

* **Evento:** la página y los datos de una celebración. Tiene datos comunes a todos los tipos (fecha, zona horaria, ubicación, URL pública, estado) y datos propios de su tipo (en una boda, los nombres de la pareja).
* **Tipo de evento:** boda, bautizo, cumpleaños… Determina los datos propios, la plantilla visual y los módulos disponibles.
* **Núcleo:** funcionalidades comunes a todos los tipos: página pública, ubicación, invitados y confirmación de asistencia, y galería de fotos.
* **Módulo:** funcionalidad opcional que el organizador activa en su evento (agenda, lista de regalos…). Cada tipo de evento define qué módulos ofrece.
* **Invitado:** persona dada de alta por el organizador en la lista de invitados de su evento.
* **Confirmación:** respuesta de un invitado sobre su asistencia.

---

## 4. Decisiones de producto

### Cuentas y eventos

* Una cuenta puede tener **varios eventos** en el modelo de datos, pero en el MVP solo puede tener **un evento**. La regla se aplica en el código, no en la base de datos, para poder relajarla sin migraciones (por ejemplo, para profesionales).
* En el MVP el único tipo es **boda**. El formulario de creación no muestra selector de tipo; la API recibe el tipo y solo acepta `wedding`. **(propuesta)**
* El modelo separa los datos comunes de los datos propios de cada tipo, para que añadir un tipo nuevo no obligue a rediseñar la tabla de eventos.

### Página pública

* Cada evento tiene una URL pública con un identificador legible, por ejemplo `/e/ana-y-luis`. Se genera a partir de los nombres, la pareja puede editarla y es única. **(propuesta)**
* El evento empieza en **borrador** y solo es visible públicamente cuando el organizador lo **publica**. **(propuesta)**
* La fecha del evento es obligatoria para publicar. **(propuesta)**
* La página es abierta: cualquiera con el enlace puede ver la información.

### Invitados y confirmación de asistencia

* El organizador gestiona una **lista de invitados**.
* Cada invitado puede confirmar mediante su **enlace personal** o **buscándose por nombre completo** en la página pública. La búsqueda devuelve como máximo una coincidencia y no permite listar a los invitados.
* La confirmación tiene campos fijos: asiste sí/no, número de personas, alergias o restricciones alimentarias y un comentario opcional.
* Las alergias son **datos de salud** según el RGPD: se piden solo para el menú, con consentimiento explícito, y únicamente las ve el organizador.
* El panel muestra quién ha confirmado, quién no asiste y quién no ha respondido.

### Galería de fotos

* Los invitados suben fotos desde la página pública o mediante un **código QR**.
* La galería está **oculta para los invitados por defecto**: solo el organizador ve las fotos hasta que activa «galería visible para invitados».
* El organizador puede ocultar y borrar fotos, de una en una o con **selección múltiple** en una vista de cuadrícula.
* Los invitados pueden **reportar** una foto: queda oculta hasta que el organizador decida.
* Hay límites de tamaño por foto y de número de fotos por invitado. Valores iniciales: 20 MB por foto y 100 fotos por invitado. **(propuesta)**
* El organizador puede **descargar todas las fotos en un ZIP** en cualquier momento.

### Caducidad del evento

* El evento caduca **12 meses después de su fecha**. Al caducar se borran la página, los datos de invitados y las fotos.
* El organizador recibe avisos **por email y en el panel** 30 días y 7 días antes de la caducidad, con un enlace para descargar las fotos.
* El email de aviso de caducidad es el único email automático del MVP.

### Módulos

| Módulo | Alcance |
| --- | --- |
| Agenda del día | MVP |
| Cuenta atrás | MVP |
| Código de vestimenta | MVP |
| Lista de regalos o número de cuenta | MVP |
| Alojamiento y transporte | MVP |
| Distribución de mesas | Después del MVP |
| Preguntas personalizadas en la confirmación | Después del MVP |
| Libro de firmas | Descartado |

En el MVP los módulos son secciones de información que el organizador activa y rellena. No se construye un sistema genérico de módulos hasta que haga falta.

### Idioma

* La aplicación está en **español**, pero preparada para traducirse: los textos fijos se marcan para traducción desde el principio.
* El contenido que escribe el organizador se muestra tal cual, en el idioma en que lo escriba.
* Fechas, horas y formatos usan la configuración regional; la agenda usa la zona horaria del evento.

---

## 5. Roadmap

### Fase 0 — Configuración del proyecto ✅

**Objetivo:** preparar el repositorio, la documentación y las bases del proyecto.

* [x] Configurar estructura del monorepo.
* [x] Configurar Git y GitHub.
* [x] Definir flujo de ramas.
* [x] Crear documentación inicial.
* [x] Definir convenciones de desarrollo.

### Fase 1 — Base técnica ✅

**Objetivo:** crear y conectar las aplicaciones frontend y backend.

* [x] Inicializar aplicación Angular.
* [x] Inicializar aplicación FastAPI.
* [x] Configurar PostgreSQL para desarrollo local.
* [x] Configurar variables de entorno.
* [x] Definir estructura inicial del backend.
* [x] Definir estructura inicial del frontend.
* [x] Crear health check del backend.
* [x] Documentar cómo ejecutar el proyecto localmente.
* [x] Configurar tests y lint del backend (pytest, Ruff).
* [x] Configurar tests y lint del frontend (Vitest, ESLint, Prettier).
* [x] Configurar integración continua (GitHub Actions).

### Fase 2 — Autenticación ✅

**Objetivo:** permitir que las parejas puedan gestionar sus eventos mediante una cuenta.

* [x] Configurar Firebase Authentication.
* [x] Registro.
* [x] Inicio de sesión.
* [x] Cierre de sesión.
* [x] Protección de rutas.
* [x] Integración del usuario autenticado con el backend.

### Fase 3 — Gestión del evento

**Objetivo:** el organizador crea y gestiona su boda desde el panel.

* [x] Diseñar el modelo inicial de eventos.
* [x] Revisar el modelo: datos comunes y datos propios del tipo, zona horaria, URL pública y estado borrador/publicado.
* [x] Respuestas de error de la API con códigos estables (base para la traducción).
* [x] Preparar el frontend para traducción (i18n de Angular, configuración regional `es`).
* [x] Crear evento (API y formulario en el panel).
* [x] Consultar el evento propio.
* [x] Editar el evento.
* [ ] Eliminar el evento (borrado definitivo con confirmación).

**Terminado cuando:** un organizador autenticado puede crear, ver, editar y eliminar su boda desde el panel, no puede crear un segundo evento y no puede acceder a eventos de otros usuarios.

### Fase 4 — Página pública

**Objetivo:** los invitados ven la página de la boda.

* [ ] URL pública editable y única.
* [ ] Publicar y despublicar el evento.
* [ ] Primera plantilla de boda (diseño a partir del prompt de diseño del propietario del proyecto).
* [ ] Información, fecha y ubicación con enlace al mapa.
* [ ] Configurar Supabase Storage y subir la foto principal.
* [ ] Diseño responsive.

**Terminado cuando:** un evento publicado se ve correctamente en móvil y escritorio a través de su URL, y un borrador no es accesible públicamente.

### Fase 5 — Invitados y confirmación de asistencia

**Objetivo:** el organizador gestiona sus invitados y recibe confirmaciones.

* [ ] Modelo de invitados y confirmaciones.
* [ ] Alta, edición y baja de invitados.
* [ ] Enlace personal por invitado.
* [ ] Búsqueda por nombre completo en la página pública.
* [ ] Formulario de confirmación con consentimiento para alergias.
* [ ] Resumen de confirmaciones en el panel.

**Terminado cuando:** un invitado puede confirmar por su enlace o buscándose, y el organizador ve el estado de todos sus invitados.

### Fase 6 — Galería de fotos

**Objetivo:** los invitados comparten fotos y el organizador las controla.

* [ ] Modelo de fotos de la galería.
* [ ] Subida de fotos por invitados, con compresión y miniaturas.
* [ ] Acceso mediante código QR.
* [ ] Límites de tamaño y número de fotos.
* [ ] Visibilidad de la galería para invitados.
* [ ] Cuadrícula con selección múltiple para ocultar y borrar.
* [ ] Reportar fotos.
* [ ] Descarga de todas las fotos en ZIP.

**Terminado cuando:** los invitados pueden subir fotos, el organizador controla qué se ve y puede descargarlas todas.

### Fase 7 — Módulos de información

**Objetivo:** completar la página con la información que necesitan los invitados.

* [ ] Activar y desactivar módulos por evento.
* [ ] Agenda del día.
* [ ] Cuenta atrás.
* [ ] Código de vestimenta.
* [ ] Lista de regalos o número de cuenta.
* [ ] Alojamiento y transporte.

**Terminado cuando:** el organizador puede activar, rellenar y ocultar cada módulo, y se muestran en la página pública.

### Fase 8 — Caducidad y avisos

**Objetivo:** cumplir la política de caducidad sin que el organizador pierda sus recuerdos.

* [ ] Elegir e integrar un servicio de envío de emails transaccionales.
* [ ] Tarea programada que detecta eventos próximos a caducar.
* [ ] Avisos por email y en el panel a 30 y 7 días.
* [ ] Borrado de eventos caducados, incluidas sus fotos.

**Terminado cuando:** un evento recibe los dos avisos y se borra por completo al caducar.

### Fase 9 — Lanzamiento del MVP

**Objetivo:** convertir el producto en algo presentable y desplegado.

* [ ] Landing page.
* [ ] Política de privacidad, aviso legal y cookies.
* [ ] SEO básico.
* [ ] Gestión de errores y estados de carga revisados.
* [ ] Revisión responsive y de accesibilidad.
* [ ] Despliegue en producción y monitorización de errores.

**Terminado cuando:** una pareja real puede registrarse, crear su boda, compartirla y usarla de principio a fin en producción.

---

## 6. Fuera del MVP

Se evaluarán después de validar el MVP:

* Otros tipos de evento y selector de tipo.
* Distribución de mesas.
* Preguntas personalizadas en la confirmación.
* Detección automática de fotos inapropiadas.
* Traducciones a otros idiomas.
* Pagos y suscripciones (por ejemplo, ampliar la conservación del evento).
* Cuentas para profesionales con varios eventos.
* Emails automáticos distintos del aviso de caducidad.
* Dominios personalizados.
* Aplicación móvil.
* Herramientas para fotógrafos.
* Marketplace.

### Descartado

* Libro de firmas.
