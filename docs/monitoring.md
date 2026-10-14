# Mesaro monitoring notes (v1)

## Actuator

- Public (via API host): readiness / liveness only as exposed by Spring Security config
- Internal management port `9090`: full health + Prometheus (`/actuator/prometheus`) — scrape from localhost or private network only

## In-app signals

`OpsSignalService` checks every minute and logs at error level when:

- `stripe_webhook_event.status = 'failed'`
- `outbox_event` rows are still unpublished after 15 minutes

The same counts are the `opsSignal` health indicator on the management port: `GET /actuator/health/opsSignal`. It is not part of readiness, so a billing backlog does not restart the API. Prod hides health details; the status is still `DOWN`, and the log line has the counts.

Still wire an external pager for:

1. `opsSignal` DOWN, or those error log lines
2. HTTP 5xx above 1% of requests over 5 minutes on `api.`
3. Readiness failing for more than 2 minutes

## Sentry (optional)

Add Sentry MCP / SDK after first deploy; tag release with git SHA from CI.
