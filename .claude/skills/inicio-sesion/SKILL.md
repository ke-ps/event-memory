---
name: inicio-sesion
description: Prepara el ordenador y retoma el trabajo donde se dejó en la última sesión (posiblemente en otro ordenador). Usar cuando el usuario diga que empieza o abre sesión, vuelve a trabajar, ha cambiado de ordenador o pregunta por dónde iba.
---

# Inicio de sesión

El usuario trabaja en este proyecto desde varios ordenadores. Objetivo: sincronizar este equipo con GitHub y continuar exactamente donde se quedó.

## 1. Comprobar que el equipo está limpio

```bash
git status --short
git branch --show-current
```

Si hay cambios locales sin commit, **no los pises**: pregunta al usuario qué hacer con ellos antes de cambiar de rama o hacer pull.

## 2. Sincronizar

```bash
git fetch --prune origin
git for-each-ref --sort=-committerdate --count=5 --format='%(committerdate:relative) %(refname:short) %(subject)' refs/remotes/origin
```

La rama con el commit más reciente (excluyendo `origin/HEAD`) suele ser donde se trabajó por última vez.

- Actualiza `develop`: `git switch develop && git pull origin develop`.
- Si la última rama de trabajo existe en remoto y no está mergeada, cámbiate a ella (`git switch <rama>`, que crea la rama local siguiendo a la remota si no existe) y haz `git pull`.
- Si esa rama ya se mergeó (su PR está cerrado: `gh pr list --state merged --head <rama>`), quédate en `develop`.

Si `gh` no está en el PATH, prueba `"/c/Program Files/GitHub CLI/gh.exe"`.

## 3. Leer la nota de traspaso

```bash
git log -1 --format=%B <rama>
```

Busca el bloque `Traspaso de sesión:` en los últimos commits de la rama (`git log -5 --format='%h %s%n%b'`). Si no hay ninguno, deduce el estado a partir de los PR abiertos (`gh pr list`), los issues abiertos (`gh issue list`) y las casillas pendientes de `PLAN.md`.

## 4. Preparar el entorno

Ejecuta lo indicado en **Al retomar**. Además, compara con el último commit que había en este equipo antes del pull (o con `develop` si es una rama nueva) y detecta:

- Cambios en `backend/requirements.txt` → `python -m pip install -r requirements.txt` desde `backend` con `.venv` activado.
- Cambios en `frontend/package.json` o `package-lock.json` → `npm install` en `frontend`.
- Migraciones nuevas en `backend/migrations/versions/` → `python -m alembic upgrade head` desde `backend`.

Pide confirmación antes de instalar dependencias si el usuario no lo indicó en la nota de traspaso.

## 5. Verificar los archivos locales que no viajan por Git

Comprueba que existen (sin mostrar su contenido):

- `backend/.env` (compara los nombres de variables con `backend/.env.example`; avisa de las que falten).
- `backend/.venv`
- `frontend/node_modules`
- `frontend/src/environments/environment.local.ts`
- PostgreSQL accesible: `python -m alembic current` desde `backend` con `.venv` activado.

Si es la primera vez en este ordenador y falta algo, guía al usuario con `docs/local-development.md`. Recuerda que los datos de prueba de PostgreSQL no se sincronizan, solo el esquema (vía migraciones).

## 6. Resumir

Responde con un resumen corto:

- Rama actual y último commit.
- Qué se hizo en la sesión anterior.
- Siguiente paso propuesto.
- Cualquier cosa que falte en este equipo.

Después, pregunta si continuar con el siguiente paso.
