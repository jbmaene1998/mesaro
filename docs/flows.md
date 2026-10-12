# Mesaro — End-to-end functionality flows

**Audit date:** 2026-10-09 (code + **live runtime** re-audit)  
**Vision:** [product-doctrine.md](product-doctrine.md)  
**Plan:** [production-ready-plan.md](production-ready-plan.md)  
**Deep maps:** [backend/flows.md](backend/flows.md) · [frontend/flows.md](frontend/flows.md)

Cross-cutting view: how guests and restaurants move through the product, which FE routes hit which BE APIs, and what is broken vs the €50 simple SaaS doctrine.

---

## How to read this

| Tag | Meaning |
|-----|---------|
| **CORE** | Doctrine daily product — must work perfectly |
| **SETUP** | One-time / rare — keep simple |
| **WEEKLY** | Essential weekly ops (planning/vacations/reports) — keep in nav |
| **BROKEN** | FE↔BE mismatch, 403, or incomplete step (live-verified where noted) |
| **RISK** | Works but unsafe for paid scale |
| **OK** | Wired end-to-end for intended actors |
| **FLAKY** | Works after interaction / under some conditions |

---

## Live runtime (2026-10-09)

Stack: FE `:3000` · API `:8080` · seed `admin@demo.com` / `staff.demo@demo.com` · password `demo123`

| Probe | Result |
|-------|--------|
| OWNER login → `/dashboard` | OK — reservations, table map, multi-restaurant panel |
| Guest `/r/demo-restaurant` availability | OK — Lunch/Dinner slots |
| `POST /api/holds` → `POST /api/holds/confirm` | OK — confirmation code issued |
| STAFF `POST .../cancel` | **BROKEN** — 403 Access denied |
| Planning page first open | **FLAKY** — totals 0 until “Hoy” |
| Planning after “Hoy” | OK — week strip + assignments |
| Vacations staff tab (OWNER) | OK — pending/approved/rejected |
| STAFF create vacation | **BROKEN** — 403 |
| Reports | OK — summary + today timeline |
| Billing status | OK read; **quota inconsistent** (qty 1 vs 2 restaurants) |
| Billing success page | **BROKEN** — no confirm API call |
| Overnight “Sin turno activo” | Expected at ~00:20 Brussels; UX confusing with day bookings |

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
| 2 | Login / refresh / logout | SETUP | `/login` | `/api/auth/login\|refresh\|logout` | OK (logout: access JWT not denylisted) |
| 3 | Forgot / reset password | SETUP | `/forgot-password`, `/reset-password` | `/api/auth/forgot-password`, `/reset-password` | OK (email sync; outbox reset event stub) |
| 4 | Onboarding first restaurant | SETUP | `/onboarding/setup` | `POST /api/restaurants` | OK |
| 5 | Select restaurant context | SETUP | AppShell selector | Header `X-Restaurant-Id` only — `POST .../select` **unused** | **RISK** (live: select API works; FE skips it) |
| 6 | Tables + combinations | SETUP | `/tables` | `/api/restaurants/{id}/tables*` | OK (live) |
| 7 | Shifts | SETUP | `/shifts` | `/api/restaurants/{id}/shifts*` | OK (live) |
| 8 | Opening hours | SETUP | `/settings` hours tab | `PUT /api/restaurants/{id}/opening-hours` | OK (close = warn only) |
| 9 | Staff invite | SETUP | `/staff` | `POST /api/staff/invite` | OK |
| 10 | Accept invite | SETUP | `/accept-invite` | `POST /api/staff/accept-invite` | **RISK** — random password, no set-password |
| 11 | Availability | CORE | Guest booking | `GET /api/availability?restaurantSlug=` | OK (live) |
| 12 | Hold → confirm | CORE | `/r/:slug` → confirm | `POST /api/holds` → `POST /api/holds/confirm` | **RISK** — works live but **not billing-gated** |
| 13 | Guest details + cancel | CORE | `/r/:slug/reservation/:code` | `GET/POST /api/reservations/{code}*` + cancel token | OK with token; dead without |
| 14 | Embed booking | CORE | `/embed/:slug/...` | Same as guest | OK |
| 15 | Floor: dashboard / timeline / list | CORE | `/dashboard` primary | `/api/dashboard*`, `/admin/reservations` | OK (live); 3 surfaces vs “prefer one” |
| 16 | Walk-in / manual | CORE | dialogs | `POST /api/admin/reservations` | OK |
| 17 | Seat / complete / no-show | CORE | reservation detail | `POST .../seat\|complete\|noshow` | OK (STAFF+) |
| 18 | Cancel / switch tables | CORE | reservation detail | `POST .../cancel`, `.../switch` | **BROKEN** for STAFF — service MANAGER + FE permissions MANAGER (live 403) |
| 19 | Owner settings + embed | SETUP | `/settings` | restaurant PUT + hours | OK |
| 20 | Billing checkout / portal / quantity | SETUP | `/settings/billing` | `/api/restaurants/{id}/billing/*` | **RISK** webhook mark-before-process; seed qty vs count |
| 21 | Billing success return | SETUP | `/billing/success` | Should `POST /api/billing/checkout/confirm` | **BROKEN** — FE does not call (live code) |
| 22 | Contact | SETUP | `/contact` | `POST /api/contact` | OK |
| 23 | Account profile | SETUP | `/account` | `/api/auth/current-user*` | OK |
| 24 | Staff planning | WEEKLY | `/planning` | `/api/restaurants/{id}/staff-planning*` | **FLAKY** first paint; OK after “Hoy” (live) |
| 25 | Vacations / closures | WEEKLY | `/vacations` | `/api/restaurants/{id}/vacations*` | OWNER list OK; STAFF create **BROKEN** 403; closures tab empty |
| 26 | Reports | WEEKLY | `/reports` | `/api/reports/summary` + CSV | OK (live) |
| 27 | Hold expiry / reminders / outbox / GDPR | — | jobs | schedulers / workers | Partial (outbox mostly stubs) |

---

## Happy paths (compressed)

### A. Owner same-day live (CORE)

1. `/register` → tokens  
2. `/onboarding/setup` → create restaurant  
3. `/tables` → add tables  
4. `/shifts` + `/settings` hours → availability possible  
5. Enable booking → open `/r/{slug}` or embed  
6. Guest books → appears on floor  
7. Staff seats → completes  

**Contracts:** JWT + `X-Restaurant-Id` on admin; guest uses slug + hold/cancel tokens.  
**Friction:** steps 3–5 required before first live booking (not a 2-minute wizard).

### B. Guest book & cancel (CORE)

1. `/r/:slug` → availability → hold (timer)  
2. Confirm form → `POST /api/holds/confirm` → reservation + cancel token  
3. Details → cancel with `X-Cancel-Token`  

**Breaks if:** hold expires; details opened without cancel token (email deep-link incomplete).  
**Live:** hold+confirm OK; slots show `HH:mm:ss`.

### C. Floor service (CORE)

1. Login → restaurant context (header only today)  
2. Dashboard → open reservation  
3. Seat / complete / no-show  
4. Walk-in from dashboard  
5. Cancel / switch = **intended STAFF+**; **actual MANAGER+** (BROKEN vs doctrine)

### D. Pay ~€50 (SETUP)

1. OWNER `/settings/billing` → Checkout  
2. Stripe → `/billing/success?session_id=`  
3. **Expected:** FE confirms session → ACTIVE  
4. **Actual:** FE shows success only; depends on webhook (**RISK** + mark-before-process bug)

### E. Weekly ops (WEEKLY)

1. Planning — assign staff to lunch/dinner (MANAGER); STAFF read  
2. Vacations — STAFF request self leave; MANAGER approve; closures for holidays  
3. Reports — period summary + CSV  

**Live:** reports OK; planning flaky empty; STAFF vacation 403.

---

## Sequence sketches

### Guest hold → confirm

```text
FE GuestBookingPage
  → GET /api/availability?restaurantSlug=
  → POST /api/holds
  → navigate confirm
FE ConfirmReservationPage
  → POST /api/holds/confirm  { holdToken, guest… }
BE ReservationService
  → DB reservation + cancel token
  → Outbox ReservationConfirmed → email (+ ICS)
```

### Admin cancel (intended STAFF)

```text
FE ReservationActions (permissions today: OWNER|MANAGER only)
  → POST /api/admin/reservations/{id}/cancel?restaurantId=
BE ReservationAdminController @PreAuthorize STAFF
BE ReservationAdminService.cancel @PreAuthorize MANAGER  ← blocks STAFF (live 403)
```

### Billing (broken success path)

```text
FE BillingSettingsPage → POST .../checkout-session → Stripe
Stripe → /billing/success?session_id=
FE BillingSuccessPage → (no API) → dashboard
BE webhook OR unused POST /api/billing/checkout/confirm
```

---

## Cross-cutting contracts

| Concern | Behavior |
|---------|----------|
| Auth | Bearer access (memory); refresh in `localStorage` |
| Tenant | `X-Restaurant-Id`; FE does not call `/select` for scoped JWT |
| Guest cancel | Code + cancel token (header or query) |
| Optimistic lock | Admin mutations: `If-Match` → 412 |
| 401 | FE silent refresh → login |
| 402 | FE hard redirect `/settings/billing` (OWNER-only → **STAFF trap**) |
| 429 | Rate limit + Retry-After |
| Billing gate (BE) | Authenticated restaurant writes; **not** public holds |

---

## Broken / incomplete flows (priority)

| Priority | Issue | FE | BE | Live |
|----------|-------|----|----|------|
| P0 | Billing success does not confirm | `BillingSuccessPage` | Confirm endpoint unused | Yes |
| P0 | Webhook mark-before-process | — | `StripeWebhookController` | Code |
| P0 | No Privacy/Terms | routes missing | — | Yes |
| P1 | Guest booking not subscription-gated | — | Hold/confirm ignore billing | Yes |
| P1 | STAFF cancel/switch | permissions MANAGER | service MANAGER | Yes 403 |
| P1 | STAFF vacation self-serve | Vacations UI | service MANAGER | Yes 403 |
| P1 | Restaurant `/select` unused | context local-only | Select re-issues JWT | Yes |
| P1 | Accept-invite no password | Accept page | Random password hash | — |
| P1 | Seed maxRestaurants/qty vs 2 restaurants | — | seed + billing | Yes |
| P2 | Planning first paint empty | selectedDate/week queries | API OK | Yes |
| P2 | Closures tab empty | Vacations page | unified vacations API | Yes |
| P2 | 402 → STAFF on OWNER billing | `client.ts` | 402 correct | — |
| P2 | Mixed i18n ES/EN | dashboard/reports/guest | — | Yes |
| P2 | Guest slot seconds | booking UI | times as LocalTime | Yes |
| P2 | Go-live friction | Checklist multi-page | No single onboard API | — |
| P2 | Outbox stubs | — | Worker | — |

---

## Doctrine: default product

| Keep in default UX | Do not market / do not expand |
|--------------------|-------------------------------|
| Register, onboard, tables, shifts/hours, staff invite | Deposits, SMS, waitlist, marketplace |
| Guest + embed book/cancel | Redis/audit jargon |
| **Dashboard** primary + walk-in + seat/complete/no-show + **STAFF** cancel/switch | Multi-plan matrices |
| **Planning, vacations, reports** (finish bugs) | Heavy BI / HR suite depth |
| Settings + billing | Fake analytics as product |

---

## Related docs

- Vision: [product-doctrine.md](product-doctrine.md)  
- Remediation + live matrix: [production-ready-plan.md](production-ready-plan.md)  
- Company readiness: [README.md](README.md)  
- Backend flows: [backend/flows.md](backend/flows.md)  
- Frontend flows: [frontend/flows.md](frontend/flows.md)  
- Technical audits: [backend/audit.md](backend/audit.md), [frontend/audit.md](frontend/audit.md)
