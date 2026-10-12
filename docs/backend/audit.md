# Mesaro backend — deep audit

**Status date:** 2026-10-12 (code rescore) · historical live probes: 2026-10-09  
**Scope:** `backend/` (Spring Boot API)  
**Purpose:** Founder-grade engineering due diligence — what exists, gaps, bugs  
**Vision:** [../product-doctrine.md](../product-doctrine.md) — €50 simple reservation SaaS (canonical)  
**Flows:** [flows.md](flows.md) · [../flows.md](../flows.md)  
**Plan:** [../production-ready-plan.md](../production-ready-plan.md)

Parent overview: [../README.md](../README.md)

> The 2026-10-09 probe table is **historical**. Phase 0–2 fixed STAFF RBAC, billing gate, webhook durability, seed quota, and select/accept-invite. Current company scores: [../README.md](../README.md).

---

## Live API audit — 2026-10-09 (historical)

Base: `http://127.0.0.1:8080` · Bearer from `POST /api/auth/login` · `X-Restaurant-Id: 1` where needed  
Paths are **`/api/...`** (not `/api/v1/...`).

| Call | Then (2026-10-09) | Now (2026-10-12 code) |
|------|-------------------|------------------------|
| `POST /api/auth/login` (admin / staff.demo) | 200 | OK |
| `GET /api/auth/current-user` | `maxRestaurants: 1` vs 2 restaurants | Seed sets `max_restaurants = 2` |
| Planning / vacations / reports / dashboard GETs | 200 | OK |
| Billing status | qty 1 vs 2 restaurants | Quota aligned in seed |
| Hold → confirm | 200 ungated | Billing-gated |
| STAFF cancel / vacation create | **403** | STAFF+ / self-only OK |
| `POST .../select` | 200 | FE wired |
| Stripe webhook | mark-then-route | claim → route → done/failed |

---

## Vision lens (read first)

Under the doctrine, backend success is **reliably powering the sold product** (floor + weekly ops), not exposing a competitor suite.

| Doctrine must be rock-solid | Weekly essentials (keep shipping) | Out of scope |
|-----------------------------|-----------------------------------|--------------|
| Auth, restaurant, tables, shifts/hours, availability, hold, reservation, staff, email confirm, billing gate, tenant isolation | Planning, vacations/closures, simple reports | SMS, deposits, waitlist, marketplace, multi-plan matrices |

See doctrine “Explicitly out of scope” and 2026-10-09 decision log.

---

## Executive summary

The backend is a **strong multi-tenant booking API**: holds, DST-aware availability, overlap guards, RBAC (STAFF floor autonomy), Stripe owner billing with durable webhooks, guest billing gate, GDPR retention, outbox email, audit logging, and serious concurrency tests. Prod fail-fast for insecure secrets / log email is implemented.

**Remaining for unsupervised paid scale:** real email smoke, PAST_DUE/dunning policy, active GitHub Actions (workflows parked), VPS cutover + TLS/backups, counsel/legal entity.

**Scores (2026-10-12):** booking ~90% · floor RBAC ~85% · monetization ~80% · security/compliance ~75% · ops ~55% · **vision fit ~75%**

---

## Stack & inventory

| Item | Evidence |
|------|----------|
| Spring Boot 3.5 / Java 21 | `pom.xml`, `MesaroApplication.java` |
| PostgreSQL + Flyway | `application.yml`, `db/migration/V1`…`V54` (gaps: V6–V8, V38, V43, V47) |
| Redis | sessions / denylist / rate limit |
| Stripe | `billing/*`, migrations V49–V54 |
| Optional Elasticsearch | API action logging publisher |
| Tests | ~43 `*Test.java` including Testcontainers integration |

### Packages under `com.mesaro`

`auth`, `security`, `restaurant`, `table`, `shift`, `openinghours`, `availability`, `hold`, `reservation`, `vacation`, `staff`, `planning`, `dashboard`, `report`, `analytics`, `contact`, `billing`, `gdpr`, `audit`, `outbox`, `email`, `ratelimit`, `logging`, `health`, `infra`, `config`, `common` — plus empty `marketing/` package.

---

## Module maturity matrix

| Module | Status | Evidence | Notes |
|--------|--------|----------|-------|
| **auth** | Done | `AuthController`, `AuthService`, `JwtService`, refresh, password reset | BCrypt, refresh rotation; denylist fail-open if Redis down |
| **security** | Partial | `SecurityConfig`, `RestaurantAccessGuard`, `RestaurantContextInterceptor` | Strong role guards; wide public surface; secret validator missing |
| **restaurant** | Done | `RestaurantService`, soft-delete, slug, timezone, booking rules | Quota via `maxRestaurants` |
| **table / combinations** | Done | `DiningTable*`, `TableCombination*` | Capacity selection |
| **shift** | Done | `ShiftService` | Overnight windows, capacity |
| **openinghours** | Done (thin) | entity/repo; API via restaurant | |
| **availability** | Done | `AvailabilityService` | DST gap/overlap via `TimeService` |
| **hold** | Done | `HoldService`, expiry scheduler | Pessimistic table locks |
| **reservation** | Done | guest + admin lifecycle | Confirm/cancel/no-show/seat; cancel-token public GET |
| **vacation** | Done | closures + staff leave | Overlap guards; STAFF self-serve blocked by service `@PreAuthorize` |
| **staff** | Done | invites, roles, accept-invite | `X-Restaurant-Id` context |
| **planning** | Done | assignments, weekly hours | Doctrine: not the sold product |
| **dashboard** | Done | portfolio + live service | `@PreAuthorize` in service |
| **report** | Done | summary + CSV | Manager-gated; hide from default UX |
| **analytics** | Stub | `AnalyticsController` | Sanitizes keys; **logs only** |
| **marketing** | Missing | empty package | Contact form elsewhere |
| **contact** | Partial | `ContactController` | Email only; no CRM store |
| **billing / Stripe** | Partial / Risky | `BillingService`, `StripeWebhookController` | Critical retry bug; guest path ungated |
| **gdpr** | Partial | retention + purge | **No DSAR export API** |
| **audit** | Done | `AuditService`, event types | Redaction + GDPR delete |
| **outbox** | Partial | `OutboxWorker` | `ReservationConfirmed` real; others log-only |
| **email** | Partial | default `LoggingEmailService` | Must set `EMAIL_PROVIDER` |
| **ratelimit** | Done | Redis token bucket | `/api/admin.*` group rarely matches real paths |
| **logging / health** | Partial | ES publisher, Actuator `:9090` | Soft-fail ES |
| **TimeService / DST** | Done | unit + integration tests | Explicit DST policy |

---

## Critical bugs & risks

### ~~P0 — Stripe webhook marks processed before handle~~ — Fixed

Status machine: claim → route → `done` / `failed` with reclaim for retries.

### ~~P0 — Production secret validator missing~~ — Fixed

`ProductionSecurityValidator` refuses `insecure-dev-*` and `EMAIL_PROVIDER=log` outside `dev`.

### ~~P1 — Guest booking not billing-gated~~ — Fixed

Hold/confirm paths call billing access checks.

### P1 — PAST_DUE never auto-escalates locally

`SubscriptionStatus.allowsAccess()` includes `PAST_DUE`. Invoice failure sets PAST_DUE; local UNPAID depends on Stripe `customer.subscription.updated`. No local grace timer / dunning policy yet.

### P1 — Prod email smoke not verified

Dev defaults to `EMAIL_PROVIDER=log`. Prod fails fast on `log`, but live Resend/SMTP smoke (invite, reset, confirmation) is still pending.

### ~~P1 — Auth mismatches (controller vs service)~~ — Fixed

STAFF cancel/switch + STAFF self-vacation create aligned with doctrine.

### P2 — Outbox incomplete

`OutboxWorker`: `ReservationConfirmed` sends email; some other types still log-only; dead-letter after 3 with **no replay API**.

### P2 — Token denylist fail-open

If Redis is down, `TokenDenylistService.isDenied` may allow tokens. Logout denylists access JWT when Redis is healthy.

### P2 — Live VPS hardenings still manual

Compose/Caddy runbooks exist ([../deploy-hostinger-vps.md](../deploy-hostinger-vps.md)); live cutover (bind ports, TLS, backups, secrets) not done yet.

---

### P2 — Dockerfile skips tests

`./mvnw package -DskipTests` — broken tests can ship in images.

---

### P2 — Billing gate skip without header

Writes using only `?restaurantId=` without `X-Restaurant-Id` may skip interceptor billing check (role still via `@PreAuthorize`).

---

### P3 — Analytics / marketing stubs; Flyway gaps; rate-limit path mismatch

- Analytics log-only; `marketing/` empty  
- Missing migration versions V6–V8, V38, V43, V47 (confirm never applied elsewhere)  
- Rate-limit `admin` group matches `/api/admin.*` but many controllers live under `/api/restaurants`, `/api/dashboard`, etc.

---

## Booking correctness (strengths)

| Concern | Status | Evidence |
|---------|--------|----------|
| Overlaps | Strong | App locks + `V17` table overlap triggers; V33/V34 assertions |
| Holds | Strong | Sorted `FOR UPDATE`; confirm re-checks |
| Concurrency | Tested | `HoldConcurrencyTest`, `BookingConcurrencyIntegrationTest`, race tests |
| DST | Strong | `TimeServiceDstTest`, `DstBookingIntegrationTest` |
| Capacity | Present | Shift max covers on hold + confirm |
| FSM | Present | `V24` reservation status trigger; `V23` hold confirmed immutable |

Residual: trigger-based overlap is race-resistant under row locks but needs continued load testing for overnight shifts + combinations.

---

## Security & compliance gaps

| Area | Gap |
|------|-----|
| Secret hygiene | Insecure defaults; validator missing |
| Public endpoints | Health, availability, holds, analytics, contact, auth, accept-invite, Stripe webhook, reservation GET/cancel (token) |
| CORS | Wildcard origins rejected — good (`CorsConfig`) |
| CSRF | Disabled (stateless JWT — expected) |
| Tenant isolation | Generally good (`TenantIsolationTest`); keep header/path mismatch checks |
| GDPR | Soft-delete + anonymize + retention; **no subject-access export**, no consent ledger in API |
| Stripe | HMAC OK; retry bug undermines trust |
| Actuator | Management port 9090 — ensure never public |
| Swagger | Disabled in prod by default — good |

---

## Billing / Stripe failure modes

| Path | Behavior |
|------|----------|
| Checkout | Owner-scoped customer; quantity = active restaurants |
| Confirm fallback | `/api/billing/checkout/confirm` (called from `BillingSuccessPage`) |
| Webhooks | checkout.completed, subscription updated/deleted, invoice paid/failed |
| Access block | HTTP 402 on authenticated restaurant writes |
| Trial | 14-day in-app; daily expiry + reminder window |
| Quota | Stripe quantity ↔ `maxRestaurants` |

**Missing for SaaS (doctrine-aligned):** dunning / PAST_DUE emails; prod email smoke verification.  
**Intentionally not building:** tax matrices / plan tiers / feature-flag upsells (see doctrine).

---

## Missing functionality — filtered by doctrine

### Real gaps (needed for the €50 simple product)

- Durable Stripe webhooks + guest-path billing gate
- Prod fail-fast (secrets, email)
- DSAR export / privacy support for EU customers (compliance, not “suite”)
- Dead-letter replay for outbox/webhooks (ops reliability)
- CI + deploy hardening
- Fix STAFF vacation / cancel-switch auth mismatches if those UIs stay

### Intentionally absent (doctrine: do not build for v1)

- Guest deposits / prepaid / no-show fees  
- Waitlist / SMS / WhatsApp  
- Guest accounts / loyalty  
- Marketplace / Google Reserve / OTAs  
- Feature-flag plan matrices / module upsells  
- Marketing/CRM platform (`marketing/` empty is fine)  
- Product analytics warehouse (kill log-only endpoint or ignore)

### Present in code but not the sold product

- Planning, vacation approval flows, rich reports — keep stable if used internally; **do not expand**; prefer UI hide over new APIs

---

## Ops / launch gaps

| Item | State |
|------|-------|
| Backend CI (`mvn test` + Testcontainers) | **Authored, parked** at `.github/ci-parked/backend-ci.yml` |
| E2E CI backend startup | **Authored, parked** at `.github/ci-parked/e2e.yml` (starts API) |
| HTTPS / reverse proxy docs | Present — [../deploy-hostinger-vps.md](../deploy-hostinger-vps.md), Caddyfiles |
| Backups / PITR | Not defined |
| Monitoring alerts | Prometheus endpoint only; no alert rules |
| Secrets manager | Env vars only |
| Email in prod | Must configure; default log |

---

## Test coverage

**Strong:** JWT auth, holds concurrency, booking flows, DST, tenant isolation, Stripe webhook unit/idempotency, rate limit, GDPR retention unit, vacation/staff/planning.

**Blind spots:**

- Outbox worker dead-letter / dispatch
- Guest holds when owner billing is CANCELED
- Contact form abuse
- Hard-delete cascade completeness
- Startup secret rejection (feature missing)
- Prod profile boot with empty Stripe key
- Multi-node outbox + webhook under real Redis/Postgres

---

## Stubs & misleading claims

- Java `TODO`/`FIXME`/`UnsupportedOperationException`: essentially none — stubs are behavioral
- `LoggingEmailService` (default provider)
- `AnalyticsController` (log-only)
- Outbox non-email event types (log-only)
- Empty `marketing/`
- Docs/comments claiming startup validation of insecure secrets **without implementation**

---

## Recommended 30 / 60 / 90 (backend)

Aligned with [product-doctrine.md](../product-doctrine.md): deepen reliability of the simple core — do not widen the suite.

### Days 0–30

1. Fix Stripe webhook durability  
2. Startup fail-fast (secrets, Stripe when billing on, reject `EMAIL_PROVIDER=log` in prod)  
3. Gate guest holds/confirm on `allowsAccess()`  
4. GitHub Action: `mvn test`; stop blind `-DskipTests` for release  
5. Wire Resend/SMTP; smoke invite/reset/confirmation  

### Days 31–60

6. DSAR export + retention schedule for counsel  
7. Dunning emails; PAST_DUE → UNPAID policy  
8. Outbox/webhook metrics + replay  
9. Harden deploy (no public DB/Redis/ES, ES auth, TLS, backups)  
10. Rate-limit real write paths; rate/captcha contact  

### Days 61–90

11. Remove or ignore fake analytics endpoint (do not build a warehouse)  
12. Load-test dinner-rush booking + chaos Redis/Stripe  
13. Support tooling only as needed for low-touch €50 ops  
14. **Reject** SMS/deposits/waitlist unless doctrine is formally amended  

---

## Bottom line

The backend is **investor-credible engineering**, not a toy.  
Next work: **reliability + monetization + keep the API serving a simple product** — not feature parity with expensive suites.
