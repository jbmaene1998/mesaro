# Deploy Mesaro staging on Omen (LAN SSH)

**Stack:** Docker Compose (`backend/docker-compose.prod.yml` + `docker-compose.staging.yml`) + Caddy internal TLS  
**Source branch:** `dev` (not `main`)  
**CD:** GitHub Actions [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) on push to `dev`  
**Secrets:** GitHub Environment **`staging`** (Variables + Secrets) — see [`.github/environments/README.md`](../.github/environments/README.md)  
**Runner:** self-hosted label `mesaro-staging` on this host  
**Access:** SSH alias `mesaro-staging` → `mesaro@192.168.0.129`  
**Updated:** 2026-10-13

## How staging stays in sync

1. Merge work into **`dev`** via PR only (feature → `dev`; no direct push).
2. Actions checks out the commit, rsyncs into `/opt/mesaro`, **materializes** `backend/.env.staging` from GitHub Environment `staging` (mode `600`), builds the SPA, runs Compose.
3. Browse `https://app.mesaro.staging` (Windows hosts → `192.168.0.129`).
4. Promote to prod later with PR **`dev` → `main`** (prod workflow is a stub until Hostinger; uses Environment `production`).

Adding a new required env key: update [`.env.staging.example`](../backend/.env.staging.example), the Environment checklist, the materialize step in `deploy-staging.yml`, then set the Variable/Secret in GitHub. No SSH edit of `.env.staging` needed.

## Prerequisites

1. Ubuntu on the Omen, Docker + Compose, Git, Node 20+, `rsync`
2. GitHub Environment `staging` populated (vars + secrets) per [`.github/environments/README.md`](../.github/environments/README.md)
3. Self-hosted GitHub Actions runner registered with labels `self-hosted`, `linux`, `mesaro-staging`
4. Windows hosts entries (admin):

```
192.168.0.129  app.mesaro.staging api.mesaro.staging
```

5. SSH key-only login. UFW allows 22/80/443 from `192.168.0.0/24` only.

## One-time migration from host `.env.staging`

If staging already ran from a hand-maintained file:

1. Copy values from `/opt/mesaro/backend/.env.staging` into GitHub Environment `staging` (do not paste secrets into chat/PRs).
2. Re-run **Deploy staging** (`workflow_dispatch` or push to `dev`).
3. Confirm readiness (below). GitHub is thereafter the source of truth; the on-disk file is overwritten each deploy.

## Manual redeploy (fallback)

Prefer Actions. If you must redeploy by hand, the env file must already exist (from the last successful Actions materialize) or you write it yourself from the same values as GitHub:

```bash
cd /opt/mesaro
# refresh from a machine that can reach GitHub, or wait for Actions
cd frontend
echo 'VITE_API_URL=https://api.mesaro.staging/api' > .env.production.local
npm ci
npx vite build
mkdir -p ../backend/frontend-dist
rm -rf ../backend/frontend-dist/*
cp -a dist/. ../backend/frontend-dist/

cd ../backend
chmod +x mvnw
docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env.staging ps
```

Health on the server:

```bash
curl -fsS http://127.0.0.1:19090/actuator/health/readiness
```

Browser: `https://app.mesaro.staging` (accept Caddy internal cert warning once).  
Mailpit: `ssh -L 8025:127.0.0.1:8025 mesaro-staging` → http://127.0.0.1:8025

## SSH from Windows (Cursor)

```
Host mesaro-staging
  HostName 192.168.0.129
  User mesaro
  IdentityFile ~/.ssh/id_ed25519_mesaro_staging
  IdentitiesOnly yes
```

```powershell
ssh mesaro-staging "hostname"
```
