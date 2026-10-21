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

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. La configuración de desarrollo permite que el frontend se comunique con la API local.
