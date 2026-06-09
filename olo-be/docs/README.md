# olo-be docs

Backend-specific documentation. For run and build instructions, see [olo-be/README.md](../README.md).

## API

- Base path: `/api/v1/`
- Health: `GET /api/v1/health`
- Tenants: `GET /api/v1/tenants` (and related CRUD via dropdown/tenant endpoints)
- All endpoints are versioned under `/api/v1/`; see [STABILITY.md](../../docs/STABILITY.md) (in repo root docs) for versioning and deprecation.

## Configuration and environment variables

Backend behaviour is controlled by environment variables (or Spring properties). Key ones:

- **SERVER_PORT** — default 8082.
- **SPRING_DATA_REDIS_HOST** / **SPRING_DATA_REDIS_PORT** — Redis connection (optional; if disabled, in-memory tenant store is used).
- **OLO_TENANT_IDS** — Redis key for tenant list (default `olo:tenants`).
- **SPRING_AUTOCONFIGURE_EXCLUDE** — set to `org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration` to disable Redis.
- **SPRING_DATA_REDIS_PASSWORD** — Redis password when required.

**Full reference (how to set in local, Docker, Compose, Kubernetes):** [ENVIRONMENT.md](../../docs/ENVIRONMENT.md) in repo root docs. Sample env files are at repo root: `.env.dev.sample`, `.env.production.sample`, `.env.demo.sample`.

## Repo root docs

Shared architecture and contributor docs live at the repository root [docs/](../../docs/) (e.g. ARCHITECTURE.md, STABILITY.md). The combined Docker image is built from repo root; see root [README.md](../../README.md) and [.github/workflows/docker-publish.yml](../../.github/workflows/docker-publish.yml).
