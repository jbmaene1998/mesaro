# Mesaro frontend — functional flow audit

**Status date:** 2026-10-12 (code rescore) · historical live browser: 2026-10-09  
**Source:** `frontend/src/routes/index.tsx`, feature pages, `api/*`  
**Vision:** [../product-doctrine.md](../product-doctrine.md)  
**Cross-cut:** [../flows.md](../flows.md) · Technical: [audit.md](audit.md) · Plan: [../production-ready-plan.md](../production-ready-plan.md)

> Prefer this snapshot and [../flows.md](../flows.md) over older “BROKEN / unused” rows deeper in the file if they disagree.

---

## Status snapshot (2026-10-12)

| Flow | Status |
|------|--------|
| Login → Dashboard home | OK |
| Guest availability | OK (`HH:mm` labels) |
| Planning cold-load | OK (today init) |
| Vacations staff + STAFF self-request | OK |
| Reports | OK |
| Billing success confirm | OK (`confirmCheckout`) |
| Cancel/switch permissions | STAFF+ |
| Privacy / Terms | OK routes (drafts) |
| Restaurant select + scoped token | OK |
| Residual i18n | PARTIAL |

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Complete** | UI + APIs wired |
| **Partial** | Usable with gaps |
| **Broken** | Likely fails for intended user |
| **Dead** | Not routed / unused client |

**Roles:** `STAFF` < `MANAGER` < `OWNER` (`RoleRoute`, `lib/permissions.ts`)

---

## Route map

| Path | Gate | Surface |
|------|------|---------|
| `/`, `/features`, `/pricing`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms` | Public | Marketing |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/accept-invite` | Public | Auth |
| `/r/:slug` (+ confirm / reservation) | Public | Guest |
| `/embed/:slug` (+ …) | Public | Widget |
| `/dashboard`, `/account`, `/timeline`, `/reservations`, `/reservations/:id`, `/vacations` | Auth | App (Dashboard = primary floor) |
| `/planning` | Auth + STAFF+ | Weekly essential |
| `/reports` | Auth + MANAGER+ | Weekly essential |
| `/tables`, `/shifts`, `/staff` | Auth + MANAGER+ | Setup |
| `/settings`, `/settings/billing` | Auth + OWNER | Setup |
| `/onboarding/setup` | Auth; skip if has restaurants | Setup |
| `/billing/success`, `/billing/cancel` | Public | Stripe return |
| `*` | → `/` | No real 404 |

---

## CORE / SETUP flows

### 1. Marketing → register → onboard → first booking — Complete (guided wizard)

| | |
|--|--|
| **Routes** | Marketing → `/register` → `/onboarding` wizard (restaurant → tables → shifts → rules → enable booking → share → optional staff) → `/dashboard` |
| **APIs** | `POST /auth/register`, `POST /restaurants`, tables CRUD, `POST /shifts/bulk`, restaurant PUT (rules + bookingEnabled), staff invite |
| **Friction** | Guided in-wizard create with templates/examples; resume banner on dashboard if incomplete. `/onboarding/setup` redirects to `/onboarding`. |

### 2. Login / forgot / reset — Complete

| Flow | Route | API |
|------|-------|-----|
| Login | `/login?returnUrl=` | `POST /auth/login` → refresh / current-user / restaurants |
| Forgot | `/forgot-password` | `POST /auth/forgot-password` |
| Reset | `/reset-password?token=` | `POST /auth/reset-password` |

0 restaurants after login → `/onboarding`.

### 3. Accept invite — Complete

`/accept-invite?token=` (legacy `/invite/accept` redirects) → `GET /staff/invites/preview` → set password if new → `POST /staff/accept-invite` → tokens → `/dashboard?tour=1` (STAFF/MANAGER first-day tour).

### 4. Restaurant context select — RISK / Partial

| | |
|--|--|
| **UI** | Selector / portfolio calls `restaurantContext.selectRestaurant(id)` |
| **Actual** | Sets local restaurant + `X-Restaurant-Id`; **does not** call `POST /restaurants/{id}/select` |
| **Select context** | `selectRestaurant` + `setScopedAccessToken` wired from restaurant context |

### 5. Guest book → confirm → details → cancel (+ embed) — Complete

| Step | Route | API |
|------|-------|-----|
| Pick slot | `/r/:slug` or `/embed/:slug` | `GET /availability`, `GET /availability/closed`, `POST /holds` |
| Confirm | `.../confirm/:holdToken` | `POST /holds/confirm` |
| Details / cancel | `.../reservation/:code` | `GET\|POST /reservations/{code}` + `X-Cancel-Token` |

Cancel needs token from session / nav / query — **Partial** if email link omits token.  
**Dead:** `BookingPage.tsx`, `route-placeholders.tsx` (unrouted).

### 6. Floor: dashboard / timeline / list — Complete (3 surfaces)

| Surface | Route | Main APIs |
|---------|-------|-----------|
| Dashboard | `/dashboard` | `/dashboard*`, live-service, portfolio, admin reservations, walk-in `POST /admin/reservations` |
| Timeline | `/timeline` | `GET /timeline` → detail |
| List / detail | `/reservations`, `/reservations/:id` | Admin CRUD + seat/complete/noshow/cancel/switch |

**Permissions (FE):** cancel/switch = OWNER/MANAGER only — **blocks STAFF UI** (doctrine wants STAFF+; BE service also MANAGER). Seat/complete/noshow/walk-in = STAFF+.  
 
**Doctrine:** three floor UIs vs “one clear floor view”.  
**Partial:** adapters often force empty `shifts: []`; `getUpcomingReservations` client unused.

### 7. Tables / shifts / staff — Complete (setup friction)

| Page | Gate | APIs |
|------|------|------|
| `/tables` | MANAGER+ | tables + combinations CRUD + status |
| `/shifts` | MANAGER+ | shifts CRUD (per weekday — heavy for €50) |
| `/staff` | MANAGER+ | invite, role, resend, remove |

### 8. Settings — Complete

`/settings` OWNER: profile, booking rules, embed snippet, extra restaurant, billing tab. Assignment mode UI locked to AUTO.

### 9. Billing — Partial (success Broken vs claim)

| Route | Behavior |
|-------|----------|
| `/settings/billing` | Status, Checkout, Portal, quantity — Complete UI |
| `/billing/success` | Calls `POST /api/billing/checkout/confirm` via `confirmCheckout` |
| `/billing/cancel` | Cancel landing → retry |

### 10. Account — Complete

`/account`: profile, change password (logout), delete account (password + type `DELETE`; owned restaurants soft-deleted then GDPR-purged).

### 11. Contact / analytics consent — Complete

Contact → `POST /contact`. Consent banner → optional `POST /analytics/events` if enabled.

---

## WEEKLY essential (keep in nav; finish bugs)

| Flow | Route | Status | Friction |
|------|-------|--------|----------|
| Staff planning | `/planning` | Partial — first paint empty (live); OK after Hoy | High |
| Vacations / closures | `/vacations` | OWNER list OK; closures empty; STAFF self-create **Broken** on BE | High |
| Reports + CSV | `/reports` | Complete (live) | Medium |

---

## Permission cheat sheet

| Permission | Roles |
|------------|--------|
| viewReservations, createWalkIn, updateStatus | OWNER, MANAGER, STAFF |
| cancelReservation, switchTables | OWNER, MANAGER today — **must become STAFF+** |
| manageTables/Shifts, inviteStaff, manageReports, closures | OWNER, MANAGER |
| inviteManager, manageSettings | OWNER |

---

## Dead / partial inventory

| Item | Status |
|------|--------|
| `RegisterPlaceholderPage` | Complete (misnamed) |
| `BookingPage.tsx`, `route-placeholders.tsx` | Dead |
| `selectRestaurant` API + scoped token | Wired |
| Billing success confirm | Wired (`confirmCheckout`) |
| Planning first paint | Flaky empty until Hoy |
| Guest slot labels | Shows seconds (`11:30:00`) |
| FAQ “cancel is roadmap” | Copy Broken vs product |
| Guest cancel without token | Partial by design |
| Timeline/dashboard shift summaries | Partial empty adapters |

---

## €50 vision friction

| Keep simple | Too heavy today |
|-------------|-----------------|
| Login, invite accept, guest book/cancel | Planning + recurring week |
| Walk-in + seat/complete | Vacations HR + reports |
| Tables + shifts + enable booking + share link | Combinations + etags + portfolio density |
| One billing plan Checkout/Portal | Three competing floor screens |

**Biggest go-live friction:** required tables + active shifts + `bookingEnabled` after create — not “live in minutes” without a guided path.

---

## Doctrine default nav (target)

**Show:** Dashboard (or one floor) · Reservations · Tables · Shifts · Staff · Settings/Billing · Account  
**Hide / More:** Planning · Vacations · Reports  
**Guest:** `/r` + embed only  
