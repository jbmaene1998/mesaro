# Mesaro backend — functional flow audit

**Audit date:** 2026-10-09 (includes live API probes)  
**Source:** `backend/src/main/java/com/mesaro/**`  
**Vision:** [../product-doctrine.md](../product-doctrine.md)  
**Cross-cut:** [../flows.md](../flows.md) · Technical: [audit.md](audit.md) · Plan: [../production-ready-plan.md](../production-ready-plan.md)

---

## Live probes (2026-10-09) — short

| Flow | Live |
|------|------|
| Login admin / staff.demo | OK |
| Hold → `POST /api/holds/confirm` | OK (ungated) |
| Staff-planning day | OK |
| Reports summary | OK |
| Billing status | OK read; qty=1 vs 2 restaurants |
| STAFF cancel | **403** (service MANAGER) |
| STAFF vacation create | **403** (service MANAGER) |
| `POST .../select` | OK (FE unused) |
| Webhook order | Still mark-then-route |

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Complete** | End-to-end usable for €50 simple SaaS |
| **Partial** | Works with meaningful gaps |
| **Broken** | Typical actor blocked (often controller vs service role mismatch) |
| **Stub** | Entry exists; side effect log-only / unhandled |

### Global auth

- **Public:** health, availability, holds, analytics, contact, auth (login/register/refresh/logout/forgot/reset), staff accept-invite, Stripe webhook, reservation GET/cancel (token)
- **Roles:** `OWNER` > `MANAGER` > `STAFF`
- **Billing gate:** `RestaurantContextInterceptor` → `checkBillingAccess` on authenticated non-GET restaurant writes (skips `/billing/**`). **Guest holds/confirm are not gated** (live confirmed).
- **Context:** `X-Restaurant-Id` and/or `/restaurants/{id}/...` path; `POST /restaurants/{id}/select` re-issues JWT

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

### 6. Accept invite — Partial

| | |
|--|--|
| **Entry** | `POST /api/staff/accept-invite` → `StaffService.acceptInvite` |
| **Steps** | Lock invite → validate → find-or-create user (**random password** if new) → membership → mark accepted → tokens → audit |
| **Gaps** | New staff logged in once but **cannot re-login** without forgot-password |

### 7. Create restaurant / settings / hours — Complete

| Entry | Role |
|-------|------|
| `POST /api/restaurants` | Authenticated |
| `GET /api/restaurants`, `GET /{id}` | Member |
| `PUT /api/restaurants/{id}`, `DELETE` (archive) | OWNER |
| `GET\|PUT /api/restaurants/{id}/opening-hours` | STAFF read / OWNER write |
| `POST /api/restaurants/{id}/select`, `GET /api/context` | Auth |

**Notes:** No dedicated onboarding API. Closing hours **warn** only (no auto-cancel). Closures (vacation module) **do** cancel bookings. Select re-issues JWT; FE currently ignores it.

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
| Cancel | `POST .../{id}/cancel` | STAFF | **MANAGER** → STAFF **403** |
| Switch tables | `POST .../{id}/switch` | STAFF | **MANAGER** → STAFF **403** |

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
| `POST /api/billing/checkout/confirm?session_id=` | Auth (owner-tied) — **FE does not call** |
| `POST /api/webhooks/stripe` | HMAC; **marks processed before route** → retry death |
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
| Staff vacation create | Controller allows STAFF; **`createStaffVacation` @PreAuthorize MANAGER** → STAFF **403** (live) |
| Approve / reject | MANAGER |

**Doctrine:** keep in nav; finish STAFF self-serve + closures UX.

---

## System jobs

| Job | Entry | Status |
|-----|-------|--------|
| Hold expiry | `HoldExpiryScheduler` → cleanup + audit; outbox `HoldExpired` log-only | Cleanup Complete; outbox Stub |
| Outbox worker | `OutboxWorker` every ~5s | **Partial** — only `ReservationConfirmed` sends email |
| Reservation reminders | cron ~120 min before | Complete |
| GDPR retention / purge | crons; soft-delete `DELETE /api/auth/current-user` | Complete (if enabled) |
| Staff invite cleanup | hourly | Complete |
| Analytics | `POST /api/analytics/events` | **Stub** (log only) |

---

## Highest-impact backend flow bugs

1. **STAFF cannot cancel or switch tables** (service MANAGER) — floor product broken for waiters (live 403)  
2. **STAFF cannot create own vacation** (service MANAGER) — weekly module inconsistent (live 403)  
3. **Guest booking ignores billing expiry**  
4. **Accept-invite random password** — no set-password step  
5. **Webhook mark-before-process**  
6. **Logout leaves access JWT live**  
7. **Admin billing gate** may skip if only query `restaurantId` without `X-Restaurant-Id`  

---

## Doctrine matrix (backend)

| Keep rock-solid | Keep usable (weekly) | Do not expand |
|-----------------|------------------------|--------------|
| Auth, restaurant, tables, shifts/hours, hold→confirm→cancel, STAFF floor ops, staff invite, billing gate, email confirm | Planning, vacations/closures, reports | Analytics stub, suite entitlements, SMS/deposits |
