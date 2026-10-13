# Deploy Mesaro on Hostinger VPS

**Stack:** Docker Compose (`backend/docker-compose.prod.yml`) + Caddy TLS  
**Updated:** 2026-10-11

## Prerequisites (you)

1. Hostinger VPS (≥2–4 GB RAM) with Docker + Docker Compose
2. Domain DNS: `A` records for `api.<domain>` and `app.<domain>` → VPS IP
3. Secrets: Stripe, Resend/SMTP, JWT/token secrets (≥32 chars, not `insecure-dev-*`)
4. Auth Hostinger DNS/VPS MCPs in Cursor if the agent should apply DNS for you

## One-time VPS setup

```bash
# On the VPS
git clone <repo> /opt/mesaro && cd /opt/mesaro/backend
cp .env.prod.example .env.prod   # or create from checklist below
# Edit .env.prod — never commit it

# Build frontend statically (on CI or locally) and copy to backend/frontend-dist
# FRONTEND_DIST_PATH defaults to ./frontend-dist
mkdir -p frontend-dist
# rsync/vite build output into frontend-dist/

export MESARO_DOMAIN=yourdomain.com
export ACME_EMAIL=you@yourdomain.com
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Health checks:

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS https://api.yourdomain.com/actuator/health/readiness
curl -fsSI https://app.yourdomain.com
```

## Required `.env.prod` keys

| Variable | Notes |
|----------|--------|
| `POSTGRES_*` / `DB_*` | DB name/user/pass; `DB_URL=jdbc:postgresql://postgres-prod:5432/<db>` |
| `REDIS_HOST=redis-prod` | Port `6379` inside network |
| `JWT_SECRET`, `HOLD_TOKEN_SECRET`, `RESERVATION_TOKEN_SECRET`, `STAFF_TOKEN_SECRET` | ≥32 chars each |
| `EMAIL_PROVIDER` | `resend` or `smtp` — **not** `log` |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Transactional sender (`noreply@…`) |
| `EMAIL_SUPPORT_ADDRESS` | Contact-form inbox (`support@…`) |
| `RESEND_API_KEY` | Required when `EMAIL_PROVIDER=resend`; domain must be verified in Resend |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Live or test |
| `APP_BASE_URL`, `API_BASE_URL`, `FRONTEND_URL`, `API_CORS_ORIGINS` | `https://…` |

Optional Elasticsearch + Kibana: `--profile elastic` and set `ELASTICSEARCH_URIS=http://elasticsearch-prod:9200` + `APP_LOG_ELASTIC_ENABLED=true`. Kibana is bound to `127.0.0.1:5601`. In Discover use data views `mesaro-api-actions*` (HTTP) and `mesaro-audit-events*` (domain audit).

## Redeploy (agent-friendly)

```bash
cd /opt/mesaro
git pull
cd backend
# Refresh frontend-dist if FE changed
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build app-prod caddy
docker compose -f docker-compose.prod.yml ps
curl -fsS https://api.<domain>/actuator/health/readiness
```

## Monitoring stubs

| Signal | Where |
|--------|--------|
| API readiness | `GET /actuator/health/readiness` (via Caddy) |
| Prometheus metrics | Actuator `:9090` **internal only** — scrape from localhost/VPN |
| Webhook failures | Logs: `StripeWebhookController` + rows with `status=failed` in `stripe_webhook_event` |
| Outbox dead-letters | Logs from `OutboxWorker`; alert if age > N minutes |
| 5xx rate | Reverse-proxy / Caddy access logs |

Alert ideas (wire later): webhook `failed` count, outbox backlog, readiness flapping.

## Security notes

- Postgres/Redis ports bind to `127.0.0.1` only; do not publish `15432`/`16379` publicly.
- Management port `9090` is container-internal (`expose` only).
- Prod profile refuses insecure-dev secrets and `EMAIL_PROVIDER=log` (`ProductionSecurityValidator`).

## Rollback

```bash
git checkout <previous-sha>
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Keep a Hostinger/VPS snapshot before first cutover.
