# Mesaro — End-to-end functionality flows

**Status date:** 2026-10-12 (code review rescore)  
**Historical live audit:** 2026-10-09 — see [production-ready-plan.md](production-ready-plan.md)  
**Vision:** [product-doctrine.md](product-doctrine.md)  
**Deep maps:** [backend/flows.md](backend/flows.md) · [frontend/flows.md](frontend/flows.md)

Cross-cutting view: how guests and restaurants move through the product, which FE routes hit which BE APIs, and current status vs the €50 simple SaaS doctrine.

---

## How to read this

| Tag | Meaning |
|-----|---------|
| **CORE** | Doctrine daily product — must work perfectly |
| **SETUP** | One-time / rare — keep simple |
| **WEEKLY** | Essential weekly ops (planning/vacations/reports) — keep in nav |
| **BROKEN** | FE↔BE mismatch, 403, or incomplete step |
| **RISK** | Works in code but unsafe for paid scale / ops gap |
| **OK** | Wired end-to-end for intended actors |
| **PARTIAL** | Mostly done; polish or ops verification open |

---

## Current status snapshot (2026-10-12)

| Probe | Result |
|-------|--------|
| OWNER login → `/dashboard` | **OK** |
| Guest `/r/demo-restaurant` availability → hold → confirm | **OK** (billing-gated) |
| STAFF cancel / switch | **OK** (service + FE STAFF+) |
| Planning cold-load | **OK** (today init; no “Hoy” required) |
| Vacations staff tab + STAFF self-request | **OK** |
| Reports summary + CSV | **OK** |
| Billing success → `confirmCheckout` | **OK** |
| Stripe webhook durability | **OK** (claim → route → done/failed) |
| Privacy / Terms | **OK** routes (drafts; counsel pending) |
| Restaurant `/select` | **OK** (FE wired) |
| Accept-invite set-password | **OK** |
| Seed `maxRestaurants` vs 2 restaurants | **OK** (`= 2`) |
| Prod email smoke / live VPS / active CI | **RISK** — still open for paid scale |

**Demo:** `admin@demo.com` · `manager.demo@demo.com` · `staff.demo@demo.com` / `demo123`

---

## Core journey map (doctrine)

```text
Marketing → Register → Onboard restaurant
                ↓
     Tables + Shifts/Hours + Staff
                ↓
     Embed /r/:slug  ←—— guests book
                ↓
     Dashboard (primary floor)
       seat → complete | no-show | cancel | switch   (STAFF+)
                ↓
     Planning / Vacations / Reports (weekly)
                ↓
     Settings / Billing (~€50)
```

---

## Flow catalog (FE + BE)

| # | Flow | Doctrine | FE entry | BE entry | Status |
|---|------|----------|---------|----------|--------|
| 1 | Register | SETUP | `/register` | `POST /api/auth/register` | OK |
| 2 | Login / refresh / logout | SETUP | `/login` | `/api/auth/login\|refresh\|logout` | OK (logout denylists access JWT) |
| 3 | Forgot / reset password | SETUP | `/forgot-password`, `/reset-password` | `/api/auth/forgot-password`, `/reset-password` | OK (needs real email smoke in prod) |
| 4 | Onboarding go-live wizard | SETUP | `/onboarding` | restaurants + tables + shifts/bulk + booking | OK |
| 5 | Select restaurant context | SETUP | AppShell selector | `POST .../select` + `X-Restaurant-Id` | OK |
| 6 | Tables + combinations | SETUP | `/tables` | `/api/restaurants/{id}/tables*` | OK |
| 7 | Shifts | SETUP | `/shifts` | `/api/restaurants/{id}/shifts*` | OK |
| 9 | Staff invite | SETUP | `/staff` | `POST /api/staff/invite` | OK |
| 10 | Accept invite | SETUP | `/accept-invite` | `POST /api/staff/accept-invite` | OK (set-password UX) |
| 11 | Availability | CORE | Guest booking | `GET /api/availability?restaurantSlug=` | OK |
| 12 | Hold → confirm | CORE | `/r/:slug` → confirm | `POST /api/holds` → `POST /api/holds/confirm` | OK + billing-gated |
| 13 | Guest details + cancel | CORE | `/r/:slug/reservation/:code` | cancel token deep-link | OK |
| 14 | Embed booking | CORE | `/embed/:slug/...` | Same as guest | OK |
| 15 | Floor: dashboard / timeline / list | CORE | `/dashboard` primary | `/api/dashboard*`, `/admin/reservations` | OK |
| 16 | Walk-in / manual | CORE | dialogs | `POST /api/admin/reservations` | OK |
| 17 | Seat / complete / no-show | CORE | reservation detail | `POST .../seat\|complete\|noshow` | OK (STAFF+) |
| 18 | Cancel / switch tables | CORE | reservation detail | `POST .../cancel`, `.../switch` | OK (STAFF+) |
| 19 | Owner settings + embed | SETUP | `/settings` | restaurant PUT + hours | OK |
| 20 | Billing checkout / portal / quantity | SETUP | `/settings/billing` | `/api/restaurants/{id}/billing/*` | OK (webhook durable); PAST_DUE policy open |
| 21 | Billing success return | SETUP | `/billing/success` | `POST /api/billing/checkout/confirm` | OK |
| 22 | Privacy / Terms | SETUP | `/privacy`, `/terms` | static FE | OK drafts; counsel pending |
| 23 | Contact | SETUP | `/contact` | `POST /api/contact` | OK |
| 24 | Account profile | SETUP | `/account` | `/api/auth/current-user*` | OK |
| 25 | Staff planning | WEEKLY | `/planning` | `/api/restaurants/{id}/staff-planning*` | OK |
| 26 | Vacations / closures | WEEKLY | `/vacations` | `/api/restaurants/{id}/vacations*` | OK |
| 27 | Reports | WEEKLY | `/reports` | `/api/reports/summary` + CSV | OK |
| 28 | Hold expiry / reminders / outbox / GDPR | — | jobs | schedulers / workers | PARTIAL (some outbox stubs) |

---

## Happy paths (compressed)

### A. Owner same-day live (CORE)

1. `/register` → tokens  
2. `/onboarding` wizard → restaurant → tables → shifts → rules → booking → share → staff  
3. `/tables` → add tables  
4. `/shifts` + `/settings` hours → availability possible  
5. Enable booking → open `/r/{slug}` or embed  
6. Guest books → appears on floor  
7. Staff seats → completes / cancel / switch as needed  

### B. Guest book & cancel (CORE)

1. `/r/:slug` → availability → hold (timer)  
2. Confirm form → `POST /api/holds/confirm` → reservation + cancel token  
3. Details → cancel with cancel token (email deep-link supported)  

**Breaks if:** hold expires; restaurant billing access denied; details opened without cancel token.

### C. Floor service (CORE)

1. Login → restaurant context (`/select` + header)  
2. Dashboard → open reservation  
3. Seat / complete / no-show / cancel / switch (STAFF+)  
4. Walk-in from dashboard  

### D. Pay ~€50 (SETUP)

1. OWNER `/settings/billing` → Checkout  
2. Stripe → `/billing/success?session_id=`  
3. FE confirms session → ACTIVE (webhook also durable)

### E. Weekly ops (WEEKLY)

1. Planning — assign staff (MANAGER); STAFF read  
2. Vacations — STAFF request self leave; MANAGER approve; closures  
3. Reports — period summary + CSV  

---

## Sequence sketches

### Guest hold → confirm

```text
FE GuestBookingPage
  → GET /api/availability?restaurantSlug=
  → POST /api/holds          (billing access checked)
  → navigate confirm
FE ConfirmReservationPage
  → POST /api/holds/confirm  { holdToken, guest… }
BE ReservationService
  → DB reservation + cancel token
  → Outbox ReservationConfirmed → email (+ ICS)
```

### Admin cancel (STAFF+)

```text
FE ReservationActions (permissions: STAFF+)
  → POST /api/admin/reservations/{id}/cancel?restaurantId=
BE ReservationAdminController @PreAuthorize STAFF
BE ReservationAdminService.cancel @PreAuthorize STAFF
```

### Billing success

```text
FE BillingSettingsPage → POST .../checkout-session → Stripe
Stripe → /billing/success?session_id=
FE BillingSuccessPage → POST /api/billing/checkout/confirm
BE webhook: claim → route → done|failed
```

---

## Cross-cutting contracts

| Concern | Behavior |
|---------|----------|
| Auth | Bearer access (memory); refresh in `localStorage` |
| Tenant | `POST .../select` scoped JWT + `X-Restaurant-Id` |
| Guest cancel | Code + cancel token (header or query / deep-link) |
| Optimistic lock | Admin mutations: `If-Match` → 412 |
| 401 | FE silent refresh → login |
| 402 | OWNER → billing; non-OWNER clear “contact owner” copy |
| 429 | Rate limit + Retry-After |
| Billing gate (BE) | Guest holds/confirms check owner billing access |

---

## Remaining risks (priority)

| Priority | Issue | Notes |
|----------|-------|-------|
| P0 | Prod email smoke | Provider wiring exists; live smoke pending |
| P0 | Legal counsel / company entity | Routes are drafts |
| P0 | CI parked | `.github/ci-parked/` — not required on PRs yet |
| P0 | VPS cutover | Runbooks exist; secrets/purchase pending |
| P1 | PAST_DUE / dunning | Policy undefined |
| P1 | Outbox stubs | Some events still stubbed |
| P2 | Opening-hours vs closures UX | Warn vs create closure |
| P2 | Residual i18n | Some mixed labels possible |

---

## Doctrine: default product

| Keep in default UX | Do not market / do not expand |
|--------------------|-------------------------------|
| Register, onboard, tables, shifts/hours, staff invite | Deposits, SMS, waitlist, marketplace |
| Guest + embed book/cancel | Redis/audit jargon |
| **Dashboard** primary + walk-in + seat/complete/no-show + **STAFF** cancel/switch | Multi-plan matrices |
| **Planning, vacations, reports** | Heavy BI / HR suite depth |
| Settings + billing + Privacy/Terms | Fake analytics as product |

---

## Related docs

- Vision: [product-doctrine.md](product-doctrine.md)  
- Remediation history: [production-ready-plan.md](production-ready-plan.md)  
- Company readiness: [README.md](README.md)  
- Backend flows: [backend/flows.md](backend/flows.md)  
- Frontend flows: [frontend/flows.md](frontend/flows.md)  
- Technical audits: [backend/audit.md](backend/audit.md), [frontend/audit.md](frontend/audit.md)
