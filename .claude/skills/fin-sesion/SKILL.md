---
name: fin-sesion
description: Guarda todo el trabajo en GitHub al terminar una sesión para poder continuar desde otro ordenador. Usar cuando el usuario diga que cierra sesión, se va, termina por hoy, cambia de ordenador o pide dejarlo todo guardado/listo.
---

# Fin de sesión

El usuario trabaja en este proyecto desde varios ordenadores. Objetivo: que **todo** quede en GitHub y que la próxima sesión sepa exactamente por dónde seguir.

Sigue las reglas de `AGENTS.md` (Conventional Commits, sin atribución de IA, nunca secretos).

## 1. Revisar el estado

```bash
git fetch --prune origin
git branch --show-current
git status --short
git stash list
git log --oneline @{u}..HEAD 2>/dev/null   # commits sin subir
```

Revisa también otras ramas locales con commits sin subir:

```bash
git for-each-ref --format='%(refname:short) %(upstream:short) %(upstream:track)' refs/heads
```

## 2. Revisar los cambios antes de guardarlos

- Lee el diff (`git diff`, `git diff --cached`) y los archivos sin seguimiento.
- **Nunca** incluyas `.env`, `environment.local.ts`, credenciales de Firebase/Supabase, `__pycache__`, `node_modules`, `dist` ni archivos temporales. Si aparece algo así sin ignorar, avisa al usuario en vez de subirlo.
- Si hay herramientas de validación configuradas (tests, lint, build), ejecútalas. Si fallan, **no bloquees el guardado**: el trabajo se guarda igualmente y el fallo se anota en el traspaso.
- Si hay un `git stash`, avisa: el stash no viaja a GitHub. Propón convertirlo en commit.

## 3. Guardar

- **Nunca hagas commit en `develop` ni en `main`.** Si hay cambios ahí, crea antes una rama con el prefijo adecuado (`feature/`, `fix/`, `docs/`, `refactor/`, `chore/`) y explícaselo al usuario.
- Si la tarea está terminada: commit normal en Conventional Commits.
- Si la tarea está a medias: commit de progreso:

  ```text
  chore(session): guardar progreso de <tarea>
  ```

  Las ramas se integran con Squash and merge, así que estos commits no ensucian `develop`.
- Si no hay cambios pero hay que dejar la nota de traspaso, usa `git commit --allow-empty` solo en ramas de trabajo.
- Sube: `git push -u origin <rama>`.

## 4. Nota de traspaso

El último commit de la rama de trabajo lleva en el cuerpo una nota de traspaso con este formato exacto:

```text
Traspaso de sesión:
- Rama: <rama>
- Tarea / issue: <descripción o #número>
- Hecho: <qué se completó en esta sesión>
- Siguiente paso: <qué hacer al retomar, lo más concreto posible>
- Pendiente de validar / problemas: <tests fallando, dudas, decisiones abiertas o "ninguno">
- Al retomar: <p. ej. "pip install -r requirements.txt", "alembic upgrade head", "npm install" o "nada">
```

Rellena **Al retomar** si en la sesión cambiaron `requirements.txt`, `package.json`/`package-lock.json` o se añadieron migraciones en `backend/migrations/versions/`.

Si el trabajo está en `develop` sin cambios (por ejemplo, tras mergear un PR), no hace falta commit: indica el siguiente paso del `PLAN.md` en el resumen al usuario.

## 5. Verificar y resumir

Comprueba que no queda nada sin subir:

```bash
git status --short
git log --oneline @{u}..HEAD
```

Ambos deben salir vacíos. Responde al usuario con un resumen corto: rama, último commit subido, siguiente paso, y cualquier archivo local que no viaja por Git y haya cambiado en esta sesión (por ejemplo, una variable nueva en `backend/.env` que también tendrá que añadir en el otro ordenador; actualiza `backend/.env.example` si procede).
