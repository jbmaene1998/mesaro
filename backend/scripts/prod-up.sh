#!/bin/sh
# Run on the production host after the repo and .env.prod are in place.
set -eu
cd "$(dirname "$0")/.."

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

i=0
while [ "$i" -lt 60 ]; do
  status="$(docker inspect --format '{{.State.Health.Status}}' mesaro-prod-api 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "API healthy"
    exit 0
  fi
  i=$((i + 1))
  sleep 5
done

echo "Timed out waiting for mesaro-prod-api health" >&2
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 app-prod || true
exit 1
