# Runbook Operativo

Comandos habituales para mantener WikiRace en produccion.

## Ver Estado

```bash
docker compose -f docker-compose.prod.yml ps
```

## Ver Logs

App:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Base de datos:

```bash
docker compose -f docker-compose.prod.yml logs -f db
```

## Reiniciar App

```bash
docker compose -f docker-compose.prod.yml restart app
```

## Desplegar Nueva Version

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d app
```

## Comprobar que Responde

Desde el VPS:

```bash
curl -I http://127.0.0.1:4321
```

Desde fuera:

```bash
curl -I https://wikirace.example.com
```

## Fallo: La Home Muestra Error de Base de Datos

Posibles causas:

- `DATABASE_URL` incorrecta.
- Postgres no esta levantado.
- Migraciones no aplicadas.
- Password de Postgres no coincide con `.env`.

Diagnostico:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs db
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

## Fallo: No Busca en Wikipedia

Revisa:

- Salida de logs de `app`.
- Que el VPS tenga salida HTTPS.
- Que `WIKIRACE_CONTACT` este configurado.
- Que no haya bloqueo temporal por exceso de peticiones.

Comando:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## Fallo: Login o Registro no Funcionan

Revisa:

- `DATABASE_URL`.
- Migraciones aplicadas.
- Cookies bloqueadas por usar HTTP cuando esperas HTTPS.
- Reverse proxy enviando `X-Forwarded-Proto`.

## Rotar Secretos

Para cambiar `SESSION_SECRET`:

1. Edita `.env`.
2. Reinicia app.
3. Todos los usuarios tendran que iniciar sesion de nuevo si en el futuro se firma estado con ese secreto.

```bash
docker compose -f docker-compose.prod.yml restart app
```

## Limpieza de Artefactos Docker

```bash
docker image prune
docker builder prune
```

No ejecutes `docker volume prune` sin revisar, porque puede borrar el volumen de Postgres.
