# Mesaro — Company docs

**Repo root:** monorepo `backend/` + `frontend/` + `docs/`  
**Audience:** founder building a simple, cheap restaurant reservation SaaS  
**Last live audit:** 2026-10-09 (local stack FE `:3000` / API `:8080`)

| Document | Scope |
|----------|--------|
| **[technical-document.md](technical-document.md)** | **Full technical reference** — stack, APIs, data, ops + marketing pages read |
| **[product-doctrine.md](product-doctrine.md)** | **Canonical SaaS vision** — €50, simple, 100% used |
| **[production-ready-plan.md](production-ready-plan.md)** | **Full remediation plan** — includes live runtime findings |
| **[flows.md](flows.md)** | **End-to-end FE↔BE flow audit** |
| [backend/flows.md](backend/flows.md) · [frontend/flows.md](frontend/flows.md) | Deep per-layer flow maps |
| [backend/audit.md](backend/audit.md) | API / data / billing / security / ops audit |
| [frontend/audit.md](frontend/audit.md) | UI / GTM / client risks audit |
| [engineering/branching-and-releases.md](engineering/branching-and-releases.md) | Branching, PRs, squash-merge, semver releases |
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

**Mesaro is a real booking + restaurant-ops product with credible multi-tenant and Stripe scaffolding — not vaporware — but several core floor and money paths fail under live use, so it is not yet safe to charge customers at scale.**

Close reliability, monetization correctness, STAFF autonomy, legal, and launch-ops gaps before paid self-serve.  
**Do not “differentiate” by adding competitor suite features** — that violates the doctrine.

---

## Live audit snapshot (2026-10-09)

| Works | Broken / wrong |
|-------|----------------|
| Owner login → Dashboard | STAFF cancel/switch **403** (service MANAGER) |
| Guest avail → hold → confirm | Billing success page **never confirms** session |
| Planning API + UI after “Hoy” | Planning **first paint empty** (0s) |
| Vacations staff list (OWNER) | STAFF self-vacation **403** |
| Reports summary UI | Webhook **mark-before-process** |
| Tables / shifts / staff APIs | Guest booking **not** subscription-gated |
| Billing status readable | Seed **maxRestaurants=1** vs **2** restaurants |
| | No Privacy/Terms; mixed ES/EN labels |

Full matrix: [production-ready-plan.md](production-ready-plan.md) · [flows.md](flows.md)

**Demo logins:** `admin@demo.com` / `demo123` · `staff.demo@demo.com` / `demo123`

---

## Product snapshot (today)

| Layer | What exists |
|-------|-------------|
| **Backend** | Spring Boot 3.5 / Java 21 / PostgreSQL / Flyway / Redis / Stripe |
| **Frontend** | React 18 + TypeScript + Vite + TanStack Query + Playwright |
| **Vision core (aligned)** | Guest booking, embed, floor ops, tables/shifts, staff, flat €49.99 marketing |
| **In-nav essentials (locked)** | Planning, vacations, reports — finish fully; keep simple in marketing |

### What is strong (keep)

- Booking correctness: holds, locks, overlap triggers, DST, concurrency tests
- Multi-tenant RBAC with restaurant context
- Owner Stripe checkout + flat-price story already on marketing (`€49.99`)
- Guest + embed channels
- Audit/GDPR under the hood (compliance — not a pricing-page feature)

### What blocks charging at scale

| # | Blocker | Where | Live-checked |
|---|---------|--------|--------------|
| 1 | Stripe webhooks mark processed **before** handlers run | Backend P0 | Yes |
| 2 | Billing success page does **not** call confirm API | Frontend P0 | Yes |
| 3 | Guest booking not gated by subscription status | Backend P1 | Yes (hold+confirm OK while TRIALING/ungated) |
| 4 | No Privacy / Terms routes | Frontend P0 | Yes |
| 5 | Prod secret / email fail-fast not enforced | Backend P0–P1 | Code review |
| 6 | No backend CI; E2E does not start API | Ops | — |
| 7 | FAQ / marketing drift (e.g. guest cancel) | Trust | — |
| 8 | STAFF cancel/switch blocked (service + FE) | Floor P1 | Yes (403) |
| 9 | Accept-invite: new staff get random password (no set-password) | Flow RISK | — |
| 10 | Restaurant `/select` JWT unused (header-only context) | Flow RISK | Yes |
| 11 | Planning empty first paint; STAFF vacation 403 | Advanced P1–P2 | Yes |
| 12 | Seed billing quota vs 2 restaurants | Demo P1 | Yes |

Full journey catalog: **[flows.md](flows.md)**

---

## Readiness scores (re-scored after live audit)

| Domain | Score | Note |
|--------|-------|------|
| Booking engine | **~75%** | Hold/confirm live OK; still ungated vs billing |
| Simple floor UX | **~55%** | Dashboard works; STAFF cancel/switch fail; i18n noise |
| Advanced modules | **~60%** | Reports OK; planning first-paint bug; STAFF vacation 403 |
| Monetization durability | **~45%** | Success page + webhook still P0 |
| Security / tenancy | **~60%** | Select JWT unused |
| EU compliance (legal pages) | **~40%** | |
| Ops / CI | **~40%** | |
| Vision fit (simple €50 product) | **~60%** | Doctrine amended: essentials in nav, marketing still simple |

**Company readiness overall: ~52%.** Pilots OK with hand-holding; no paid ads until P0s + STAFF floor + legal.

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

## Priority backlog

### P0 — money, trust

1. Fix Stripe webhook state machine  
2. Wire billing success confirm (or stop claiming it)  
3. Ship Privacy + Terms  
4. Prod fail-fast (secrets, email provider)  
5. Fix seed billing quota vs restaurant count  

### P1 — floor + SaaS correctness

6. STAFF cancel/switch (BE service + FE permissions)  
7. Gate guest holds/confirm on billing access  
8. STAFF self-vacation; accept-invite set-password; wire `/select`  
9. FAQ / copy honesty; real email smoke  
10. `mvn test` CI; honest E2E  

### P2 — fully implement weekly modules (Phase 2A–C)

11. **Planning full:** cold-load, assign, recurring-week, work-hours, empty/closed states, E2E  
12. **Vacations full:** STAFF self-request, approve/reject, closures CRUD + booking impact, emails, E2E  
13. **Reports full:** summary, trend, CSV, print, presets, i18n badges, STAFF gate, E2E  
14. Dashboard overnight capacity copy; guest `HH:mm` slots (Phase 4)  

### Explicitly not priority

- New suite features (SMS, deposits, waitlist, loyalty, Google Reserve)  
- Marketing Redis/audit jargon  

---

## 30 / 60 / 90 (vision-first)

### Days 0–30 — charge safely + floor works

- Close P0 money/trust items  
- STAFF cancel/switch end-to-end  
- Keep planning/vacations/reports in nav; fix 403 / empty bugs  
- Pricing/FAQ/home: sell daily essentials + €50 flat (modules present, not hyped)  
- Pilot 1–3 restaurants; counsel draft Privacy/Terms  

### Days 31–60 — trust without sprawl

- DSAR/retention notes for counsel  
- Dunning / PAST_DUE policy  
- Guest cancel deep-links that just work  
- Harden deploy (TLS, backups, no public DB)  

### Days 61–90 — deepen the wedge, don’t widen it

- Mobile-first **floor** experience (not new modules)  
- Load-test booking; support playbooks that match simple product  
- Validate €50 willingness-to-pay and “no training needed”  
- Kill or warehouse fake analytics endpoint  

---

## Legal / company formation checklist

- [ ] Incorporate (jurisdiction, VAT, bank)  
- [ ] Privacy Policy + Terms + DPA  
- [ ] Stripe in company name + tax  
- [ ] Data map (guest/staff PII, emails, audit)  
- [ ] Consent wording matches reality  
- [ ] Incident + backup drill  
- [ ] Brand / domain / IP into the company  

---

## How to use these docs

1. **Doctrine first** — [product-doctrine.md](product-doctrine.md) beats feature requests.  
2. **Technical reference** — [technical-document.md](technical-document.md) for stack, routes, APIs, and marketing page content.  
3. **Execute remediation** — [production-ready-plan.md](production-ready-plan.md) (phased P0→ops; live findings at top).  
4. **Flows** — [flows.md](flows.md) for “does this journey work?” before building.  
5. **P0s** block paid self-serve.  
6. Backend/frontend audits = technical honesty; roadmaps must serve simplicity + €50.  
7. Re-score readiness after each phase.

---

## Repo note

Git root is this monorepo. Older `Mesaro-API/docs/*` audits are superseded.
