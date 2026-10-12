# Mesaro backend — deep audit

**Audit date:** 2026-10-09 (static + **live API probes**)  
**Scope:** `backend/` (Spring Boot API)  
**Purpose:** Founder-grade engineering due diligence — what exists, gaps, bugs  
**Vision:** [../product-doctrine.md](../product-doctrine.md) — €50 simple reservation SaaS (canonical)  
**Flows:** [flows.md](flows.md) · [../flows.md](../flows.md)  
**Plan:** [../production-ready-plan.md](../production-ready-plan.md)

Parent overview: [../README.md](../README.md)

---

## Live API audit — 2026-10-09

Base: `http://127.0.0.1:8080` · Bearer from `POST /api/auth/login` · `X-Restaurant-Id: 1` where needed  
Paths are **`/api/...`** (not `/api/v1/...`).

| Call | Result |
|------|--------|
| `POST /api/auth/login` (admin / staff.demo) | 200 |
| `GET /api/auth/current-user` | 200 — `maxRestaurants: 1`, **2** restaurants in JWT |
| `GET /api/restaurants/1/staff-planning?date=2026-10-09` | 200 — rich shifts/assignments |
| `GET /api/restaurants/1/vacations` | 200 |
| `GET /api/reports/summary?restaurantId=1&startDate=&endDate=` | 200 |
| `GET /api/dashboard?restaurantId=1&date=` | 200 — `currentShift: null` overnight |
| `GET /api/restaurants/1/billing/status` | 200 — `TRIALING`, `currentQuantity: 1`, `activeRestaurantCount: 2` |
| `POST /api/holds` → `POST /api/holds/confirm` | 200 — guest path ungated |
| `POST /api/admin/reservations/{id}/cancel` as STAFF | **403** |
| `POST /api/restaurants/1/vacations` as STAFF | **403** |
| `POST /api/restaurants/2/select` | 200 — scoped token issued |
| `StripeWebhookController` | Still `tryMarkProcessed` then `route` |

**Auth mismatch pattern (confirmed):** controller `@PreAuthorize STAFF` + service `@PreAuthorize MANAGER` on cancel, switchTables, createStaffVacation → STAFF gets **403**.

---

## Vision lens (read first)

Under the doctrine, backend success is **reliably powering the sold product** (floor + weekly ops), not exposing a competitor suite.

| Doctrine must be rock-solid | Weekly essentials (keep shipping) | Out of scope |
|-----------------------------|-----------------------------------|--------------|
| Auth, restaurant, tables, shifts/hours, availability, hold, reservation, staff, email confirm, billing gate, tenant isolation | Planning, vacations/closures, simple reports | SMS, deposits, waitlist, marketplace, multi-plan matrices |

See doctrine “Explicitly out of scope” and 2026-10-09 decision log.

---

## Executive summary

The backend is a **strong technical MVP** for multi-tenant restaurant booking: holds, DST-aware availability, overlap guards, RBAC, Stripe owner billing, GDPR retention, outbox email, audit logging, and serious concurrency tests.

**Live probes show floor/billing gaps:** STAFF cancel/vacation blocked at service layer; guest booking ungated; billing quantity seed inconsistent; webhook durability still unsafe.

It is **not company-ready for unsupervised paid scale** until:

1. Stripe webhook idempotency is fixed (mark-before-process)
2. Production fail-fast for secrets / email is implemented (today only documented)
3. Guest booking is gated by subscription status
4. STAFF cancel/switch/self-vacation match doctrine (service `@PreAuthorize`)
5. CI, backups, TLS, and monitoring runbooks exist

**Scores:** booking ~75% · floor RBAC ~50% · monetization ~45% · security/compliance ~60% · ops ~40% · **vision fit ~60%**

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

### P0 — Stripe webhook marks processed before handle

**File:** `billing/StripeWebhookController.java`

Flow today:

1. Verify signature  
2. `tryMarkProcessed(eventId)` — inserts “already done”  
3. `route(event)` — if this throws → **500**  
4. Stripe retries → `tryMarkProcessed` returns false → **handler never runs again**

**Impact:** Paid checkout, cancel, `past_due` updates can be permanently lost.

**Fix direction:** Process first then mark; or status machine (`processing` / `done` / `failed`) with reclaim of stale `processing` / `failed` rows.

---

### P0 — Claimed production secret validator does not exist

**Claimed in:** `application.yml` comments / `AppProperties` narrative  
**Actual:** `JwtService` enforces non-blank + length; **no** startup rejection of `insecure-dev-*` placeholders outside `dev`.

Defaults in `AppProperties` still include `insecure-dev-*-secret-change-me-…`.

**Impact:** Misconfigured prod can boot with weak secrets.

---

### P1 — Guest booking not billed-gated

- Admin writes: `RestaurantContextInterceptor` → `BillingService.checkBillingAccess`
- Guest hold/confirm: only `RestaurantService.assertCanAcceptBookings` (archive + `bookingEnabled`)

Canceled/expired owners can still accept online bookings until someone flips `bookingEnabled`.

---

### P1 — PAST_DUE never auto-escalates locally

`SubscriptionStatus.allowsAccess()` includes `PAST_DUE`. Invoice failure sets PAST_DUE; local UNPAID depends on Stripe `customer.subscription.updated`. No local grace timer.

---

### P1 — Email default is log-only

`EMAIL_PROVIDER` defaults to `log` → `LoggingEmailService`. Invites, resets, confirmations, contact form “succeed” with no delivery unless ops configures Resend/SMTP. Prod does not fail-fast on `log`.

---

### P1 — Auth mismatches (controller vs service)

- Staff vacation create/update/delete: controller allows STAFF (self); service `@PreAuthorize` MANAGER → **403**
- Admin cancel / switch tables: controller STAFF; service **MANAGER** → STAFF cannot cancel/switch

---

### P2 — Outbox incomplete

`OutboxWorker`: `ReservationConfirmed` sends email; `HoldExpired`, `BillingSubscriptionSynced`, `RestaurantSuspended` only log; unknown types (incl. `PasswordResetRequested`) marked processed. Dead-letter after 3 with **no replay API**.

---

### P2 — Token denylist fail-open

If Redis is down, `TokenDenylistService.isDenied` allows tokens. Logout / disable may not revoke access under Redis outage. Logout does not denylist access JWT (only refresh revoked).

---

### P2 — Prod compose not hardened

`docker-compose.prod.yml` publishes Postgres/Redis/ES ports; ES `xpack.security.enabled: false`; no TLS termination, backups, or secrets manager in-repo.

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
| Confirm fallback | `/api/billing/checkout/confirm` (frontend currently does not call it) |
| Webhooks | checkout.completed, subscription updated/deleted, invoice paid/failed |
| Access block | HTTP 402 on authenticated restaurant writes |
| Trial | 14-day in-app; daily expiry + reminder window |
| Quota | Stripe quantity ↔ `maxRestaurants` |

**Missing for SaaS (doctrine-aligned):** durable webhook state machine, guest-path enforcement, dunning emails.  
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
| Backend CI (`mvn test` + Testcontainers) | **Missing** |
| E2E CI backend startup | **Stub** in `.github/workflows/e2e.yml` |
| HTTPS / reverse proxy docs | Missing in-repo |
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
