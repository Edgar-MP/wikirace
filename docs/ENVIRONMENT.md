# Variables de Entorno

## Variables de App

### `DATABASE_URL`

Obligatoria. URL de conexion a Postgres.

Local:

```text
postgres://wikirace:wikirace@localhost:5432/wikirace
```

Docker Compose:

```text
postgres://wikirace:password@db:5432/wikirace
```

### `SESSION_SECRET`

Obligatoria en produccion. Se usa como secreto general de sesion/configuracion.

Generar valor:

```bash
openssl rand -base64 48
```

No reutilices este secreto en otros proyectos.

### `WIKIRACE_PUBLIC_URL`

URL publica de la app.

Ejemplo:

```text
https://wikirace.example.com
```

Se usa para identificar la aplicacion en llamadas a Wikipedia.

### `WIKIRACE_CONTACT`

Email de contacto tecnico. Se incluye en el user agent hacia Wikimedia.

Ejemplo:

```text
admin@example.com
```

## Variables de Docker Compose Produccion

### `POSTGRES_DB`

Nombre de la base de datos.

### `POSTGRES_USER`

Usuario de Postgres.

### `POSTGRES_PASSWORD`

Password del usuario de Postgres. Debe ser largo y unico.

## Archivos

- `.env.example`: valores para desarrollo local.
- `.env.production.example`: plantilla para VPS.
- `.env`: valores reales. No debe commitearse.

## Checklist Produccion

- `SESSION_SECRET` cambiado.
- `POSTGRES_PASSWORD` cambiado.
- `WIKIRACE_PUBLIC_URL` apunta al dominio real.
- `WIKIRACE_CONTACT` apunta a un email real.
- `.env` no esta en git.
- Postgres no expone puerto publico.
