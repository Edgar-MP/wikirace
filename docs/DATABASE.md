# Base de Datos y Migraciones

WikiRace usa Postgres y Drizzle ORM.

## Conexion

La app lee `DATABASE_URL`.

Ejemplo local:

```text
postgres://wikirace:wikirace@localhost:5432/wikirace
```

Ejemplo dentro de Docker Compose:

```text
postgres://wikirace:password@db:5432/wikirace
```

## Tablas

- `users`: usuarios registrados.
- `sessions`: sesiones persistentes por cookie `httpOnly`.
- `challenges`: pares origen/objetivo por idioma.
- `runs`: carreras activas, completadas o abandonadas.
- `run_steps`: historial de saltos de cada carrera.
- `wiki_page_cache`: cache de HTML sanitizado y links validos por articulo.

## Migraciones

El schema vive en:

```text
src/lib/db/schema.ts
```

Las migraciones generadas viven en:

```text
drizzle/
```

Generar una migracion despues de cambiar el schema:

```bash
pnpm db:generate
```

Aplicar migraciones en local:

```bash
pnpm db:migrate
```

Aplicar migraciones en VPS:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

## Backup

Backup manual desde el VPS:

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

Si el shell no expande variables dentro del contenedor, usa los valores reales:

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U wikirace wikirace > backup-$(date +%F).sql
```

Restaurar backup:

```bash
cat backup-2026-06-08.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U wikirace wikirace
```

## Backup Programado

Ejemplo de cron diario a las 03:15:

```cron
15 3 * * * cd /opt/wikirace && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U wikirace wikirace > /opt/backups/wikirace-$(date +\%F).sql
```

Recomendado:

- Guardar backups fuera del VPS.
- Probar restauracion periodicamente.
- Cifrar backups si contienen datos de usuarios.

## Limpieza de Cache

`wiki_page_cache` tiene `expires_at`. La app ignora entradas caducadas y refresca bajo demanda.

Limpieza manual:

```sql
DELETE FROM wiki_page_cache WHERE expires_at < now();
```

Ejecutar desde Docker:

```bash
docker compose -f docker-compose.prod.yml exec db psql -U wikirace wikirace -c "DELETE FROM wiki_page_cache WHERE expires_at < now();"
```

## Notas de Seguridad

- No publiques el puerto `5432` en produccion.
- Usa password unico para Postgres.
- No subas `.env`.
- Ejecuta migraciones antes de arrancar una version que dependa de nuevas columnas.
