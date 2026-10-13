# Local production mimic

Run the same DevOps shape as a Hostinger VPS deploy — on your machine.

## What you get

| Practice | Local setup |
|----------|-------------|
| Prod Spring profile + security validator | `SPRING_PROFILES_ACTIVE=prod` |
| Multi-stage Docker image | `backend/Dockerfile` |
| Compose stack | Postgres + Redis + API + Caddy |
| Reverse proxy + HTTPS | Caddy `tls internal` on `:9443` |
| Static frontend behind proxy | Vite `dist` → `backend/frontend-dist` |
| Secrets via env file | `.env.prod.local` (gitignored) |
| Outbound email capture | Mailpit UI on `:8025` |
| Healthchecks | Compose + `/actuator/health/readiness` |

Elasticsearch + Kibana stay off by default (lighter). Enable with compose `--profile elastic`. Real VPS steps: `docs/deploy-hostinger-vps.md`.

## Quick start

```powershell
# From repo root (Docker Desktop running)
.\run-prod-local.ps1
```

First run creates `backend/.env.prod.local` from the example, builds the frontend, then `docker compose up --build`.

| URL | Role |
|-----|------|
| https://app.mesaro.localhost:9443 | SPA |
| https://api.mesaro.localhost:9443/api | API via Caddy TLS |
| http://127.0.0.1:19090/actuator/health/readiness | Actuator (internal port) |
| http://127.0.0.1:8025 | Mailpit |
| http://127.0.0.1:18080/api | API without Caddy |

Stop:

```powershell
.\run-prod-local.ps1 -Down
```

## Notes

- `*.mesaro.localhost` resolves to `127.0.0.1` — no hosts-file edit.
- Trust Caddy’s local cert once (browser warning is expected).
- Replace Stripe `sk_test_` / `whsec_` / `price_` in `.env.prod.local` before testing billing.
- Dev stack on `:3000` / `:8080` can keep running; local prod uses `:9443` / `:18080`.
- Rebuild API image after backend changes: `.\run-prod-local.ps1 -Rebuild`
- Always start via `.\run-prod-local.ps1` (not bare `docker compose`) so host `DB_*` from `run-dev.ps1` cannot override prod values.

## Same commands as VPS (manual)

```powershell
cd backend
copy .env.prod.local.example .env.prod.local   # once
cd ..\frontend
$env:VITE_API_URL="https://api.mesaro.localhost:9443/api"
npm run build
cd ..\backend
Remove-Item -Recurse -Force frontend-dist -ErrorAction SilentlyContinue
mkdir frontend-dist
Copy-Item ..\frontend\dist\* frontend-dist -Recurse
docker compose -f docker-compose.prod.yml -f docker-compose.prod.local.yml --env-file .env.prod.local up -d --build
```
