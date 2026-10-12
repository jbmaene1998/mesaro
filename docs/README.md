# Mesaro — Company docs

**Repo:** [jbmaene1998/mesaro](https://github.com/jbmaene1998/mesaro) · monorepo `backend/` + `frontend/` + `docs/`  
**Audience:** founder building a simple, cheap restaurant reservation SaaS  
**Status date:** 2026-10-12 (code-audit rescore — evidence from `backend/` + `frontend/` + `.github/`, not prior doc claims)  
**Historical live audit:** 2026-10-09 — kept in [production-ready-plan.md](production-ready-plan.md) as a snapshot only

| Document | Scope |
|----------|--------|
| **[technical-document.md](technical-document.md)** | **Full technical reference** — stack, APIs, data, ops + marketing pages |
| **[product-doctrine.md](product-doctrine.md)** | **Canonical SaaS vision** — €50, simple, 100% used |
| **[production-ready-plan.md](production-ready-plan.md)** | Remediation plan + historical live findings + phase checklist |
| **[flows.md](flows.md)** | End-to-end FE↔BE flow catalog (current status) |
| [backend/flows.md](backend/flows.md) · [frontend/flows.md](frontend/flows.md) | Deep per-layer flow maps |
| [backend/audit.md](backend/audit.md) | API / data / billing / security / ops audit |
| [frontend/audit.md](frontend/audit.md) | UI / GTM / client risks audit |
| [engineering/branching-and-releases.md](engineering/branching-and-releases.md) | Branching, PRs, squash-merge, semver releases |
| [local-prod-deploy.md](local-prod-deploy.md) · [deploy-hostinger-vps.md](deploy-hostinger-vps.md) | Local prod-shaped + VPS deploy |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contributor entry point |
| This file | Company readiness + how vision changes priorities |

---

## SaaS vision (summary)

Full doctrine: **[product-doctrine.md](product-doctrine.md)**

> **Reservation software restaurants actually use — €50/month, no commission, no complexity.**

Typical tools are so complex that restaurants **pay 100% for ~10% of features they use**.  
Mesaro: **~€50/restaurant/month** (~10% of competitor price), and they **use 100% of what we ship** — because we only ship daily essentials.

**We sell:** guest book + confirm/cancel · floor today (seat/complete/no-show/cancel/switch) · tables & hours · staff · planning/vacations/reports (in product, simply) · embed on their site.  
**We do not sell:** deposits, SMS, marketplace, plan matrices, Redis/audit jargon.

Engineering depth (holds, DST, tenancy) stays **under the hood**. Marketing stays **simple**; default nav includes modules restaurants will actually use weekly (locked 2026-10-09).

---

## One-line engineering verdict

**Core product paths (booking, floor STAFF ops, planning/vacations/reports, billing checkout confirm, legal routes) are implemented.** Staging CD from `dev` → Omen is live. It is **not** safe for paid ads / unattended self-serve until: webhook deserialize failures stop marking events `done`, PAST_DUE policy is defined, prod email is smoke-tested, test CI is unparked and green, and Hostinger prod CD + secrets exist.

**Do not “differentiate” by adding competitor suite features** — that violates the doctrine.

---

## Current status (2026-10-12 code audit)

| Works in code | Still open (evidence-based) |
|---------------|------------------------------|
| Guest avail → hold → confirm + billing/`bookingEnabled` gate | **P0:** Stripe webhook marks `done` when deserialize returns null (no handler, no retry) |
| Billing success → `confirmCheckout`; claim → route → done/failed path | **P0:** PAST_DUE still `allowsAccess()` with no local grace/dunning |
| STAFF cancel / switch / self-vacation create | Prod email smoke (Resend/SMTP wired; credentials not fail-fast; not verified live) |
| Accept-invite set-password for new users | Test CI parked (`.github/ci-parked/`); only staging CD + soft PR gate active |
| Planning cold-load today; vacations/closures; reports summary+CSV (MANAGER+) | Prod CD stub (`deploy-prod.yml`); Hostinger VPS + live secrets not cut over |
| Privacy + Terms routes + footer + consent → Privacy | Billing + register UI English-only under ES; dashboard trial toasts EN |
| Seed `maxRestaurants=2`; compose prod binds data plane to localhost + Caddy | Settings: no opening-hours ↔ closures warning; hours edit warn-only (no cancel) |
| `/restaurants/{id}/select` + `X-Restaurant-Id` tenancy | Outbox: only `ReservationConfirmed` sends mail; other enqueued types are stubs |
| Staging deploy workflow on `dev` (Omen self-hosted) | `.env.prod.example` missing Stripe + `MESARO_DOMAIN` / `ACME_EMAIL` vars compose needs |

Full phase checklist: [production-ready-plan.md](production-ready-plan.md)

**Demo logins (dev seed):**  
`admin@demo.com` · `manager.demo@demo.com` · `staff.demo@demo.com` — password `demo123`

---

## Product snapshot (today)

| Layer | What exists |
|-------|-------------|
| **Backend** | Spring Boot 3.5 / Java 21 / PostgreSQL / Flyway / Redis / Stripe |
| **Frontend** | React 18 + TypeScript + Vite + TanStack Query + Playwright |
| **Vision core (aligned)** | Guest booking, embed, floor ops, tables/shifts, staff, flat €49.99 marketing |
| **In-nav essentials (locked)** | Planning, vacations, reports — implemented; keep simple in marketing |
| **Repo / process** | Private GitHub; squash PRs into `dev`; staging CD live; test CI parked; prod CD stub |

### What is strong (keep)

- Booking correctness: holds, locks, overlap triggers, DST, concurrency tests
- Multi-tenant RBAC via membership + `X-Restaurant-Id` (select refreshes JWT; not a single-restaurant claim)
- Owner Stripe checkout + flat-price story on marketing (`€49.99`)
- Guest + embed channels; Privacy/Terms linked
- Audit/GDPR under the hood (compliance — not a pricing-page feature)
- Local prod path (`run-prod-local.ps1`) + Hostinger VPS runbook + Omen staging CD

### What still blocks unattended paid scale

| # | Blocker | Where |
|---|---------|--------|
| 1 | Webhook deserialize-null → still `markEventDone` | `StripeWebhookController` |
| 2 | PAST_DUE keeps write access forever in-app | `SubscriptionStatus.allowsAccess` |
| 3 | Prod email smoke not verified; blank Resend/SMTP not rejected at boot | Ops / `ProductionSecurityValidator` |
| 4 | Test CI parked; prod deploy stub; no Hostinger cutover | `.github/` + VPS |
| 5 | Privacy/Terms drafts need counsel + company entity | Legal |
| 6 | Billing/register i18n missing; opening-hours ↔ closures UX missing | Frontend |
| 7 | Outbox stubs still enqueued (`HoldExpired`, planning delete, etc.) | `OutboxWorker` |

Journey catalog: **[flows.md](flows.md)**

---

## Readiness scores (2026-10-12 code-audit rescore)

| Domain | Score | Note |
|--------|-------|------|
| Booking engine | **~90%** | Hold/confirm + billing gate in code |
| Simple floor UX | **~85%** | STAFF cancel/switch allowed; billing/register i18n gaps |
| Advanced modules | **~85%** | Planning/vacations/reports implemented; CI E2E not running |
| Monetization durability | **~65%** | Confirm + claim path OK; deserialize→done hole; PAST_DUE soft forever |
| Security / tenancy | **~75%** | RBAC + header context; JWT not single-restaurant-scoped; secret scanning off |
| EU compliance (legal pages) | **~65%** | Routes + drafts live; counsel / entity pending |
| Ops / CI | **~60%** | Staging CD live; test CI parked; prod CD stub; no Hostinger yet |
| Vision fit (simple €50 product) | **~75%** | Doctrine held through remediation |

**Company readiness overall: ~72%.** Staging pilots possible with hand-holding. **Not** ready for paid ads until webhook hole, PAST_DUE policy, email smoke, test CI, and Hostinger prod cutover.

---

## Competitive posture (doctrine-aligned)

We are **not** chasing suite parity. Missing deposits, SMS, waitlist, marketplace, etc. is **intentional**, not a failure.

| Win on | Lose on (accept) |
|--------|------------------|
| Price (~€50 flat) | Enterprise breadth |
| Simplicity / same-day setup | Channel integrations |
| Direct bookings on their site | Marketplace demand gen |
| High % of shipped features used | “We also do HR/planning/BI” as marketing |

---

## Priority backlog (remaining)

### P0 — before paid self-serve / ads

1. Fix Stripe webhook: deserialize failure must `markEventFailed` + 500 (never silent `done`)  
2. Define + implement PAST_DUE grace → block / dunning (today PAST_DUE still allows access)  
3. Prod email smoke (invite, reset, confirmation) with Resend/SMTP; fail-fast if credentials blank  
4. Unpark + green test CI (`backend-ci.yml` ± `e2e.yml`); fix fragile billing/reports e2e mocks  
5. Hostinger VPS cutover: real `.env.prod` (incl. Stripe), wire `deploy-prod.yml`, TLS  

### P1 — SaaS correctness

6. Counsel review of Privacy + Terms; incorporate / VAT / Stripe entity  
7. Align `.env.prod.example` with compose (Stripe, `MESARO_DOMAIN`, `ACME_EMAIL`)  
8. Finish outbox stubs or stop enqueueing fake reliability  
9. Settings: opening-hours ↔ closures warning; document warn-only hours edit  

### P2 — polish

10. Localize billing + register (and dashboard trial toasts) for ES/NL/FR  
11. Branch-protection enforcement when GitHub Pro (or org) is available  
12. Secret scanning / Dependabot; backups + 2–3 alerts from `monitoring.md`  

### Explicitly not priority

- New suite features (SMS, deposits, waitlist, loyalty, Google Reserve)  
- Marketing Redis/audit jargon  

---

## 30 / 60 / 90 (from today)

### Days 0–30 — charge safely

- Fix webhook deserialize hole + PAST_DUE policy  
- Email smoke on staging/prod-like; unpark test CI  
- Hostinger prod bring-up + replace deploy stub  
- Pilot 1–3 restaurants on staging, then prod  

### Days 31–60 — trust without sprawl

- Counsel + DSAR/retention notes  
- Backups / incident drill; Sentry optional  
- Billing/register i18n; opening-hours UX  

### Days 61–90 — deepen the wedge, don’t widen it

- Mobile-first **floor** experience (not new modules)  
- Load-test booking; support playbooks that match simple product  
- Validate €50 willingness-to-pay and “no training needed” 

---

## Legal / company formation checklist

- [ ] Incorporate (jurisdiction, VAT, bank)  
- [ ] Privacy Policy + Terms counsel-approved (+ DPA) — *draft routes already live*  
- [ ] Stripe in company name + tax  
- [ ] Data map (guest/staff PII, emails, audit)  
- [ ] Consent wording matches reality  
- [ ] Incident + backup drill  
- [ ] Brand / domain / IP into the company  

---

## How to use these docs

1. **Doctrine first** — [product-doctrine.md](product-doctrine.md) beats feature requests.  
2. **Technical reference** — [technical-document.md](technical-document.md) for stack, routes, APIs.  
3. **Remediation history** — [production-ready-plan.md](production-ready-plan.md) (2026-10-09 live block is historical).  
4. **Flows** — [flows.md](flows.md) for “does this journey work?”  
5. Remaining P0s above block paid ads / unattended self-serve.  
6. Re-score readiness after each ops/legal milestone.

---

## Repo note

Git root is this monorepo: [github.com/jbmaene1998/mesaro](https://github.com/jbmaene1998/mesaro). Older `Mesaro-API/docs/*` audits are superseded.
