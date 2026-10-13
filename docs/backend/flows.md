# Mesaro backend — functional flow audit

**Status date:** 2026-10-12 (code rescore) · historical live probes: 2026-10-09  
**Source:** `backend/src/main/java/com/mesaro/**`  
**Vision:** [../product-doctrine.md](../product-doctrine.md)  
**Cross-cut:** [../flows.md](../flows.md) · Technical: [audit.md](audit.md) · Plan: [../production-ready-plan.md](../production-ready-plan.md)

> Rows below that still say “403 / ungated / mark-then-route” in older subsections were fixed in Phase 0–1. Prefer the snapshot table and [../flows.md](../flows.md).

---

## Status snapshot (2026-10-12)

| Flow | Status |
|------|--------|
| Login admin / manager / staff.demo | OK |
| Hold → confirm | OK + **billing-gated** |
| Staff-planning day | OK |
| Reports summary | OK |
| Billing status / seed quota | OK (`max_restaurants = 2` for demo owner) |
| STAFF cancel / switch | OK (service STAFF+) |
| STAFF vacation create (self) | OK |
| `POST .../select` | OK (FE wired) |
| Webhook | OK (claim → route → done/failed) |
| Prod email smoke / PAST_DUE policy | Open |

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Complete** | End-to-end usable for €50 simple SaaS |
| **Partial** | Works with meaningful gaps |
| **Broken** | Typical actor blocked |
| **Stub** | Entry exists; side effect log-only / unhandled |

### Global auth

- **Public:** health, availability, holds, analytics, contact, auth (login/register/refresh/logout/forgot/reset), staff accept-invite, Stripe webhook, reservation GET/cancel (token)
- **Roles:** `OWNER` > `MANAGER` > `STAFF`
- **Billing gate:** `RestaurantContextInterceptor` → `checkBillingAccess` on authenticated non-GET restaurant writes (skips `/billing/**`). **Guest holds/confirm also check billing access.**
- **Context:** `X-Restaurant-Id` and/or `/restaurants/{id}/...` path; `POST /restaurants/{id}/select` re-issues scoped JWT (FE calls it)

---

## CORE / SETUP flows

### 1. Register — Complete

| | |
|--|--|
| **Entry** | `POST /api/auth/register` → `AuthController` / `AuthService.register` |
| **Steps** | Normalize email → create `UserAccount` (BCrypt) → welcome email (best-effort) → issue JWT + refresh |
| **Side effects** | DB user + refresh; trial `@PrePersist` (`TRIALING`, +14d, `maxRestaurants=1`); **no restaurant** |
| **Gaps** | No email verification; onboarding = separate create-restaurant |

### 2. Login — Complete

`POST /api/auth/login` → password check → tokens → audit `LOGIN_SUCCESS` / `LOGIN_FAILURE`

### 3. Refresh — Complete

`POST /api/auth/refresh` → lock active token → revoke → replay detection → new tokens → audit

### 4. Logout — Partial

`POST /api/auth/logout` → revoke refresh → audit. **Access JWT not denylisted** (unlike role-change/delete).

### 5. Password reset — Complete (outbox Stub)

| | |
|--|--|
| **Forgot** | `POST /api/auth/forgot-password` → hashed token → sync reset email → audit; outbox `PasswordResetRequested` **not handled** by worker |
| **Reset** | `POST /api/auth/reset-password` → validate → update password → revoke all refresh |
| **Change** | `POST /api/auth/change-password` (auth) → verify current → revoke refresh → notice email |

### 6. Accept invite — Complete

| | |
|--|--|
| **Preview** | `GET /api/staff/invites/preview?token=` (public) → restaurant name, role, whether password required |
| **Entry** | `POST /api/staff/accept-invite` → `StaffService.acceptInvite` |
| **Steps** | Lock invite → validate → find-or-create user (**password required** for new) → membership → mark accepted → tokens → audit |
| **Email** | Invite CTA uses `/accept-invite?token=` |

### 7. Create restaurant / settings / hours — Complete

| Entry | Role |
|-------|------|
| `POST /api/restaurants` | Authenticated |
| `GET /api/restaurants`, `GET /{id}` | Member |
| `PUT /api/restaurants/{id}`, `DELETE` (archive) | OWNER |
| `POST /api/restaurants/{id}/select`, `GET /api/context` | Auth |

**Notes:** Go-live wizard uses existing restaurant/tables APIs plus `POST /api/restaurants/{id}/shifts/bulk`. Closures (vacation module) **do** cancel bookings. Select re-issues JWT.

### 8. Tables + combinations — Complete

`DiningTableController` / `TableCombinationController` — STAFF read, MANAGER write. Delete/unavailable may leave future reservations needing review.

### 9. Shifts — Complete

`ShiftController` — STAFF read, MANAGER write. Required for public availability slots. **Doctrine friction:** hours + shifts dual model is heavier than a minimal product.

### 10. Guest availability → hold → confirm → view → cancel — Complete (RISK billing)

| Step | Entry |
|------|-------|
| Availability | `GET /api/availability`, `GET /api/availability/closed` |
| Hold | `POST /api/holds` → `HoldService` (locks, capacity, `assertCanAcceptBookings`) |
| Confirm | `POST /api/holds/confirm` `{ holdToken, guest… }` → reservation + cancel token → outbox `ReservationConfirmed` (live OK) |
| View / cancel | `GET\|POST /api/reservations/{code}` + `cancelToken` / `X-Cancel-Token` |

**Gaps:** Not subscription-gated. Hold TTL ~3 min. Cancel token TTL ~7 days. View without token fails (by design).

### 11. Admin floor ops — Partial / Broken (STAFF cancel & switch)

| Action | Path | Controller | Service |
|--------|------|------------|---------|
| List / create walk-in | `GET\|POST /api/admin/reservations` | STAFF | STAFF |
| Seat / complete / no-show | `POST .../{id}/seat\|complete\|noshow` | STAFF | STAFF |
| Cancel | `POST .../{id}/cancel` | STAFF | STAFF+ |
| Switch tables | `POST .../{id}/switch` | STAFF | STAFF+ |

Optimistic lock via `If-Match` version. Audit + cancel emails on mutations.

### 12. Staff invite / role / remove — Complete

`/api/staff` (+ restaurant context): invite, resend, role update (denylist), remove. Cleanup scheduler revokes expired invites. Accept-invite password gap above.

### 13. Dashboard / timeline / reports — Complete

| Area | Entry | Role |
|------|-------|------|
| Dashboard | `/api/dashboard*`, stats, live-service, portfolio | STAFF |
| Timeline | `GET /api/timeline` | STAFF |
| Reports | `GET /api/reports/summary`, `export.csv` | MANAGER |

**Doctrine:** reports = WEEKLY essential (keep). Multiple floor APIs vs “prefer Dashboard”.

### 14. Billing — Complete backend / RISK product

| Entry | Notes |
|-------|-------|
| `GET .../billing/status`, `POST checkout-session`, `portal-session`, `quantity` | OWNER |
| `POST /api/billing/checkout/confirm?session_id=` | Auth (owner-tied) — FE calls on success page |
| `POST /api/webhooks/stripe` | HMAC; claim → route → done/failed |
| Trial expiry cron | → `CANCELED`; access = TRIALING/ACTIVE/PAST_DUE |

Guest booking still allowed if `bookingEnabled` when subscription dead.

### 15. Contact — Complete

`POST /api/contact` → email support + audit (no CRM row).

---

## WEEKLY essential flows

### 16. Staff planning — Complete API / Partial UX (FE first paint)

`StaffPlanningController` — day plan, assignments, recurring week, work hours. Beyond €50 wedge.

### 17. Vacations / closures — Broken (STAFF self) / Complete (closures)

| | |
|--|--|
| Closures | MANAGER — auto-cancels affected reservations + emails |
| Staff vacation create | STAFF for **own** `userId`; MANAGER+ for others |
| Approve / reject | MANAGER |

**Doctrine:** keep in nav; finish STAFF self-serve + closures UX.

---

## System jobs

| Job | Entry | Status |
|-----|-------|--------|
| Hold expiry | `HoldExpiryScheduler` → cleanup + audit; outbox `HoldExpired` log-only | Cleanup Complete; outbox Stub |
| Outbox worker | `OutboxWorker` every ~5s | **Partial** — only `ReservationConfirmed` sends email |
| Reservation reminders | cron ~120 min before | Complete |
| GDPR retention / purge | crons; soft-delete `DELETE /api/auth/current-user` (password + `DELETE` confirm; cancels Stripe; cleans SSA/vacations) | Complete (if enabled) |
| Staff invite cleanup | hourly | Complete |
| Analytics | `POST /api/analytics/events` | **Stub** (log only) |

---

## Highest-impact remaining backend gaps

1. **Prod email smoke** — provider wiring exists; live Resend/SMTP not verified  
2. **PAST_DUE / dunning policy** undefined  
3. **Outbox stubs** — only some events send real email  
4. **CI parked** — `.github/ci-parked/backend-ci.yml` not active on GitHub yet  
5. **VPS cutover** — compose/Caddy runbooks exist; secrets/purchase pending

---

## Doctrine matrix (backend)

| Keep rock-solid | Keep usable (weekly) | Do not expand |
|-----------------|------------------------|--------------|
| Auth, restaurant, tables, shifts/hours, hold→confirm→cancel, STAFF floor ops, staff invite, billing gate, email confirm | Planning, vacations/closures, reports | Analytics stub, suite entitlements, SMS/deposits |
