# Desarrollo local

## Requisitos

- Node.js 20.19.x, 22.12.x o 24.x.
- Python 3.10+.
- Docker Desktop (para PostgreSQL).

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

## Backend

```bash
cd backend
python -m venv .venv
```

Activa el entorno virtual (`.venv\\Scripts\\activate.bat` en CMD, `.venv\\Scripts\\Activate.ps1` en PowerShell o `source .venv/bin/activate` en macOS/Linux) e instala las dependencias:

```bash
python -m pip install -r requirements.txt
```

Arranca la API:

```bash
uvicorn app.main:app --reload
```

- Health check: `http://localhost:8000/api/v1/health`
- Documentación interactiva: `http://localhost:8000/docs`

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
