# Environment variables

This document describes how to use environment variables with Olo (olo-be and the combined Docker image). The frontend (olo-ui) uses a fixed API base `/api/v1` and does not require env vars for normal use.

---

## Quick reference (olo-be / combined image)

| Variable | Default | Description |
|----------|---------|-------------|
| **SERVER_PORT** | `8082` | Port the backend listens on (inside the container it must stay 8082 when using the default nginx proxy). |
| **SPRING_DATA_REDIS_HOST** | `localhost` | Redis server host (e.g. `localhost`, `redis`, or your Redis hostname). |
| **SPRING_DATA_REDIS_PORT** | `6379` | Redis server port. |
| **OLO_TENANT_IDS** | `olo:tenants` | Redis key where the tenant list is stored. Set via env or `olo.tenant.ids` in Spring. |
| **SPRING_AUTOCONFIGURE_EXCLUDE** | — | Optional. Set to `org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration` to disable Redis and use in-memory tenant store (data lost on restart). |
| **SPRING_DATA_REDIS_PASSWORD** | — | Optional. Redis password when your Redis server requires auth. |

Spring Boot maps environment variables to properties: uppercase with underscores become lowercase with dots (e.g. `OLO_TENANT_IDS` → `olo.tenant.ids`, `SPRING_DATA_REDIS_HOST` → `spring.data.redis.host`).

---

## How to set environment variables

### 1. Local development (backend only)

- **Option A — Export in the shell before running:**
  ```bash
  export SPRING_DATA_REDIS_HOST=localhost
  export SPRING_DATA_REDIS_PORT=6379
  export OLO_TENANT_IDS=olo:tenants
  cd olo-be && ./gradlew bootRun
  ```
- **Option B — Use a `.env` file (not loaded by Spring by default):** Copy [.env.dev.sample](../.env.dev.sample) to `.env.dev` and source it, or use a tool that loads it:
  ```bash
  set -a; source .env.dev; set +a
  cd olo-be && ./gradlew bootRun
  ```
- **Option C — Without Redis:** Omit Redis or set `SPRING_AUTOCONFIGURE_EXCLUDE=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration`. The backend uses an in-memory tenant store (data lost on restart).

### 2. Docker run (combined image)

Pass variables with `-e` or `--env-file`:

```bash
# With env file (create from .env.production.sample or .env.demo.sample)
docker run -p 3000:80 --env-file .env.production YOUR_IMAGE/olo-ui

# Inline (e.g. with external Redis)
docker run -p 3000:80 \
  -e SPRING_DATA_REDIS_HOST=redis.example.com \
  -e SPRING_DATA_REDIS_PORT=6379 \
  -e OLO_TENANT_IDS=olo:tenants \
  YOUR_IMAGE/olo-ui
```

### 3. Docker Compose

The repo provides sample env files and compose files that use them:

| Env file | Compose file | Use |
|----------|--------------|-----|
| Copy [.env.dev.sample](../.env.dev.sample) → `.env.dev` | [docker-compose.dev.yml](../docker-compose.dev.yml) | Development (optional env_file) |
| Copy [.env.production.sample](../.env.production.sample) → `.env.production` | [docker-compose.production.yml](../docker-compose.production.yml) | Production |
| Copy [.env.demo.sample](../.env.demo.sample) → `.env.demo` | [docker-compose.demo.yml](../docker-compose.demo.yml) | Demo |

Compose injects the file specified in `env_file:` into the service container. You can override or add variables in the `environment:` block in the compose file.

**Example — first run with production compose:**
```bash
cp .env.production.sample .env.production
# Edit .env.production if needed (e.g. Redis password)
docker compose -f docker-compose.production.yml up -d
```

### 4. Kubernetes / cloud

Set the same variables in your Deployment or Pod spec (e.g. `env` or `envFrom` with a ConfigMap or Secret). Use the same names as in the table above.

---

## Sample files in this repo

- **[.env.dev.sample](../.env.dev.sample)** — Development (backend port, Redis, OLO_TENANT_IDS).
- **[.env.production.sample](../.env.production.sample)** — Production (Redis, optional password, optional exclude).
- **[.env.demo.sample](../.env.demo.sample)** — Demo (same as production; optional demo-specific Redis key).

Copy the relevant sample to `.env.dev`, `.env.production`, or `.env.demo` and adjust. **Do not commit real `.env` files with secrets.**

---

## Frontend (olo-ui)

The UI is built as static assets and talks to the backend at `/api/v1`. In development, Vite proxies `/api` to `http://localhost:8082` (see [olo-ui/vite.config.ts](../olo-ui/vite.config.ts)). No environment variables are required for the frontend in normal use.
