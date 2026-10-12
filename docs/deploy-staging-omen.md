# Deploy Mesaro staging on Omen (LAN SSH)

**Stack:** Docker Compose (`backend/docker-compose.prod.yml` + `docker-compose.staging.yml`) + Caddy internal TLS  
**Source branch:** `dev` (not `main`)  
**CD:** GitHub Actions [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) on push to `dev`  
**Runner:** self-hosted label `mesaro-staging` on this host  
**Access:** SSH alias `mesaro-staging` → `mesaro@192.168.0.129`  
**Updated:** 2026-10-12

## How staging stays in sync

1. Merge work into **`dev`** via PR only (feature → `dev`; no direct push).
2. Actions checks out the commit, rsyncs into `/opt/mesaro` (keeps `backend/.env.staging`), builds the SPA, runs Compose.
3. Browse `https://app.mesaro.staging` (Windows hosts → `192.168.0.129`).
4. Promote to prod later with PR **`dev` → `main`** (prod workflow is a stub until Hostinger).

## Prerequisites

1. Ubuntu on the Omen, Docker + Compose, Git, Node 20+, `rsync`
2. `/opt/mesaro` with gitignored `backend/.env.staging` (see `.env.staging.example`)
3. Self-hosted GitHub Actions runner registered with labels `self-hosted`, `linux`, `mesaro-staging`
4. Windows hosts entries (admin):

```
192.168.0.129  app.mesaro.staging api.mesaro.staging
```

5. SSH key-only login. UFW allows 22/80/443 from `192.168.0.0/24` only.

## Manual redeploy (fallback)

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
