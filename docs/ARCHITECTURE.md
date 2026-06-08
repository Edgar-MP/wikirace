# Arquitectura

## Vista General

WikiRace es una app Astro SSR. Las paginas principales se renderizan en servidor y la partida usa una React island para interactividad.

Flujo alto nivel:

```text
Browser
  -> Astro page/API
  -> Game service
  -> Postgres
  -> Wikipedia API, solo desde servidor
```

## Frontend

Paginas:

- `/`: creacion de carrera y ranking reciente.
- `/play/[runId]`: experiencia jugable con React.
- `/leaderboard`: ranking completo.
- `/login`, `/register`, `/profile`: cuenta opcional.

Componentes clave:

- `StartGame`: busca articulos, crea reto y run.
- `GameClient`: carga articulo actual, intercepta clicks en enlaces y navega.
- `LeaderboardTable`: tabla reutilizable de resultados.

## Backend

Endpoints:

- `GET /api/wiki/search`
- `POST /api/challenges`
- `POST /api/runs`
- `GET /api/runs/:id/article`
- `POST /api/runs/:id/navigate`
- `POST /api/runs/:id/abandon`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

La logica de negocio vive en `src/lib/game/service.ts`.

## Wikipedia

La app no llama a Wikipedia desde el navegador.

Responsabilidades server-side:

- Buscar titulos.
- Cargar HTML y links via MediaWiki API.
- Normalizar titulos.
- Filtrar namespaces no jugables.
- Sanitizar HTML.
- Convertir enlaces validos en enlaces jugables con `data-wiki-title`.
- Guardar cache en Postgres.

## Seguridad

- Las sesiones usan cookie `httpOnly`.
- Passwords con `argon2id` via `@node-rs/argon2`.
- El HTML de Wikipedia se sanitiza con `sanitize-html`.
- Cada salto se valida server-side contra los links del articulo actual.
- El cliente no puede avanzar a un articulo arbitrario si no estaba enlazado.

## Reglas de Juego

- Solo modo clasico.
- Origen y destino no pueden ser el mismo articulo.
- Solo cuentan enlaces internos a articulos.
- Los redirects/titulos se normalizan.
- Ranking: menos clicks, luego menor tiempo.
- Una run finalizada ya no acepta navegacion.

## Datos

Tablas principales:

- `users`
- `sessions`
- `challenges`
- `runs`
- `run_steps`
- `wiki_page_cache`

## Escalabilidad Inicial

El cuello de botella principal sera Wikipedia y la cache. Para crecer:

- Aumentar TTL o precalentar cache de retos frecuentes.
- Añadir rate limiting por IP.
- Añadir indices especificos para rankings por reto.
- Separar Postgres gestionado si el VPS queda corto.
