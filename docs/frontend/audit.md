# Mesaro frontend — deep audit

**Audit date:** 2026-10-09 (static + **live browser**)  
**Scope:** `frontend/` (React + Vite SPA + Playwright)  
**Purpose:** Founder-grade product/UX due diligence — features, gaps, bugs, launch blockers  
**Vision:** [../product-doctrine.md](../product-doctrine.md) — €50 simple reservation SaaS (canonical)  
**Flows:** [flows.md](flows.md) · [../flows.md](../flows.md)  
**Plan:** [../production-ready-plan.md](../production-ready-plan.md)

Parent overview: [../README.md](../README.md)

---

## Live UI audit — 2026-10-09

Stack: `http://localhost:3000` · logged in as `admin@demo.com` · locale often ES

| Surface | Result |
|---------|--------|
| `/login` → `/dashboard` | OK — Dashboard is home; live table map; “Sin turno activo” overnight |
| `/r/demo-restaurant` | OK — availability; times show `HH:mm:ss`; title/branding mixed |
| `/planning` first paint | **Broken UX** — totals 0, “No hay dia seleccionado” |
| `/planning` after **Hoy** | OK — week strip, assign, weekly hours |
| `/vacations` staff tab | OK for OWNER — pending/approved/rejected |
| `/vacations` closures tab | Empty list |
| `/reports` | OK — summary, trend, today timeline, CSV button |
| Floor status chips | **i18n leak** — “Free”, “Reserved later”, “New Reservation”, “Confirmed” in EN while nav ES |
| `BillingSuccessPage` | Comment claims confirm; **no API call** |
| `permissions.ts` | `cancelReservation` / `switchTables` = OWNER\|MANAGER only (blocks STAFF UI) |
| `restaurant-context` select | Local id only — does **not** call `POST .../select` / scoped token |

---

## Vision lens (read first)

Marketing already sells **€49.99 flat**. Doctrine says the differentiator is **simplicity** — and (amended 2026-10-09) weekly planning/vacations/reports stay in nav and must **work**, without being marketed as an HR/BI suite.

| Sell & default-nav (doctrine) | Engineering debt (not “hide”) |
|-------------------------------|-------------------------------|
| Marketing → register → onboard → tables/shifts → guest/embed → **Dashboard** floor (STAFF cancel/switch) → staff → **planning / vacations / reports** → settings/billing | Fix first-paint bugs, role gates, i18n; strip Redis/audit jargon from pricing |

**Product work:** finish broken essentials; do not add deposits/SMS/waitlist/guest modify unless doctrine changes.

---

## Executive summary

The frontend is a **near-MVP product surface**, not a shell: marketing → register → onboarding → floor ops → guest/embed booking → reports → Stripe checkout wiring. Craft signals are real (Axios envelope, 401 refresh, 402→billing, role gates, embed widget).

**Live browser audit** shows Dashboard/Reports/guest booking largely work, but planning first paint, STAFF floor permissions, billing success honesty, Privacy/Terms, and i18n leaks fail the launch bar.

**Verdict:** Demoable for OWNER pilots. Do **not** present as production-ready EU SaaS until Privacy/Terms, billing confirm, STAFF floor actions, and weekly-module polish are fixed.

---

## Stack

| Item | Evidence |
|------|----------|
| React 18 + TypeScript + Vite | `package.json` |
| TanStack Query, React Router v6, Zod, Radix/shadcn-style UI | `src/` |
| i18n | `i18n/messages.ts` — 132 keys × 4 locales (en/nl/fr/es) parity in catalog |
| E2E | Playwright under `testing/e2e/` (~33 specs) |
| Unit | Vitest under `testing/unit/` (~14 files) |

---

## Routes & auth gates

**Source:** `src/routes/index.tsx`, `ProtectedRoute.tsx`, `RoleRoute.tsx`

| Path | Layout | Gate |
|------|--------|------|
| `/`, `/features`, `/pricing`, `/about`, `/faq`, `/contact` | Marketing | Public |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/accept-invite` | Auth | Public |
| `/r/:slug` (+ confirm / reservation) | Guest | Public |
| `/embed/:slug` (+ confirm / reservation) | Widget | Public |
| `/dashboard`, `/account`, `/timeline`, `/reservations`, `/vacations` | AppShell | Auth |
| `/planning` | AppShell | Auth + STAFF+ |
| `/reports`, `/tables`, `/shifts`, `/staff` | AppShell | Auth + MANAGER+ |
| `/settings`, `/settings/billing` | AppShell | Auth + OWNER |
| `/billing/success`, `/billing/cancel` | Bare | Public (Stripe return) |
| `/onboarding/setup` | Bare | Auth; redirects if restaurants exist |
| `*` | — | → `/` (no real 404) |

Onboarding: users with zero restaurants are forced to `/onboarding/setup`.

---

## Feature maturity matrix

| Feature | Status | Key paths | Notes |
|---------|--------|-----------|-------|
| Marketing site | Done | `features/marketing/*` | SEO via `usePageMeta`; sitemap/robots |
| Auth (login/forgot/reset/invite) | Done | `features/auth/*` | Solid |
| Owner register | Done (misnamed) | `RegisterPlaceholderPage.tsx` | Works; legacy name; EN-only copy for all locales |
| Onboarding | Done | `OwnerRestaurantSetupPage`, checklist | OWNER dashboard checklist |
| Guest booking | Done | `GuestBookingPage`, confirm | Hold timer, ICS |
| Guest cancel | Partial | `ReservationDetailsPage` | Works; **no modify/reschedule**; FAQ contradicts |
| Embed widget | Done | `public/widget.js`, `/embed/*` | Settings snippets |
| Dashboard / live floor | Done | `DashboardPage` | Walk-in/manual, portfolio |
| Timeline | Done | `TimelinePage` | Mobile degraded to list (honest) |
| Reservations lifecycle | Done | `reservations/*` | Seat, complete, no-show, cancel, switch table |
| Tables + combinations | Done | `tables/*` | |
| Shifts | Done | `shifts/*` | |
| Staff planning | Done | `planning/*` | |
| Staff invite/roles | Done | `staff/*` | |
| Vacations / closures | Done | `vacations/*` | |
| Settings + booking config | Done | `SettingsPage` | Assignment mode **AUTO-only** (UI disabled) |
| Multi-restaurant create | Partial | Settings Locations | Create + quota; **no archive UI** |
| Billing / Stripe | Partial / Risky | `billing/*`, `api/billing.ts` | Success page incomplete |
| Reports / CSV | Done | `ReportsPage` | |
| Account | Done | `AccountPage` | |
| Analytics consent | Partial | consent banner + `lib/analytics.ts` | EN-only banner; no privacy link |
| Legal (Privacy/Terms) | **Missing** | — | Hard blocker for EU B2B |
| Guest modify booking | **Missing** | — | |
| MANUAL assignment mode | **Missing** | Settings hardcodes AUTO | |
| Dead code | Risky | `route-placeholders.tsx`, `BookingPage.tsx` | Not routed |

---

## Critical UX / bugs / risks

### P0 — Launch / trust / money

1. **Billing success does not confirm Stripe session**  
   - `BillingSuccessPage.tsx` reads `session_id` and shows success copy; **no API call**  
   - File comment claims proactive backend confirm  
   - E2E (`billing-success.spec.ts`) appears written for a confirm API that is not called  
   - **Risk:** webhook delay → “You’re all set” while access still 402  

2. **Refresh token in `localStorage`** (`auth-context.tsx`)  
   - Access token in memory is good; refresh persistence enables XSS session theft  
   - Acceptable for many MVPs only with strict XSS/CSP hygiene (not documented)  

3. **FAQ false claim on guest cancel** (`FaqPage.tsx`) vs shipped cancel  
   - Trust/support risk; also under-sells a shipped feature  

4. **No Privacy Policy / Terms routes** while marketing claims GDPR  
   - Hard blocker for EU B2B sales and Stripe trust  

### P1 — Multi-tenant / SaaS correctness

5. **`selectRestaurant` API unused; `setScopedAccessToken` never called**  
   - Context only sets local restaurant id + `X-Restaurant-Id`  
   - If backend expects scoped JWT, switch is silently wrong; if header-only is intentional, dead code remains  

6. **Billing downgrade copy references “archive restaurants” with no UI**  

7. **402 redirects to `/settings/billing` (OWNER-only)**  
   - STAFF/MANAGER mid-flow get Access Denied with little explanation  

8. **Sitemap `?lang=` hreflang not implemented** in the app  

### P2 — Product / UX / quality

9. Register page still named `RegisterPlaceholderPage`; EN-only for nl/fr/es  
10. Billing UI English-only + ad-hoc gray CSS (outside design system / i18n)  
11. Dashboard live status labels hardcoded English  
12. `document.documentElement.lang` never updated → ErrorBoundary locale stuck on `en`  
13. Consent banner English-only; calls analytics “cookies” while storage is `localStorage`  
14. Guest Zod validation messages English-only on confirm  
15. Wildcard `*` → home hides 404  

### P3 — Polish / hygiene

16. Dead placeholders / unused booking page  
17. `VITE_STRIPE_PUBLISHABLE_KEY` in `.env.example` unused (redirect Checkout — OK, docs noise)  
18. `index.html` title still “Mesaro Frontend” until SPA meta overrides  
19. Playwright baseURL vs `npm run dev` port mismatch (e2e spins own server)  
20. `tmp-seed-login.spec.ts` looks temporary  

---

## Missing functionality — filtered by doctrine

### Real gaps (needed for the €50 simple product)

- Privacy + Terms + honest FAQ  
- Billing success confirm (wire the API the comment already promises)  
- STAFF cancel/switch permissions aligned with doctrine  
- Planning first-paint (selectedDate = today; wait for restaurant id)  
- Marketing copy that sells **outcomes**, not Redis/audit  
- Cancel deep-links that work without sessionStorage only  
- Non-owner 402 UX that doesn’t strand staff  
- Wire `/select` + scoped access token on restaurant switch  
- i18n for floor tags + guest slot `HH:mm`  
- Optional: archive/pause **or** fix seed/quantity so multi-location billing matches reality  
- Mobile-first **Dashboard** floor  

### Intentionally not missing

- Deposits, SMS, waitlist, loyalty, marketplace  
- Guest modify/reschedule — only if pilots demand; keep optional and simple  
- MANUAL assignment mode — not required for wedge  
- Hiding planning/vacations/reports (doctrine: keep + finish)  

### Multi-tenant / billing (keep minimal)

**Have:** list, selector, create locations, Checkout, Portal, quantity  
**Live seed bug:** `maxRestaurants` / `currentQuantity` = 1 while 2 restaurants exist  
**Doctrine preference:** multi-location stays “same simple product × N”, not a new console  

---

## Design system & quality

| Topic | Finding |
|-------|---------|
| Components | Radix + shadcn-style under `components/ui/*`; marketing/billing often raw Tailwind |
| i18n catalog | 132 keys × 4 locales — parity OK |
| i18n reality | Many features use local `COPY`; register + billing + some labels incomplete |
| a11y | Labels, `aria-invalid`, some `aria-live`; Access Denied not i18n |
| Mobile | AppShell drawer; timeline warns on mobile; several e2e at 375×812 |
| Error boundaries | AppShell + section boundaries |
| Loading / empty | Shared `EmptyState`, skeletons on major pages |
| SEO | CSR thin shell for crawlers; sitemap lang mismatch; no default OG image; `robots` Disallow `/register` (odd for acquisition) |
| Types | No `@ts-ignore` / heavy `any` in features (good) |

---

## API client contracts

**Files:** `src/api/client.ts`, `src/api/types.ts`

| Contract | Implementation |
|----------|----------------|
| Envelope `{ success, data, error, … }` | Parsed into `AppError` |
| Bearer auth | Request interceptor |
| `X-Restaurant-Id` | When restaurant selected; skipped for auth + `/select` |
| 401 | Single-flight refresh → login |
| 429 | Toast + one retry with `Retry-After` |
| 402 | Hard redirect billing settings |

**Risky assumption:** multi-tenancy via header without `/select` scoped token.

---

## Client security

| Item | Assessment |
|------|------------|
| Access token | In-memory — good |
| Refresh token | `localStorage` — XSS-sensitive |
| Restaurant id | `localStorage` — must be enforced server-side |
| Cancel tokens | `sessionStorage` + query/nav — email must carry token |
| Analytics | Consent-gated; strips sensitive query keys |
| Widget | `referrerPolicy=no-referrer`; no CSP docs in FE |
| PII in UI | Expected for booking/ops; no client encryption |

---

## Test gaps

**E2E present:** marketing, auth, onboarding, dashboard, timeline, reservations, staff, shifts, planning, vacations, reports, settings, billing, account, embed, guest booking/cancel, admin lifecycle, role permissions.

**Gaps / drift:**

- Billing success tests ≠ implementation  
- Many suites mock APIs (smoke), few need live `E2E_*` secrets — not full CI without backend  
- Missing: multi-restaurant → quantity checkout, guest modify, restaurant switch under load, 402 for STAFF, privacy/consent legal, full register→first guest book seed  
- Unit coverage light on planning/settings/billing pages  
- Quarantine `tmp-seed-login.spec.ts`  

CI: `.github/workflows/e2e.yml` has an explicit **backend startup stub** — E2E does not start the API.

---

## Production readiness checklist

| Item | Status |
|------|--------|
| `VITE_API_URL` | Documented |
| Build | `tsc -b && vite build` |
| Analytics flag | `VITE_ANALYTICS_API_ENABLED` |
| Stripe publishable key | In env example, unused by FE |
| Embed | `widget.js` + Settings snippets |
| SEO | Partial |
| Legal pages | **Missing** |
| Error monitoring (Sentry) | Not present |
| CSP / security headers | Not in FE repo |

---

## Recommended 30 / 60 / 90 (frontend)

Aligned with [product-doctrine.md](../product-doctrine.md).

### Days 0–30 (launch + look like the vision)

- Stripe session confirm on `/billing/success`; fix e2e  
- Privacy + Terms (+ footer); FAQ honesty; consent → privacy  
- **Default AppShell nav = doctrine core only**; hide/bury planning, vacations, reports  
- Pricing/home: remove infra jargon; sell floor + bookings + €50  
- Rename register page; localize register + billing  
- `html lang`; remove dead placeholders / tmp e2e  
- Select JWT: wire or delete  

### Days 31–60 (simple conversion)

- Harden 402 for non-owners; calm trial/past-due banners  
- Cancel deep-links that just work  
- Unify billing UI with design system (still one plan)  
- E2E: register → onboard → embed/book → floor action  
- Guest reschedule **only if pilots ask** — one short flow, not a suite  

### Days 61–90 (deepen wedge)

- Mobile-first floor / service mode  
- a11y pass; accurate consent wording  
- **Do not** add deposits, SMS, MANUAL mode, or notification platforms unless doctrine is amended  

---

## Bottom line

You have a **credible booking + floor UI**. The risk is not “too little product” — it is **looking like the complex tools you undercut on price**.

Ship legal + billing truth, then **make the default product as small as the promise**.
