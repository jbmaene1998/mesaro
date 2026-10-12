# Mesaro — Company docs

**Repo:** [jbmaene1998/mesaro](https://github.com/jbmaene1998/mesaro) · monorepo `backend/` + `frontend/` + `docs/`  
**Audience:** founder building a simple, cheap restaurant reservation SaaS  
**Status date:** 2026-10-12 (code review rescore after Phase 0–4 remediation)  
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

**Mesaro’s core money, floor, billing-gate, and legal-page paths are implemented in code** (Phase 0–2). It is **not yet safe to run paid ads / unattended self-serve** until prod email is smoke-tested, counsel signs off Privacy/Terms, GitHub Actions are unparked and green, and a real VPS cutover with secrets is done.

**Do not “differentiate” by adding competitor suite features** — that violates the doctrine.

---

## Current status (2026-10-12)

| Works in code (Phase 0–2) | Still open before paid scale |
|---------------------------|------------------------------|
| Owner / staff login → Dashboard | Real email smoke (Resend/SMTP) in prod-like env |
| Guest avail → hold → confirm | Counsel-approved Privacy/Terms (routes exist; drafts) |
| STAFF cancel / switch / self-vacation | Backend CI active (`.github/workflows/backend-ci.yml`); E2E still parked (`.github/ci-parked/e2e.yml`) |
| Billing success → `confirmCheckout` | Hostinger VPS cutover + live secrets |
| Webhook claim → route → done/failed | PAST_DUE / dunning policy |
| Guest booking billing-gated | Company formation / DPA / Stripe legal entity |
| Privacy + Terms routes + footer | Some i18n / opening-hours UX polish |
| Seed `maxRestaurants=2` for demo owner | |
| `/select` wired; accept-invite set-password | |
| Planning cold-load; reports; vacations module | |

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
| **Repo / process** | Private GitHub repo, CONTRIBUTING, PR templates, squash-only merges; backend CI active, E2E parked |

### What is strong (keep)

- Booking correctness: holds, locks, overlap triggers, DST, concurrency tests
- Multi-tenant RBAC with restaurant context (`X-Restaurant-Id` + select scoped JWT)
- Owner Stripe checkout + flat-price story on marketing (`€49.99`)
- Guest + embed channels; Privacy/Terms linked
- Audit/GDPR under the hood (compliance — not a pricing-page feature)
- Local prod path (`run-prod-local.ps1`) + Hostinger VPS runbook

### What still blocks unattended paid scale

| # | Blocker | Where |
|---|---------|--------|
| 1 | Prod email smoke not verified | Ops / Phase 0 item 7 |
| 2 | Privacy/Terms need counsel + company entity | Legal |
| 3 | CI not active on GitHub (workflows parked) | Ops |
| 4 | Live VPS deploy + secrets not cut over | Ops |
| 5 | PAST_DUE / dunning policy undefined | Billing product |
| 6 | Opening-hours vs closures UX polish | Settings P2 |
| 7 | Outbox: some event types still stubs | Reliability |

Journey catalog: **[flows.md](flows.md)**

---

## Readiness scores (2026-10-12 rescore)

| Domain | Score | Note |
|--------|-------|------|
| Booking engine | **~90%** | Hold/confirm + billing gate in code |
| Simple floor UX | **~85%** | STAFF cancel/switch allowed; minor i18n noise |
| Advanced modules | **~85%** | Planning/vacations/reports implemented; E2E in CI still parked |
| Monetization durability | **~80%** | Confirm + webhook fixed; PAST_DUE policy open |
| Security / tenancy | **~80%** | Select JWT + RBAC; secret scanning etc. still off on GitHub |
| EU compliance (legal pages) | **~65%** | Routes + drafts live; counsel / entity pending |
| Ops / CI | **~55%** | Compose/Caddy/runbooks exist; Actions parked; no live VPS yet |
| Vision fit (simple €50 product) | **~75%** | Doctrine held through remediation |

**Company readiness overall: ~78%.** Safe for careful pilots with hand-holding. **Not** ready for paid ads until email smoke, legal counsel, active CI, and VPS cutover.

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

1. Prod email smoke (invite, reset, confirmation) with real Resend/SMTP  
2. Counsel review of Privacy + Terms; incorporate / VAT / Stripe entity  
3. Unpark + green GitHub Actions (backend `mvn test` + honest E2E)  
4. Hostinger VPS cutover with real secrets, TLS, private data plane  

### P1 — SaaS correctness

5. Define PAST_DUE → grace → unpaid/canceled + dunning  
6. Finish outbox stubs or stop enqueueing fake reliability  
7. Opening-hours vs closures UX (warn vs create closure)  

### P2 — polish

8. Remaining i18n leaks; overnight capacity copy edge cases  
9. Branch-protection enforcement when GitHub Pro (or org) is available  
10. Secret scanning / Dependabot on the private repo  

### Explicitly not priority

- New suite features (SMS, deposits, waitlist, loyalty, Google Reserve)  
- Marketing Redis/audit jargon  

---

## 30 / 60 / 90 (from today)

### Days 0–30 — charge safely in prod

- Email smoke + counsel drafts → shipable legal  
- Unpark CI; VPS deploy with TLS  
- Pilot 1–3 restaurants  

### Days 31–60 — trust without sprawl

- DSAR/retention notes for counsel  
- PAST_DUE / dunning policy  
- Backup / incident drill  

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
