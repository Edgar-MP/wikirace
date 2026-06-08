# Despliegue en VPS

Esta guia asume un VPS Linux limpio, un dominio apuntando al servidor y Docker instalado.

## 1. Preparar el Servidor

Ejemplo para Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Cierra sesion y vuelve a entrar para que el grupo `docker` aplique.

Firewall recomendado:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

No expongas Postgres al exterior. El compose de produccion solo publica la app en `127.0.0.1:4321`.

## 2. Clonar el Proyecto

```bash
git clone git@github.com:Edgar-MP/wikirace.git
cd wikirace
```

Si usas HTTPS:

```bash
git clone https://github.com/Edgar-MP/wikirace.git
cd wikirace
```

## 3. Crear Configuracion de Produccion

```bash
cp .env.production.example .env
cp docker-compose.prod.example.yml docker-compose.prod.yml
```

Edita `.env`:

```bash
nano .env
```

Valores obligatorios:

- `POSTGRES_PASSWORD`: password largo y unico.
- `SESSION_SECRET`: secreto largo. Usa al menos 32 bytes aleatorios.
- `WIKIRACE_PUBLIC_URL`: URL publica real, por ejemplo `https://wikirace.tudominio.com`.
- `WIKIRACE_CONTACT`: email de contacto para identificar la app ante Wikimedia.

Generar un secreto:

```bash
openssl rand -base64 48
```

## 4. Construir Imagenes

```bash
docker compose -f docker-compose.prod.yml build
```

## 5. Levantar Base de Datos

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml ps
```

Espera a que el healthcheck de Postgres este en estado healthy.

## 6. Ejecutar Migraciones

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

Este comando aplica las migraciones Drizzle dentro de la red Docker usando `DATABASE_URL` hacia el servicio `db`.

## 7. Arrancar la App

```bash
docker compose -f docker-compose.prod.yml up -d app
docker compose -f docker-compose.prod.yml ps
```

La app escuchara en el host local del VPS:

```text
127.0.0.1:4321
```

## 8. Reverse Proxy con Caddy

Instala Caddy o usa el paquete de tu distribucion. Ejemplo de `Caddyfile`:

```caddyfile
wikirace.example.com {
  reverse_proxy 127.0.0.1:4321
}
```

Recarga Caddy:

```bash
sudo systemctl reload caddy
```

Caddy gestiona TLS automaticamente si el dominio apunta al VPS.

## 9. Reverse Proxy con Nginx

Ejemplo de server block:

```nginx
server {
  listen 80;
  server_name wikirace.example.com;

  location / {
    proxy_pass http://127.0.0.1:4321;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Para HTTPS, usa Certbot o tu estrategia habitual de TLS.

## 10. Actualizar Produccion

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d app
```

Comprueba logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## 11. Rollback Basico

Si una version falla:

```bash
git log --oneline
git checkout <commit-anterior>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d app
```

Importante: no hagas rollback de codigo despues de aplicar una migracion irreversible sin revisar la compatibilidad de DB.
