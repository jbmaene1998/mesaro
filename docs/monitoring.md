# Mesaro monitoring notes (v1)

## Actuator

- Public (via API host): readiness / liveness only as exposed by Spring Security config
- Internal management port `9090`: full health + Prometheus (`/actuator/prometheus`) — scrape from localhost or private network only

## Suggested alerts

1. **Stripe webhooks** — `stripe_webhook_event.status = 'failed'` growing, or controller 500 spikes
2. **Outbox** — unpublished events older than 15 minutes
3. **HTTP 5xx** — >1% of requests over 5 minutes on `api.`
4. **Readiness** — failing for >2 minutes

## Sentry (optional)

Add Sentry MCP / SDK after first deploy; tag release with git SHA from CI.
