# WikiRace

Aplicacion web para jugar carreras entre articulos de Wikipedia: se elige un articulo de origen, un articulo objetivo y el jugador debe llegar al objetivo usando solo enlaces internos.

Stack principal:

- Astro SSR con `@astrojs/node`.
- React islands para la experiencia de juego.
- Tailwind CSS v4.
- Postgres + Drizzle ORM.
- Auth hibrida: invitado con alias o cuenta con email/password.
- Docker Compose para VPS.

## Estado del Producto

Incluido:

- Modo clasico.
- Busqueda server-side en Wikipedia.
- Cache server-side de paginas de Wikipedia.
- Sanitizacion de HTML antes de enviarlo al navegador.
- Validacion server-side de cada salto.
- Ranking por menos clicks y menor tiempo.
- Registro, login, logout y perfil.
- Migraciones Drizzle.
- Tests unitarios, integracion mockeada y E2E basico.

No incluido todavia:

- Retos diarios.
- Ranking por reto concreto.
- Recuperacion de password.
- Panel de administracion.
- Observabilidad externa.

## Documentacion

- [Despliegue en VPS](docs/VPS_DEPLOY.md)
- [Base de datos y migraciones](docs/DATABASE.md)
- [Variables de entorno](docs/ENVIRONMENT.md)
- [Runbook operativo](docs/RUNBOOK.md)
- [Arquitectura](docs/ARCHITECTURE.md)

## Desarrollo Local

Requisitos:

- Node `>=22.12`.
- pnpm.
- Docker, para levantar Postgres local.

Pasos:

```bash
cp .env.example .env
docker compose up -d db
pnpm install
pnpm db:migrate
pnpm dev
```

La app queda en `http://localhost:4321`.

## Scripts

```bash
pnpm dev          # servidor de desarrollo
pnpm build        # build SSR de produccion
pnpm preview      # preview local del build
pnpm astro:check  # validacion Astro/TypeScript
pnpm test         # unit + integration tests
pnpm e2e          # Playwright
pnpm db:generate  # generar migraciones desde schema Drizzle
pnpm db:migrate   # aplicar migraciones
```

## Flujo de Produccion Corto

En un VPS con Docker:

```bash
git clone git@github.com:Edgar-MP/wikirace.git
cd wikirace
cp .env.production.example .env
cp docker-compose.prod.example.yml docker-compose.prod.yml
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d --build app
```

Configura un reverse proxy como Caddy o Nginx hacia `127.0.0.1:4321`.

## Verificacion

Antes de desplegar:

```bash
pnpm test
pnpm astro:check
pnpm build
pnpm e2e
```

Redeploy test: documentacion actualizada para validar el despliegue automatico.
