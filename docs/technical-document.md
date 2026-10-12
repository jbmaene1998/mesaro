# Mesaro — Technical Document

**Audience:** engineers, founders, and operators who need one place that covers product, marketing site, architecture, APIs, data, and ops  
**Repo:** monorepo `backend/` + `frontend/` + `docs/`  
**Canonical product vision:** [product-doctrine.md](product-doctrine.md)  
**Last inventory:** 2026-10-12 (codebase + docs rescore) · historical live audit: 2026-10-09  
**Local stack (docs):** Frontend `:3000` / `:5173` · API `:8080` · local-prod `:9443` / `:18080`

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Repository structure](#2-repository-structure)
3. [Technology stack](#3-technology-stack)
4. [Marketing site (full read)](#4-marketing-site-full-read)
5. [Frontend application](#5-frontend-application)
6. [Backend application](#6-backend-application)
7. [Auth, roles, and tenancy](#7-auth-roles-and-tenancy)
8. [Core domain: booking engine](#8-core-domain-booking-engine)
9. [Floor ops, weekly modules, settings](#9-floor-ops-weekly-modules-settings)
10. [Billing and Stripe](#10-billing-and-stripe)
11. [Email, outbox, and background jobs](#11-email-outbox-and-background-jobs)
12. [i18n](#12-i18n)
13. [Security, rate limits, GDPR](#13-security-rate-limits-gdpr)
14. [Testing and CI](#14-testing-and-ci)
15. [Configuration, Docker, and deploy](#15-configuration-docker-and-deploy)
16. [Known gaps vs doctrine](#16-known-gaps-vs-doctrine)
17. [Related docs](#17-related-docs)

---

## 1. Product overview

Mesaro is a **multi-restaurant reservation SaaS** for independent restaurants and small groups.

> **Reservation software restaurants actually use — €50/month, no commission, no complexity.**

| Promise | Detail |
|---------|--------|
| Price | **€49.99 / restaurant / month** (marketing); doctrine target ~€50 flat |
| Model | Flat subscription — **no per-cover commission** |
| Trial | 14 days, no credit card |
| Staff / reservations | Unlimited at the same price |
| Multi-location | One login; **each restaurant billed once** |
| Channels | Guest page `/r/:slug` + **embed widget** `/embed/:slug` |

### What we sell (doctrine surface)

| Area | Capabilities |
|------|----------------|
| Guest | Book online, confirmation email (+ ICS), cancel with token |
| Floor | Dashboard (primary), walk-in, seat / complete / no-show / cancel / switch |
| Setup | Tables (+ combinations), shifts / opening hours, staff roles |
| Weekly | Staff planning, vacations / closures, simple reports + CSV |
| Trust | No double booking (holds/overlaps under the hood) |

### Explicitly out of scope (v1)

Deposits, SMS/WhatsApp, waitlist, guest loyalty accounts, marketplace / Google Reserve / OTAs, multi-plan feature matrices, heavy BI, marketing of Redis/audit jargon as customer features.

### Demo logins (dev seed)

| User | Password |
|------|----------|
| `admin@demo.com` | `demo123` |
| `staff.demo@demo.com` | `demo123` |

---

## 2. Repository structure

```text
Mesaro/
├── backend/                 # Spring Boot API (Maven)
│   ├── src/main/java/com/mesaro/
│   ├── src/main/resources/application*.yml
│   ├── src/main/resources/db/migration/   # Flyway V1–V54+
│   ├── src/main/resources/db/seed/        # Dev demo data
│   ├── docker-compose*.yml
│   └── Dockerfile
├── frontend/                # React + Vite SPA
│   ├── src/features/        # Feature modules (incl. marketing)
│   ├── src/routes/
│   ├── src/api/
│   ├── src/stores/
│   ├── src/i18n/
│   └── testing/             # Vitest + Playwright
├── docs/                    # Doctrine, audits, this document
├── scripts/                 # Utility scripts (incl. GitHub bootstrap)
├── .github/                 # PR/issue templates, CODEOWNERS, release notes
│   └── ci-parked/           # Backend CI + E2E workflows (not active yet)
└── run-*.ps1                # Local helper scripts
```

| Artifact | Identity |
|----------|----------|
| Backend | `com.mesaro:mesaro-api` — Multi-Restaurant Reservation System API |
| Frontend | `mesaro-frontend` `0.1.0` |

---

## 3. Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite 5, React Router 6, TanStack Query 5, Axios, Zod, React Hook Form, Tailwind 3, Radix UI, Sonner, date-fns |
| Backend | Spring Boot **3.5**, Java **21**, Spring Web / Security / Data JPA / Validation / Mail / Actuator, JWT (jjwt), springdoc OpenAPI |
| Database | PostgreSQL 15, Flyway, Hibernate `ddl-auto: validate` |
| Session / cache | Redis 7 + Spring Session (optional `SESSION_STORE_TYPE=none` in dev) |
| Payments | Stripe Java SDK; FE `VITE_STRIPE_PUBLISHABLE_KEY` |
| Email | Provider switch: `log` / `resend` / `smtp` |
| Observability | Actuator (+ Prometheus on management port **9090**), Micrometer, optional Elasticsearch logging |
| i18n | Custom React context — locales `en`, `nl`, `fr`, `es` |
| Testing | Backend: JUnit + Testcontainers · Frontend: Vitest + Testing Library + MSW · E2E: Playwright |
| Jobs | **No Celery** — Spring `@Scheduled` + outbox worker |

---

## 4. Marketing site (full read)

Marketing is a **static React site** inside the SPA — **no CMS**. Copy lives in per-page `COPY` objects keyed by locale (`en` / `nl` / `fr` / `es`). Layout, SEO, contact API, and page content are documented below.

### 4.1 Shell and navigation

| Item | Detail |
|------|--------|
| Layout | `frontend/src/components/layout/MarketingLayout.tsx` |
| Routes | Wrapped in `<Route element={<MarketingLayout />}>` in `frontend/src/routes/index.tsx` |
| Nav links | `/` · `/features` · `/pricing` · `/about` · `/faq` · `/contact` |
| CTAs | Login / Register (or “Go to dashboard” when authenticated) |
| Locale | Selector in marketing header; uses shared i18n |
| Footer | Brand tagline via `marketing.footerTagline` |

Shared marketing UI components under `frontend/src/features/marketing/components/`:

| Component | Role |
|-----------|------|
| `CtaBanner` | Bottom-of-page trial CTA |
| `FaqAccordion` | Expandable FAQ lists |
| `SectionBlock` | Section eyebrow / title / lead |
| `FeatureCardGrid` | Feature card layouts |
| `PricingTierCards` | Plan card presentation |
| `PricingComparisonTable` | Mesaro vs commission alternative |

### 4.2 SEO and page meta

Hook: `frontend/src/features/marketing/hooks/usePageMeta.ts`

| Concern | Behavior |
|---------|----------|
| Title | `{pageTitle} \| Mesaro` |
| Description | Meta description per page |
| Open Graph | `og:title`, `og:description`, `og:type=website`, optional `og:image` |
| Twitter | `summary` or `summary_large_image` |
| Canonical | Default `https://mesaro.com` + pathname |
| hreflang | Optional alternate locale links |
| JSON-LD | Optional structured data script |

Site constant: `SITE_URL = "https://mesaro.com"`.

### 4.3 Contact API (only marketing backend call)

| Item | Detail |
|------|--------|
| FE | `submitContactLead` in `frontend/src/features/marketing/api.ts` |
| BE | `POST /api/contact` (public) |
| Body | `firstName`, `lastName`, `email`, `restaurantName?`, `message` |
| UX | React Hook Form + Zod; analytics event on submit |

### 4.4 Page inventory

| Path | File | Purpose |
|------|------|---------|
| `/` | `features/marketing/pages/HomePage.tsx` | Hero, problem, benefits, features teaser, pricing teaser, FAQ teaser, CTA |
| `/features` | `features/marketing/FeaturesPage.tsx` | Reservations, widget, shifts, roles, dashboard, multi-location |
| `/pricing` | `features/marketing/PricingPage.tsx` | €49.99 plan, comparison table, onboarding steps, pricing FAQ |
| `/about` | `features/marketing/AboutPage.tsx` | Origin story, values, audience |
| `/faq` | `features/marketing/FaqPage.tsx` | Categorized FAQ (pricing, features, widget, setup, multi-location, staff, technical, GDPR, support) |
| `/contact` | `features/marketing/ContactPage.tsx` | Lead form + “what happens next” |

E2E coverage: `marketing-home`, `marketing-features`, `marketing-pricing`, `marketing-about`, `marketing-faq`, `marketing-contact` specs under `frontend/testing/e2e/`.

---

### 4.5 Home (`/`)

**Positioning (EN):** Front desk stops taking calls at 7pm — Mesaro does not. Flat **€49.99/month**, no per-cover commission.

| Section | Content summary |
|---------|-----------------|
| Meta | “Restaurant Reservation Software Without Commission”; trial + no card |
| Hero | Badge (10 years hospitality); trust line; bullets: trial, own URL/widget, real-time holds, shifts, RBAC |
| Side panel | “What changes when you switch” — holds, foresight, flat price |
| Problem | Lost phone bookings; commission math (€1.50 × covers); double booking |
| Benefits | Timed holds; service timeline visibility; own URL / no marketplace |
| Features grid | Availability, embed widget, shifts/hours, roles, multi-location, audit log |
| Pricing teaser | €49.99 / restaurant / month → link to `/pricing` |
| FAQ teaser | Saturday safety (Redis holds), staff training, etc. → `/faq` |
| Trust stats | “Numbers that hold up on a Saturday night” |
| Final CTA | Trial CTA via `CtaBanner` |

**Doctrine tension (document honestly):** Home/Features/Pricing copy mentions **Redis** and **audit log** as customer-facing benefits. Product doctrine says marketing should not sell engineering jargon — prefer “no double bookings” outcomes. Treat Redis/audit mentions as copy debt when aligning marketing to doctrine.

---

### 4.6 Features (`/features`)

| Block | Message |
|-------|---------|
| Hero | Tools front-of-house actually uses; “1,200+ restaurants” trust line in EN copy |
| Reservations | Redis timed holds; live availability; `/r/your-slug`; manual phone entry; audit trail |
| Widget | Single iframe; WordPress/Squarespace/Wix/custom; mobile; no marketplace redirect |
| Scheduling | Lunch/dinner shifts; capacity; holidays/closures; only real hours shown |
| Roles | Owner (full + billing) · Manager (ops, no billing) · Front-of-house (shift + today’s list) |
| Dashboard | Timeline of tables/shifts; weekly/monthly covers, occupancy, no-shows |
| Multi-location | Switch in nav; separate floor/shifts/staff; staff scoped to assignment |
| CTA | 14-day trial, no card |

---

### 4.7 Pricing (`/pricing`)

| Element | Detail |
|---------|--------|
| Headline | **€49.99 per month. Everything included.** |
| Comparison | Mesaro vs commission alternative (base, per-cover, 1k/3k covers cost, data sharing, marketplace, custom URL) |
| Plan name | Restaurant Plan |
| Highlights | Unlimited reservations & staff; widget; Redis holds; shifts/closures; timeline stats; audit log; ICS emails; 14-day trial; cancel anytime |
| Onboarding | 1 Account → 2 Restaurant setup → 3 Embed → 4 Go live (same day) |
| FAQ | Trial honesty; multi-restaurant = N × €49.99; mid-month cancel; no seat fees; **30-day data window after cancel** |
| CTA | Free trial |

**Multi-location billing (marketing claim):** three restaurants → **€149.97/month** under one login.

---

### 4.8 About (`/about`)

| Block | Message |
|-------|---------|
| Hero | Reservations are an **operations** problem; built on 10+ years hospitality |
| Why we exist | Marketplaces optimize for commission volume; Mesaro answers ops questions (holds, closures, after-book) |
| Values | Confirmed = hold-backed; flat €49.99 forever promise; guest data stays with restaurant |
| Audience | Independent 1–3 locations; multi-location operators wanting simple RBAC + reporting |
| CTA | 14 days free, no sales call |

---

### 4.9 FAQ (`/faq`)

Categories (EN ids):

| Category | Topics covered |
|----------|----------------|
| Pricing & Billing | €49.99, trial, no card, multi-location math, cancel, no annual discounts |
| Features & Functionality | Double booking / Redis holds, phone bookings, table combinations, **dashboard refresh (no live push)**, reporting, closures |
| Booking Widget & Guest Experience | iframe embed, `/r/:slug` flow, confirmation + ICS, guest cancel, mobile |
| Setup & Migration | ~30 minutes live; no automated import; migrate from Zenchef/Resengo/Formitable manually |
| Multi-location | One login; cross-location staff with per-restaurant roles; no hard restaurant limit |
| Staff & Roles | Owner / Manager / Staff; invite by email; immediate revoke; billing Owner-only |
| Technical & Reliability | 99.95% uptime claim; Postgres + Redis; downtime fallback (printed runsheet); not white-label; browsers; daily backups |
| GDPR & Data | EU hosting; restaurant owns guest data; 30-day post-cancel access then delete; DPA via contact |
| Support | Contact form; no phone support yet; help center “being built” |

**Honesty / drift flags (product vs FAQ):**

| Claim | Product reality |
|-------|-----------------|
| Guest cancel | Supported via confirmation code + cancel token + email deep-link — keep FAQ aligned |
| Invite → set password on first login | Accept-invite collects password for new users |
| Staff manage reservations in service | STAFF+ can cancel/switch (doctrine-aligned) |
| Redis as customer feature | Engineering detail; doctrine prefers outcome language |

---

### 4.10 Contact (`/contact`)

| Element | Detail |
|---------|--------|
| Promise | Response within **one business day** |
| Fields | First name, last name, work email, restaurant name (optional), message |
| Validation | Zod required fields + email format |
| Success / error | Inline status copy |
| Next steps | Reply → ask about covers/no-shows → live within the hour if fit |
| Secondary CTA | Self-serve trial |

---

### 4.11 Marketing → product funnel

```text
Marketing pages
    → /register (trial)
    → /onboarding/setup (restaurant)
    → /tables + /shifts + /settings (hours + embed)
    → Guests: /r/:slug or /embed/:slug
    → Floor: /dashboard
    → Pay: /settings/billing → Stripe → /billing/success
```

**Legal routes:** `/privacy` and `/terms` are live (founder drafts). Counsel review + company entity remain before paid ads — see [README.md](README.md).

---

## 5. Frontend application

### 5.1 Route map

#### Marketing — §4

#### Auth (`AuthLayout`)

| Path | Page |
|------|------|
| `/login` | Login |
| `/register` | Register |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password |
| `/accept-invite` | Accept staff invite |

#### Guest booking (`GuestLayout`)

| Path | Page |
|------|------|
| `/r/:slug` | Availability + start hold |
| `/r/:slug/confirm/:holdToken` | Confirm guest details |
| `/r/:slug/reservation/:code` | Details / cancel |

#### Embed (`WidgetLayout`)

Same booking components under `/embed/:slug/...` (compact chrome + locale).

#### Authenticated app (`ProtectedRoute` + `AppShell`)

| Path | Min role (route) | Page |
|------|------------------|------|
| `/dashboard` | any | Floor primary |
| `/timeline` | any | Timeline |
| `/reservations`, `/reservations/:id` | any | List / detail |
| `/planning` | STAFF+ | Staff planning |
| `/reports` | MANAGER+ | Reports |
| `/tables` | MANAGER+ | Tables |
| `/shifts` | MANAGER+ | Shifts |
| `/staff` | MANAGER+ | Staff |
| `/vacations` | any | Vacations / closures |
| `/settings` | OWNER | Restaurant settings |
| `/settings/billing` | OWNER | Billing |
| `/account` | any | Profile |
| `/onboarding/setup` | owner setup | First restaurant |
| `/billing/success`, `/billing/cancel` | public return | Stripe redirects |

### 5.2 Feature modules

`account` · `auth` · `billing` · `booking` · `dashboard` · `marketing` · `onboarding` · `planning` · `reports` · `reservations` · `settings` · `shifts` · `staff` · `tables` · `timeline` · `vacations`

### 5.3 Client contracts

| Concern | Behavior |
|---------|----------|
| API client | `frontend/src/api/client.ts` — Axios |
| Auth header | `Authorization: Bearer <access>` |
| Tenant | `X-Restaurant-Id` |
| Tokens | Access in memory; refresh in `localStorage` |
| 401 | Silent refresh → login |
| 402 | Redirect `/settings/billing` (OWNER-only page — STAFF can get stuck) |
| 429 | Retry-After aware |
| Optimistic lock | Admin mutations may send `If-Match` → 412 |

### 5.4 FE permission matrix (`src/lib/permissions.ts`)

| Permission | Roles (current code) |
|------------|----------------------|
| viewReservations, createWalkIn, updateStatus | OWNER, MANAGER, STAFF |
| cancelReservation, switchTables | OWNER, MANAGER, STAFF |
| manageShifts, manageTables, inviteStaff, manageReports, approveVacation, createClosure | OWNER / MANAGER |
| manageSettings | OWNER |

Default nav (`AppShell`): Dashboard · Timeline · Reservations · Tables · Shifts · Planning · Staff · Vacations · Reports · Settings.

---

## 6. Backend application

### 6.1 Packages (`com.mesaro.*`)

`analytics` · `audit` · `auth` · `availability` · `billing` · `common` · `config` · `contact` · `dashboard` · `email` · `gdpr` · `health` · `hold` · `infra` · `logging` · `openinghours` · `outbox` · `planning` · `ratelimit` · `report` · `reservation` · `restaurant` · `security` · `shift` · `staff` · `table` · `user` · `vacation`

Patterns: JPA entities, request/response records, `@RestController`, `@PreAuthorize`, Flyway (including DB triggers), `@Scheduled`.

Base API prefix: **`/api`**. Envelope: `ApiResponse<T>`. Docs: `/swagger-ui.html`, `/v3/api-docs`.

### 6.2 Public endpoints (no JWT)

| Method | Path |
|--------|------|
| GET | `/api/health` |
| GET | `/api/availability`, `/api/availability/closed` |
| POST | `/api/holds`, `/api/holds/{token}/confirm`, `/api/holds/confirm` |
| GET | `/api/reservations/{code}` |
| POST | `/api/reservations/{code}/cancel` |
| POST | `/api/analytics/events` |
| POST | `/api/contact` |
| POST | `/api/auth/login\|register\|refresh\|logout\|forgot-password\|reset-password` |
| POST | `/api/staff/accept-invite` |
| POST | `/api/webhooks/stripe` |
| GET | `/actuator/health/**` |

### 6.3 Authenticated surface (summary)

| Area | Paths |
|------|-------|
| Auth profile | `/api/auth/current-user`, change-password |
| Restaurants | CRUD `/api/restaurants`, opening-hours, `POST .../select`, `/api/context` |
| Admin reservations | `/api/admin/reservations` (+ seat/complete/noshow/cancel/switch) |
| Tables / combinations | `/api/restaurants/{id}/tables*`, `/api/tables/{id}`, combinations |
| Shifts | `/api/restaurants/{id}/shifts*`, `/api/shifts/{id}` |
| Staff | `/api/staff`, invite, resend, accept-invite |
| Planning | `/api/restaurants/{id}/staff-planning*`, assignments, recurring-week, work-hours |
| Vacations | `/api/restaurants/{id}/vacations*`, approve/reject |
| Reports | `/api/reports/summary`, `/api/reports/export.csv` |
| Dashboard | `/api/dashboard*`, stats, timeline, portfolio |
| Billing | `/api/restaurants/{id}/billing/*`, `/api/billing/checkout/confirm` |

### 6.4 Core data models

| Entity | Notes |
|--------|-------|
| `UserAccount` | Email, password, `maxRestaurants`, Stripe ids, `billingStatus`, `trialEndsAt` |
| `UserRestaurant` | Role `OWNER \| MANAGER \| STAFF` |
| `Restaurant` | Slug (immutable), timezone, locale, booking rules, `assignmentMode` AUTO/MANUAL, version |
| `OpeningHours` | Per weekday open/close |
| `DiningTable` | Label, seats, AVAILABLE/UNAVAILABLE |
| `TableCombination` | Multi-table join for larger parties |
| `Shift` | Day, start/end/last reservation, max covers, slot duration, overnight, ACTIVE/INACTIVE |
| `Hold` | Token hash, party, UTC/local window, expiry, tables M2M |
| `Reservation` | Confirmation code, guest PII, status FSM, cancel token, tables M2M, version |
| `Vacation` | `RESTAURANT_CLOSURE \| STAFF_VACATION`; PENDING/APPROVED/… |
| Planning | `StaffShiftAssignment`, `StaffWeeklyWorkHours` |
| Auth tokens | Refresh, password reset, staff invite |
| Ops | `AuditEvent`, `StripeWebhookEvent`, `outbox_event` |

**ReservationStatus FSM:** `CONFIRMED → SEATED → COMPLETED | NO_SHOW | CANCELLED` (DB trigger enforcement).

**SubscriptionStatus:** `TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID | PAUSED` — access typically TRIALING | ACTIVE | PAST_DUE.

---

## 7. Auth, roles, and tenancy

| Role | Rank | Intended use |
|------|------|--------------|
| OWNER | 3 | Settings, billing, restaurant CRUD, invite managers |
| MANAGER | 2 | Tables, shifts, staff, reports, vacation approve |
| STAFF | 1 | Floor seat/complete/no-show/**cancel/switch**; planning view; vacation self-request |

**Guest:** no account — restaurant slug + hold token + cancel token.

| Mechanism | Detail |
|-----------|--------|
| Passwords | BCrypt |
| JWT | Access ~15m + refresh ~7d |
| Tenant context | Header **`X-Restaurant-Id`**; path id must match |
| Select | `POST /api/restaurants/{id}/select` re-issues scoped JWT — wired from FE restaurant context (+ `X-Restaurant-Id`) |
| Method security | `@PreAuthorize` + restaurant access guard |

---

## 8. Core domain: booking engine

### Availability

`GET /api/availability?restaurantSlug=&date=&partySize=`

Pipeline: booking enabled → opening hours → restaurant closures → ACTIVE shifts → slot interval → table selection (AUTO/MANUAL) → overlap vs holds + reservations.

### Hold → confirm

```text
GuestBookingPage
  → GET /api/availability
  → POST /api/holds          (default ~3 minutes)
  → ConfirmReservationPage
  → POST /api/holds/confirm  { holdToken, guest… }
  → Reservation + cancel token
  → Outbox → confirmation email (+ ICS)
```

| Detail | Behavior |
|--------|----------|
| Hold duration | `app.hold.duration-minutes` (default 3) |
| Concurrency | Pessimistic table locks + PG exclusion constraints |
| Expiry | `HoldExpiryScheduler` cleans expired holds |
| Cancel | `POST /api/reservations/{code}/cancel` with cancel token |

### Embed

Settings generates iframe snippet pointing at `{origin}/embed/{slug}`. Same booking APIs as guest channel.

---

## 9. Floor ops, weekly modules, settings

### Floor (day of service)

| Action | Intended role | Typical current gate |
|--------|---------------|----------------------|
| Seat / complete / no-show | STAFF+ | STAFF+ |
| Walk-in / manual reservation | STAFF+ | STAFF+ |
| Cancel / switch tables | STAFF+ | STAFF+ |
| Dashboard / timeline / list | STAFF+ | OK |

Primary floor surface: **Dashboard** (doctrine). Timeline and list are secondary.

### Weekly ops

| Module | Route | Notes |
|--------|-------|-------|
| Planning | `/planning` | Assign staff to lunch/dinner; cold-loads to today |
| Vacations | `/vacations` | Staff leave + restaurant closures; STAFF can request own leave |
| Reports | `/reports` | Period summary + CSV |

### Settings / onboarding

Owner: restaurant profile, opening hours, booking flags, embed snippet, billing.  
Onboarding: `/onboarding/setup` → create first restaurant → tables → shifts/hours → share link/embed.

---

## 10. Billing and Stripe

| Item | Detail |
|------|--------|
| Scope | Owner-scoped Stripe customer / subscription |
| Quantity | ≈ number of restaurants |
| Price | `STRIPE_PRICE_ID` (marketing €49.99) |
| Checkout | `POST .../billing/checkout-session` → Stripe → `/billing/success?session_id=` |
| Portal | Customer portal session for manage/cancel |
| Confirm | `POST /api/billing/checkout/confirm?session_id=` — called from `BillingSuccessPage` |
| Webhook | `POST /api/webhooks/stripe` (HMAC); claim → route → done/failed |

**Webhook events:** `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.payment_succeeded|failed` (+ log `trial_will_end`).

**Remaining billing gaps:** PAST_DUE / dunning policy undefined; prod email + live Stripe smoke not verified.

Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, success/cancel/portal URLs.

---

## 11. Email, outbox, and background jobs

| Job | Trigger |
|-----|---------|
| Hold expiry cleanup | fixedDelay (`app.hold.cleanup-interval-ms`) |
| Outbox worker | ~5s fixedDelay |
| Reservation reminders | cron (default every 15m, ~120m before) |
| Trial expiry enforcement | daily cron |
| Staff invite cleanup | hourly |
| GDPR retention / purge | nightly |

Email providers: logging (dev), Resend, SMTP. Confirmation emails should include ICS when outbox handlers are fully wired (docs note partial stubs).

---

## 12. i18n

| Item | Detail |
|------|--------|
| Locales | `en`, `nl`, `fr`, `es` |
| Implementation | `frontend/src/i18n/` — context + `messages.ts` |
| Persistence | `localStorage` key `mesaro.locale`; can sync from `restaurant.locale` |
| Marketing | Large inline `COPY` maps per page (not only `messages.ts`) |
| Backend | Restaurant `locale` for guest/staff-facing emails |

Mixed ES/EN UI copy remains a known polish gap on some app screens.

---

## 13. Security, rate limits, GDPR

| Area | Behavior |
|------|----------|
| AuthN | JWT Bearer |
| AuthZ | Role ranks per restaurant membership |
| Tenancy | `X-Restaurant-Id` + path consistency |
| Rate limits | Configurable; 429 + Retry-After |
| Audit | Internal audit events (compliance under the hood) |
| GDPR | Retention/purge schedulers; marketing claims EU hosting + restaurant-owned guest data |
| Legal UI | Privacy / Terms routes live (drafts); counsel + entity still required for paid ads |

---

## 14. Testing and CI

### Backend

~45 test classes: unit (holds, reservations, billing, auth, vacations, planning, GDPR, DST, rate limit) + integration/concurrency (booking flow, hold concurrency, tenant isolation, webhooks) via **Testcontainers**.

### Frontend

| Layer | Location |
|-------|----------|
| Unit | `frontend/testing/unit/` (Vitest, MSW) |
| E2E | `frontend/testing/e2e/*.spec.ts` (Playwright) |

E2E includes marketing pages, auth, guest booking/embed, dashboard/floor, tables/shifts/staff/planning/vacations/reports, billing pages.

### CI

Workflows are **authored but parked** (not running on GitHub yet):

| File | Role |
|------|------|
| `.github/ci-parked/backend-ci.yml` | `mvn test` with Testcontainers |
| `.github/ci-parked/e2e.yml` | Starts infra + Spring Boot + Playwright |

Move into `.github/workflows/` when enabling Actions, then require status checks on `main`. See [.github/ci-parked/README.md](../.github/ci-parked/README.md).

---

## 15. Configuration, Docker, and deploy

### Compose (`backend/`)

| File | Purpose |
|------|---------|
| `docker-compose.infra.yml` | Postgres + Redis (+ ES/Kibana) |
| `docker-compose.yml` | Full **dev** stack including app on 8080 |
| `docker-compose.prod.yml` | Prod; `--env-file .env.prod` |
| `docker-compose.prod.local.yml` | Local overrides for prod-shaped run (`run-prod-local.ps1`) |

### Notable environment variables

| Group | Variables |
|-------|-----------|
| DB / Redis | `DB_URL`, `DB_USER`, `DB_PASS`, `REDIS_*`, `SESSION_STORE_TYPE` |
| Secrets | `JWT_SECRET`, `HOLD_TOKEN_SECRET`, `RESERVATION_TOKEN_SECRET`, `STAFF_TOKEN_SECRET` |
| URLs / CORS | `APP_BASE_URL`, `API_BASE_URL`, `FRONTEND_URL`, `API_CORS_ORIGINS` |
| Email | `EMAIL_PROVIDER`, `RESEND_*`, `SMTP_*`, `EMAIL_FROM*` |
| Stripe | `STRIPE_*` |
| Frontend | `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY` |

Profiles: `dev` (seed Flyway location + demo data) · `prod`.  
Management port **9090** (health/prometheus) — keep off public internet.

Root helpers: `run-dev.ps1`, `run-infra.ps1`, `run-infra-reset.ps1`, `run-be-test.ps1`, `run-fe-test.ps1`, `run-be-soak.ps1`, `run-prod-local.ps1`.

---

## 16. Known gaps vs doctrine

**Rescored 2026-10-12.** Phase 0–2 code fixes closed the old money/floor/legal-route P0/P1 list. Remaining gaps:

| Priority | Issue |
|----------|-------|
| P0 | Prod email smoke (Resend/SMTP) not verified |
| P0 | Privacy/Terms counsel + company entity |
| P0 | GitHub Actions parked — not green on every PR yet |
| P0 | Live Hostinger VPS cutover + secrets |
| P1 | PAST_DUE / dunning policy undefined |
| P1 | Outbox: some event types still stubs |
| P2 | Opening-hours vs closures UX polish |
| P2 | Residual i18n leaks |

**Company readiness (docs snapshot):** ~78% — careful pilots OK; not ready for paid ads until email, legal, active CI, and VPS cutover. Full matrix: [README.md](README.md).

---

## 17. Related docs

| Document | Scope |
|----------|--------|
| [README.md](README.md) | Company readiness, backlog, scores |
| [product-doctrine.md](product-doctrine.md) | Canonical SaaS vision |
| [production-ready-plan.md](production-ready-plan.md) | Remediation + live findings |
| [flows.md](flows.md) | End-to-end FE↔BE journey catalog |
| [backend/flows.md](backend/flows.md) · [backend/audit.md](backend/audit.md) | Backend deep maps |
| [frontend/flows.md](frontend/flows.md) · [frontend/audit.md](frontend/audit.md) | Frontend deep maps |
| **This file** | Single technical reference including full marketing read |

---

## Appendix A — Core happy path

```text
Marketing → Register → Onboard restaurant
     → Tables + Shifts/Hours + Staff
     → Embed /r/:slug  ← guests book (hold → confirm)
     → Dashboard floor (seat → complete | no-show | cancel | switch)
     → Planning / Vacations / Reports
     → Settings / Billing (~€50)
```

## Appendix B — Marketing file index

```text
frontend/src/features/marketing/
├── pages/HomePage.tsx
├── FeaturesPage.tsx
├── PricingPage.tsx
├── AboutPage.tsx
├── FaqPage.tsx
├── ContactPage.tsx
├── api.ts
├── hooks/usePageMeta.ts
└── components/
    ├── CtaBanner.tsx
    ├── FaqAccordion.tsx
    ├── SectionBlock.tsx
    ├── FeatureCardGrid.tsx
    ├── PricingTierCards.tsx
    └── PricingComparisonTable.tsx

frontend/src/components/layout/MarketingLayout.tsx
```

---

*End of technical document.*
