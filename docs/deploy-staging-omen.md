# Deploy Mesaro staging on Omen (LAN SSH)

**Stack:** Docker Compose (`backend/docker-compose.prod.yml` + `docker-compose.staging.yml`) + Caddy internal TLS  
**Access:** SSH alias `mesaro-staging` → `mesaro@192.168.0.129`  
**Updated:** 2026-10-12

## Prerequisites

1. Ubuntu on the Omen, Docker + Compose, Git, Node 20+
2. Repo at `/opt/mesaro` (private GitHub: sync via `git bundle` or deploy key)
3. Windows hosts entries (admin):

```
192.168.0.129  app.mesaro.staging api.mesaro.staging
```

4. SSH key-only login (password auth disabled). Firewall: UFW allows 22/80/443 from `192.168.0.0/24` only.

## First deploy / redeploy

```bash
cd /opt/mesaro
# refresh code (bundle, git pull with deploy key, or rsync)
cd frontend
echo 'VITE_API_URL=https://api.mesaro.staging/api' > .env.production.local
npm ci
# Same as run-prod-local.ps1: skip `tsc -b` until type debt is cleared
npx vite build
mkdir -p ../backend/frontend-dist
rm -rf ../backend/frontend-dist/*
cp -a dist/. ../backend/frontend-dist/

cd ../backend
chmod +x mvnw   # required after Windows/git-bundle sync
# .env.staging must exist (see .env.staging.example); never commit it
sg docker -c 'docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env.staging up -d --build'
sg docker -c 'docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env.staging ps'
```

Health:

```bash
curl -kfsS https://api.mesaro.staging/actuator/health/readiness
# or from the server:
curl -fsS http://127.0.0.1:19090/actuator/health/readiness
```

Browser: `https://app.mesaro.staging` (accept Caddy internal cert warning once).  
Mailpit: SSH tunnel `ssh -L 8025:127.0.0.1:8025 mesaro-staging` → http://127.0.0.1:8025

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
