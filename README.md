# Mesaro

Reservation software restaurants actually use — **€50/month**, no commission, no complexity.

Mesaro is a multi-tenant restaurant reservation SaaS for independent restaurants and small groups: guest booking + embed, floor ops, tables & hours, staff, planning, vacations, and reports.

| Layer | Stack |
|-------|--------|
| **Backend** | Spring Boot 3.5 · Java 21 · PostgreSQL · Flyway · Redis · Stripe |
| **Frontend** | React 18 · TypeScript · Vite · TanStack Query · Playwright |
| **Docs** | Product doctrine, technical reference, ops runbooks |
| **Repo** | [github.com/jbmaene1998/mesaro](https://github.com/jbmaene1998/mesaro) (private) |

## Repository layout

```
backend/     Spring Boot API
frontend/    React SPA + marketing
docs/        Product & engineering documentation
scripts/     Utility scripts (incl. GitHub bootstrap)
.github/     PR/issue templates, CODEOWNERS; CI parked under ci-parked/
run-*.ps1    Local infra / test / prod-local helpers
```

## Quick start (local)

```powershell
.\run-infra.ps1      # Postgres + Redis
.\run-dev.ps1        # API :8080 + FE :3000
```

See [docs/README.md](docs/README.md) for the full doc index and [docs/local-prod-deploy.md](docs/local-prod-deploy.md) for a local production-shaped run.

**Demo logins (dev seed):** `admin@demo.com` · `manager.demo@demo.com` · `staff.demo@demo.com` — password `demo123`

## Status (short)

Core money/floor/legal-route paths are implemented in code (~78% company readiness). Remaining before paid ads: prod email smoke, counsel on Privacy/Terms, unpark CI, Hostinger VPS cutover. Details: [docs/README.md](docs/README.md).

## Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR. Short version:

- Branch from `main` using conventional prefixes (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`)
- Open a PR; squash-merge only
- Conventional Commits; keep `main` releasable
- Product decisions defer to [docs/product-doctrine.md](docs/product-doctrine.md)

## Branching & releases

| Branch / tag | Purpose |
|--------------|---------|
| `main` | Production-ready line (PR-required by policy; GitHub enforcement needs Pro on private repos) |
| `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `test/*` | Short-lived work branches |
| `release/x.y.z` | Optional release-prep branch when needed |
| `vX.Y.Z` tags | Immutable releases (GitHub Releases + notes) |

Full rules: [docs/engineering/branching-and-releases.md](docs/engineering/branching-and-releases.md)

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.

## License

Proprietary — all rights reserved unless a `LICENSE` file is added later.
