# Desarrollo local

## Requisitos

- Node.js 20.19.x, 22.12.x o 24.x.
- Python 3.10+.
- PostgreSQL mediante Docker Desktop o instalado localmente.

## PostgreSQL

Primero crea el archivo local de configuración desde `backend`:

```bash
cd backend
copy .env.example .env  # CMD
```

En macOS/Linux, usa `cp .env.example .env`. Edita `backend/.env` y asigna un valor local a `POSTGRES_PASSWORD`. Ese archivo lo usan tanto FastAPI como Docker Compose y está excluido de Git.

Desde la raíz del repositorio, inicia PostgreSQL:

```bash
docker compose up -d db
```

La configuración del contenedor está en `docker-compose.yml`. Usa credenciales solo para desarrollo local; no las reutilices en producción. El health check de la API no requiere que PostgreSQL esté en marcha.

### Alternativa: PostgreSQL instalado en Windows

Si usas una instalación local de PostgreSQL en lugar de Docker, crea el usuario y la base de datos que espera `backend/.env`. En pgAdmin, conéctate con el superusuario `postgres` y:

1. En **Login/Group Roles**, crea el rol `event_memory` con la contraseña de `POSTGRES_PASSWORD` y activa **Can login?**. No le concedas permisos de superusuario.
2. En **Databases**, crea la base de datos `event_memory` con `event_memory` como propietario.

Equivalente en `psql` como `postgres`:

```sql
CREATE ROLE event_memory WITH LOGIN PASSWORD 'contraseña-de-POSTGRES_PASSWORD';
CREATE DATABASE event_memory OWNER event_memory;
```

En `backend/.env` la contraseña va sin comillas. Evita caracteres no ASCII (como `ñ` o tildes), porque la consola de Windows puede codificarlos de forma distinta. Para comprobar la conexión, ejecuta `python -m alembic current` desde `backend` con el entorno virtual activado.

## Migraciones de base de datos

Con PostgreSQL en marcha y el entorno virtual del backend activado, aplica las migraciones desde la carpeta `backend`:

```cmd
python -m alembic upgrade head
```

Para generar una migración después de cambiar los modelos, desde `backend` ejecuta:

```cmd
python -m alembic revision --autogenerate -m "descripcion-del-cambio"
```

Revisa siempre el archivo generado antes de aplicarlo. No edites manualmente la estructura de una base de datos compartida o de producción.

## Backend

```bash
cd backend
python -m venv .venv
```

Activa el entorno virtual (`.venv\\Scripts\\activate.bat` en CMD, `.venv\\Scripts\\Activate.ps1` en PowerShell o `source .venv/bin/activate` en macOS/Linux) e instala las dependencias:

```bash
python -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` incluye las dependencias de la aplicación (`requirements.txt`) y las herramientas de desarrollo. En producción instala solo `requirements.txt`.

Arranca la API:

```bash
uvicorn app.main:app --reload
```

- Health check: `http://localhost:8000/api/v1/health`
- Documentación interactiva: `http://localhost:8000/docs`

### Tests y calidad del backend

Desde `backend`, con el entorno virtual activado:

```bash
python -m pytest              # tests
python -m ruff check .        # lint
python -m ruff format .       # formatear el código
```

Los tests no necesitan Firebase (se sustituye en cada test), pero sí una base de datos PostgreSQL de tests (ver la siguiente subsección). La configuración de pytest y Ruff está en `backend/pyproject.toml`. Los archivos de `migrations/versions` se excluyen del lint porque son migraciones generadas que no deben modificarse una vez aplicadas.

### Base de datos de tests

Los tests del backend se ejecutan contra una base de datos PostgreSQL propia, `event_memory_test` (el nombre de `POSTGRES_DB` con el sufijo `_test`). Créala una sola vez, propiedad del usuario `event_memory`, desde pgAdmin o con:

```sql
CREATE DATABASE event_memory_test OWNER event_memory;
```

Las migraciones se aplican solas al ejecutar los tests y cada test se revierte al terminar. En CI la base de datos se crea automáticamente.

### Probar el backend con el dashboard

Para usar el dashboard contra el backend local, arranca el backend con `GOOGLE_APPLICATION_CREDENTIALS` apuntando al JSON de la cuenta de servicio de Firebase (fuera del repositorio), por ejemplo en PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera\del\repositorio\firebase-admin.json"
uvicorn app.main:app --reload
```

## Frontend

### Firebase Authentication

1. Crea un proyecto en Firebase, añade una aplicación web y habilita el proveedor **Correo electrónico/Contraseña** en Authentication.
2. Copia la configuración de la aplicación web en `frontend/src/environments/environment.local.ts`. Desde CMD:

   ```cmd
   cd frontend\src\environments
   copy environment.local.example.ts environment.local.ts
   ```

   Completa los valores del archivo local con los datos de configuración web de Firebase. El archivo está excluido de Git.
3. Copia `backend/.env.example` a `backend/.env` si todavía no lo has hecho y configura `FIREBASE_PROJECT_ID` con el ID del mismo proyecto.
4. Crea una clave privada de cuenta de servicio desde la configuración del proyecto Firebase y guárdala fuera del repositorio. No la subas a Git. En la ventana CMD desde la que vayas a arrancar el backend, define la ruta:

   ```cmd
   set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\fuera\del\repositorio\firebase-admin.json
   ```

   La variable solo se mantiene en esa ventana. Firebase Admin usa las credenciales locales de Google para validar tokens.

La aplicación web usa Firebase Authentication para registro e inicio/cierre de sesión. Después de iniciar sesión, el backend verifica el token en `GET /api/v1/auth/me` y devuelve el identificador y el correo de la cuenta. Sin la configuración de Firebase, el frontend puede arrancar, pero no se podrán usar las operaciones de autenticación.

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. La configuración de desarrollo permite que el frontend se comunique con la API local.

### Tests y calidad del frontend

Desde `frontend`:

```bash
npm test                  # tests unitarios con Vitest (modo watch)
npm test -- --watch=false # ejecutar los tests una sola vez
npm run lint              # ESLint (angular-eslint)
npm run format            # formatear el código con Prettier
npm run format:check      # comprobar el formato sin modificar archivos
npm run extract-i18n      # extraer los textos traducibles a src/locale/messages.xlf
```

Todos los textos fijos de la interfaz se marcan para traducción con un id estable (`i18n="@@pantalla.elemento"` en las plantillas y `` $localize`:@@id:texto` `` en TypeScript). Después de añadir o cambiar textos, ejecuta `npm run extract-i18n` y guarda en el commit el `messages.xlf` actualizado.

Los tests se ejecutan en Node.js con jsdom, sin abrir un navegador. Los archivos de test usan el sufijo `.spec.ts` junto al código que prueban. La configuración de Prettier está en `package.json` y usa `endOfLine: auto` para aceptar tanto saltos de línea de Windows (CRLF) como de Linux (LF).
