# Contributing to Mesaro

This is a production monorepo.

- **`dev`** — integration + staging (default branch for day-to-day work)
- **`main`** — production-ready; only via PR from `dev`

## Before you start

1. Read [docs/product-doctrine.md](docs/product-doctrine.md) — product decisions defer to it.
2. Prefer fixing reliability / money / floor-ops paths over adding competitor-suite features.
3. Keep docs in sync when behavior or public APIs change.

## Branch naming

| Prefix | Use for |
|--------|---------|
| `feat/<short-slug>` | New user-facing capability |
| `fix/<short-slug>` | Bug fix |
| `chore/<short-slug>` | Tooling, deps, repo hygiene |
| `docs/<short-slug>` | Documentation only |
| `refactor/<short-slug>` | Internal restructure, no behavior change |
| `test/<short-slug>` | Tests only |
| `release/x.y.z` | Release preparation (optional) |

Rules:

- Branch from the latest **`dev`**
- Open PRs **into `dev`** for normal work
- Promote staging → prod with a PR **`dev` → `main`**
- One concern per branch / PR
- No long-lived feature branches; open a draft PR early if work spans days
- Do **not** commit or push directly to `main`

Examples: `feat/staff-cancel-reservation`, `fix/billing-session-confirm`, `docs/branching-rules`

## Commits (Conventional Commits)

```
<type>(optional-scope): <imperative summary>

[optional body]
```

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`, `revert`

Scopes (optional): `api`, `web`, `booking`, `billing`, `ops`, `docs`, `infra`

Examples:

```
feat(booking): allow STAFF to cancel and switch tables
fix(billing): confirm Stripe session on success page
docs: add branching and release conventions
```

- Imperative mood, ≤72 chars on the subject line
- `BREAKING CHANGE:` in the body (or `!` after type) when you break a public API or migration contract
- Do not mix unrelated concerns in one commit

## Pull requests

1. Open against **`dev`** (feature work) or **`main`** only when promoting from `dev`
2. Fill in the PR template completely
3. Keep PRs reviewable (prefer < ~400 lines of meaningful diff; split if larger)
4. Link issues with `Fixes #n` / `Closes #n` when applicable
5. Require a green local check before requesting review:

```powershell
.\run-be-test.ps1
.\run-fe-test.ps1
```

(CI will enforce this once more Actions are enabled.)

### Review expectations

- While solo: PRs are still **required** for `main` (no direct push); self-merge is allowed via admin bypass
- With a team: at least **1 approving review**; author must not be the only approval; enable Code Owner review
- Address or explicitly dismiss review comments before merge
- Prefer small, focused follow-up PRs over drive-by scope creep in review

### Merge policy

| Setting | Value |
|---------|--------|
| Allowed merge method | **Squash and merge only** |
| Merge commit / rebase | Disabled |
| Delete head branch | On after merge (never delete `dev` or `main`) |
| Commit message on squash | Use the PR title (Conventional Commit) + PR body summary |

Never force-push to `main` or `dev`. Force-push on your own feature branch is fine after a rebase onto `dev`.

## Releases & changelog

- We ship from `main` via **semver tags** `vX.Y.Z` after a `dev` → `main` promotion
- Staging is whatever is on `dev` (see [docs/deploy-staging-omen.md](docs/deploy-staging-omen.md))
- Release notes are generated from merged PR titles/labels — see [docs/engineering/branching-and-releases.md](docs/engineering/branching-and-releases.md)
- Update [CHANGELOG.md](CHANGELOG.md) under `Unreleased` as you merge user-facing work (or rely on the release PR that cuts the tag)

Version bumps:

| Change | Bump |
|--------|------|
| Breaking API / data migration customers must know about | **MAJOR** |
| New capability, backwards compatible | **MINOR** |
| Bug fix / chore / docs with no API change | **PATCH** |

## Code conventions

### Backend (`backend/`)

- Java 21, Spring Boot 3.x
- Flyway migrations are append-only; never rewrite a shipped migration
- Multi-tenant context and RBAC must be explicit on mutating endpoints
- Prefer tests next to the risk (booking concurrency, billing, webhook idempotency)

### Frontend (`frontend/`)

- TypeScript strict; no `any` without a short comment
- TanStack Query for server state; keep mutations co-located with the feature
- Match existing UI patterns; do not introduce a second design system
- E2E (Playwright) for critical guest + floor paths when you touch them

### Docs (`docs/`)

- Doctrine changes require an explicit note in the PR
- Prefer updating the canonical doc over adding a parallel “new truth”

## Secrets & local files

Never commit:

- `.env`, `.env.*`, credentials, API tokens, private keys
- Ad-hoc curl payloads / session dumps at the repo root (`*.json` scratch files)
- Production dumps, customer PII, Stripe live secrets

Use `.env.example` / `.env.*.example` (or docs) for required variable names only.

## Security issues

See [SECURITY.md](SECURITY.md). Do not file public issues for vulnerabilities.
