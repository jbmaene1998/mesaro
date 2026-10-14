# GitHub Environments — Mesaro secrets & config

Deploy jobs inject env files from **Environment Variables** (non-secret) and **Environment Secrets** (credentials). Schema lives in:

- Staging: [`backend/.env.staging.example`](../../backend/.env.staging.example)
- Production: [`backend/.env.prod.example`](../../backend/.env.prod.example)

Values live only in GitHub → **Settings → Environments → `staging` | `production`**. Never commit real `.env` files.

## Environments

| Name | Used by | Host |
|------|---------|------|
| `staging` | [`.github/workflows/deploy-staging.yml`](../workflows/deploy-staging.yml) | Omen self-hosted runner |
| `production` | [`.github/workflows/deploy-prod.yml`](../workflows/deploy-prod.yml) | Hostinger VPS (stub until cutover) |

Admins set values. Collaborators cannot read secret values after save. When hiring, add Environment **required reviewers** and CODEOWNERS on `.github/workflows/**` so writers cannot exfiltrate secrets via a malicious workflow edit.

## Staging — Variables (non-secret)

| Name | Example / notes |
|------|-----------------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `MESARO_DOMAIN` | `mesaro.staging` |
| `ACME_EMAIL` | `staging@mesaro.staging` |
| `FRONTEND_DIST_PATH` | `./frontend-dist` |
| `MANAGEMENT_PORT` | `9090` |
| `POSTGRES_DB` | `mesaro_staging` |
| `POSTGRES_USER` | `mesaro_staging_user` |
| `DB_URL` | `jdbc:postgresql://postgres-prod:5432/mesaro_staging` |
| `DB_USER` | `mesaro_staging_user` |
| `DB_POOL_SIZE` | `20` |
| `DB_POOL_MIN_IDLE` | `10` |
| `REDIS_HOST` | `redis-prod` |
| `REDIS_PORT` | `6379` |
| `SESSION_STORE_TYPE` | `redis` |
| `ELASTICSEARCH_URIS` | empty unless elastic profile |
| `ELASTICSEARCH_USERNAME` | usually empty |
| `ELASTICSEARCH_HEALTH_ENABLED` | `false` |
| `APP_LOG_ELASTIC_ENABLED` | `false` |
| `APP_BASE_URL` | `https://api.mesaro.staging` |
| `API_BASE_URL` | `https://api.mesaro.staging` |
| `FRONTEND_URL` | `https://app.mesaro.staging` |
| `API_CORS_ORIGINS` | `https://app.mesaro.staging` |
| `EMAIL_PROVIDER` | `resend` (real delivery; Mailpit unused while resend) |
| `SMTP_HOST` | `mailpit` (unused while `EMAIL_PROVIDER=resend`) |
| `SMTP_PORT` | `1025` |
| `SMTP_USERNAME` | empty |
| `SMTP_AUTH` | `false` |
| `SMTP_STARTTLS` | `false` |
| `EMAIL_FROM` | verified Resend domain, e.g. `noreply@tsjap.com` (`mesaro.com` pending DNS) |
| `EMAIL_FROM_NAME` | `Mesaro Staging` |
| `EMAIL_SUPPORT_ADDRESS` | e.g. `support@tsjap.com` |
| `RESEND_API_BASE_URL` | `https://api.resend.com` |
| `STRIPE_PRICE_ID` | test price id |
| `STRIPE_SUCCESS_URL` | `https://app.mesaro.staging/billing/success` |
| `STRIPE_CANCEL_URL` | `https://app.mesaro.staging/billing/cancel` |
| `STRIPE_PORTAL_RETURN_URL` | `https://app.mesaro.staging/settings/billing` |

## Staging — Secrets (credentials)

| Name | Notes |
|------|--------|
| `POSTGRES_PASSWORD` | Also used as compose postgres password |
| `DB_PASS` | App JDBC password (same value as `POSTGRES_PASSWORD` unless rotated separately) |
| `REDIS_PASSWORD` | |
| `ELASTICSEARCH_PASSWORD` | optional; empty OK |
| `JWT_SECRET` | ≥32 chars, not `insecure-dev-*` |
| `HOLD_TOKEN_SECRET` | ≥32 chars |
| `RESERVATION_TOKEN_SECRET` | ≥32 chars |
| `STAFF_TOKEN_SECRET` | ≥32 chars |
| `SMTP_PASSWORD` | empty OK (unused while `EMAIL_PROVIDER=resend`) |
| `RESEND_API_KEY` | required while `EMAIL_PROVIDER=resend` |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `E2E_STAFF_EMAIL` | Staff user for post-deploy Playwright `@smoke` |
| `E2E_STAFF_PASSWORD` | |
| `E2E_MANAGER_EMAIL` | Optional; used by fuller E2E suites |
| `E2E_MANAGER_PASSWORD` | |
| `E2E_OWNER_EMAIL` | Optional |
| `E2E_OWNER_PASSWORD` | |

### Staging — Variables for E2E smoke

| Name | Example / notes |
|------|-----------------|
| `E2E_RESTAURANT_SLUG` | Bookable public slug (e.g. `gastropub-gaspard`). Guest `@smoke` booking uses this. |

Ephemeral PR E2E (`e2e.yml`) uses the dev seed (`demo-restaurant`, `*@demo.com` / `demo123`) and does not require these secrets.

## Production — same split

Use the same variable/secret **names** on Environment `production`, with prod values from [`.env.prod.example`](../../backend/.env.prod.example) (`EMAIL_PROVIDER=resend`, live Stripe, real domain, etc.).

`deploy-prod.yml` fails the job when any required value is missing, then builds the frontend and deploys over SSH.

| Name | Kind | Notes |
|------|------|--------|
| `PROD_SSH_HOST` | Variable | VPS hostname or IP |
| `PROD_SSH_USER` | Variable | SSH user that can run Docker |
| `PROD_SSH_KEY` | Secret | Private key (PEM, real newlines) |
| `PROD_DEPLOY_PATH` | Variable | Optional. Default `/opt/mesaro` |
| `RATE_LIMIT_TRUSTED_PROXY_CIDR` | Variable | Optional. Default `172.16.0.0/12` (Docker bridge / Caddy only) |

## One-time migration (staging)

1. SSH to Omen and open `/opt/mesaro/backend/.env.staging` (do not paste into chat/PRs).
2. Create each Variable / Secret above in GitHub Environment `staging` (Settings → Environments → staging).
3. Merge/push so `deploy-staging` runs; it rewrites `.env.staging` from GitHub (mode `600`).
4. Confirm readiness: `curl -fsS http://127.0.0.1:19090/actuator/health/readiness`.
5. Keep a local encrypted backup of the old file if desired; GitHub is thereafter source of truth.

### CLI helpers (admin)

```powershell
# Variable
gh variable set EMAIL_SUPPORT_ADDRESS --env staging --body "support@mesaro.staging"

# Secret (prompts for value, or pipe)
gh secret set JWT_SECRET --env staging
```

See also [`scripts/github-bootstrap.ps1`](../../scripts/github-bootstrap.ps1) (creates empty Environments).
