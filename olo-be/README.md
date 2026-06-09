# olo-be

Spring Boot REST backend for Olo.

## Requirements

- Java 17+
- Gradle 8.5+ (or use the wrapper: `./gradlew` / `gradlew.bat` after running `gradle wrapper` once if the wrapper jar is missing)

## Build

```bash
./gradlew build
# or: gradle build
```

## Run

```bash
./gradlew bootRun
```

Or on Windows:

```bash
gradlew.bat bootRun
```

API runs at `http://localhost:8082`. All endpoints are versioned under `/api/v1/` (e.g. health: `GET /api/v1/health`, tenants: `GET /api/v1/tenants`).

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| **SERVER_PORT** | `8082` | Port the backend listens on. |
| **SPRING_DATA_REDIS_HOST** | `localhost` | Redis host. |
| **SPRING_DATA_REDIS_PORT** | `6379` | Redis port. |
| **OLO_TENANT_IDS** | `olo:tenants` | Redis key for the tenant list. |
| **SPRING_AUTOCONFIGURE_EXCLUDE** | — | Set to `org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration` to disable Redis (in-memory store). |
| **SPRING_DATA_REDIS_PASSWORD** | — | Redis password if required. |

**How to set:** Export in the shell, use an env file with Docker/Compose, or set in your deployment. Full reference: [docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md) (repo root). Sample files: [.env.dev.sample](../.env.dev.sample), [.env.production.sample](../.env.production.sample), [.env.demo.sample](../.env.demo.sample).

## Tenant list: Redis and in-memory fallback

- **With Redis:** Set env `OLO_TENANT_IDS` (e.g. `olo:tenants`) for the Redis key. Tenant list is read/written there.
- **Without Redis:** If Redis is disabled or unavailable, the backend uses an **in-memory tenant store**. Tenant CRUD works; data is lost on restart. No Redis is required for first-run or local contribution.

## Docs

See [docs/](docs/) for API and configuration notes and links to repo root docs.
