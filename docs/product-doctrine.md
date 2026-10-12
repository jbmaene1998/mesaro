# Mesaro product doctrine (SaaS vision)

**Status:** canonical — all product, marketing, and engineering decisions defer to this document  
**Updated:** 2026-10-09

---

## Vision in one paragraph

Mesaro is **cheap, simple reservation software for independent restaurants**.  
About **€50 per restaurant per month**. Flat fee. No commission. No marketplace.  

Typical tools are so complex that restaurants **pay 100% of the price for ~10% of the features they actually use**.  
Mesaro flips that: **pay ~10% of competitor price, use 100% of what we ship** — because we only ship what they use every day.

> **Reservation software restaurants actually use — €50/month, no commission, no complexity.**

---

## Who we serve

- Independent restaurants and small groups (not hotel chains, not enterprise food groups)
- Owner-operators and floor staff who open the app mid-service, not “power users”
- People who want bookings on **their own website**, not a marketplace that owns the guest

We do **not** optimize for feature parity with Zenchef / TheFork Manager / Resy-class suites.

---

## Pricing promise

| Rule | Detail |
|------|--------|
| Target price | **~€50 / restaurant / month** (marketing today: €49.99) |
| Model | Flat subscription — **no per-cover commission** |
| Staff seats | Unlimited at the same price |
| Reservations | Unlimited at the same price |
| Multi-location | One login; **each restaurant billed once** at the flat rate |
| Trial | 14 days, no card required (keep this honest in product + legal) |

Never introduce commission, per-seat fees, or “module unlock” pricing that recreates competitor complexity.

---

## The product we sell (must use every day / every week)

This is the **100% used** surface. If it is not in this list, it is not the product.

### Guest

1. Book online (`/r/:slug` + embed widget)
2. Get confirmation email (+ calendar attachment)
3. Cancel with a simple link/token

### Restaurant (day of service)

4. See who’s coming — **Dashboard is the primary floor** (timeline + list secondary)
5. Walk-in / manual reservation
6. Seat → complete / no-show / **cancel** / **switch tables** (**STAFF+**)
7. Basic capacity awareness for the current or next shift

### Setup (once, then rarely)

8. Tables (+ simple combinations if needed)
9. Opening hours / shifts (enough to drive availability)
10. Staff accounts with **simple roles** (OWNER / MANAGER / STAFF)

### Weekly ops (essential — keep in nav, finish fully)

11. **Staff planning** — who works which lunch/dinner
12. **Vacations / closures** — block time off and closed days
13. **Reports** — simple period summary + CSV (not BI suite)

### Trust

14. No double booking (correct holds/overlaps — **invisible** to the user)
15. Guest data stays with the restaurant (no marketplace sharing)

Everything else is either **deferred**, or **cut**.

---

## Explicitly out of scope (must not ship for v1 / must not market)

These are competitor suite features. Shipping them as first-class *marketing* **breaks the vision**.

| Out of scope | Why |
|--------------|-----|
| Deposits / prepaid / no-show fees | Complexity + payments ops |
| Waitlist / SMS / WhatsApp | Channel sprawl; support cost |
| Guest accounts / loyalty | Not needed for basic reservations |
| Marketplace / Google Reserve / OTAs | Fights “your guests, your site” |
| Multi-plan entitlements / feature flags matrix | Recreates “pay for unused modules” |
| Super-admin / impersonation as product | Internal ops later, not customer product |
| Marketing engineering jargon (Redis, audit log, etc.) | Owners buy outcomes, not infra |
| Heavy BI / warehouse analytics | Reports stay a simple summary |

**Note (2026-10-09 amendment):** Staff planning, vacation approval, and simple reports are **in product** (nav + finish bugs). They are **not** sold as “HR/BI suite” — they are weekly restaurant ops that must work. Do not expand them into competitor-depth modules.

**Engineering may keep deep correctness under the hood** (locks, DST, audit for compliance).  
**Product and marketing must not make the customer feel that depth.**

---

## Simplicity rules (non-negotiable)

1. **If a feature is not used every service or every week, it does not get a peer nav item.** (Weekly ops above are allowed.)
2. **Prefer one good floor screen (Dashboard) over five specialized ones.**
3. **Setup must be completable the same day** (target: under 30 minutes).
4. **Copy talks like a restaurant**, not like SaaS (“no double bookings”, not “pessimistic locking”).
5. **Adding a feature requires answering:** *Would a busy waiter use this on Friday at 20:00?* If no → backlog or reject (except weekly planning/vacations/reports, which managers use off-floor).
6. **Do not grow into the softwares we criticize.** Complexity is a regression, not progress.
7. **Price stays flat and cheap.** Margin comes from low support burden via simplicity — not from upsells.

---

## Default UI doctrine

| Layer | Policy |
|-------|--------|
| **Default nav** | Dashboard · timeline/reservations · tables · shifts · **planning** · staff · **vacations** · **reports** · settings/billing |
| **Floor** | Dashboard primary; STAFF can cancel/switch |
| **Marketing site** | Sell daily guest+floor outcomes + €50 flat + embed; mention planning/vacations/reports lightly or not at all |
| **Onboarding** | Restaurant → tables → hours/shifts → embed → live. Planning optional after first booking |

Technical audits document bugs; **roadmap priority** is money/trust P0s, then STAFF floor, then finishing weekly modules — not competitor feature parity.

---

## Positioning vs competitors

| Them | Us |
|------|----|
| €200–500+/mo or commission on covers | **~€50/mo flat** |
| 40 menus, training, unused modules | **Daily floor + light weekly ops, same-day live** |
| Pay 100% for 10% usage | **Pay ~10% of their price; use 100% of ours** |
| Marketplace / shared guest data | **Direct bookings on your site** |

Honest catch: we win on **clarity and price**, not on suite breadth. Never claim parity with full restaurant OS platforms.

---

## Success metrics (vision-aligned)

- Time to first live booking (signup → embed → reservation) — minimize
- % of paid features used weekly by staff — maximize (target: near 100% of shipped UI)
- Support tickets per restaurant — minimize (complexity tax)
- Churn reason “too complicated” — must stay near zero
- Willingness to pay €50 without training call — qualitative gate for pilots

---

## Flow expectations (must work)

Verified maps: [flows.md](flows.md) · [backend/flows.md](backend/flows.md) · [frontend/flows.md](frontend/flows.md)  
Live findings: [production-ready-plan.md](production-ready-plan.md)

| Journey | Expectation |
|---------|-------------|
| Owner same-day live | Register → restaurant → tables → shifts/hours → share link → guest books → floor seats |
| Guest book/cancel | Availability → hold → confirm → cancel with token (email must carry token) |
| Floor service | Dashboard primary; walk-in; seat/complete/no-show; **STAFF** cancel/switch |
| Weekly ops | Planning / vacations / reports usable without 403 or false-empty UI |
| Pay | Checkout → success **confirms** subscription before promising access |

Broken/risky flows in those docs are **launch blockers or vision debt**, not optional polish.

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-10-08 | Adopted: €50 simple reservation SaaS; simplicity over suite; this doc is canonical |
| 2026-10-08 | Flow audits added; core journeys above are the product contract |
| 2026-10-09 | **STAFF+** cancel/switch (floor autonomy) |
| 2026-10-09 | Planning / vacations / reports are **essential** — keep in nav, finish fully (not hide) |
| 2026-10-09 | Primary floor = **Dashboard** |
| 2026-10-09 | Live runtime audit: many paths broken; plan updated — see [production-ready-plan.md](production-ready-plan.md) |

When doctrine and code disagree, **change the product surface or the code to match this file** — do not silently expand scope beyond the lists above.
