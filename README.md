# Mesaro

Reservation software restaurants actually use — **€50/month**, no commission, no complexity.

Mesaro is a multi-tenant restaurant reservation SaaS for independent restaurants and small groups: guest booking + embed, floor ops, tables & hours, staff, planning, vacations, and reports.

| Layer | Stack |
|-------|--------|
| **Backend** | Spring Boot 3.5 · Java 21 · PostgreSQL · Flyway · Redis · Stripe |
| **Frontend** | React 18 · TypeScript · Vite · TanStack Query · Playwright |
| **Docs** | Product doctrine, technical reference, ops runbooks |

## Repository layout

```
backend/     Spring Boot API
frontend/    React SPA + marketing
docs/        Product & engineering documentation
infra/       Local/prod infrastructure helpers
scripts/     Utility scripts
.github/     PR/issue templates, CODEOWNERS, (CI later)
```

## Quick start (local)

```powershell
.\run-infra.ps1      # Postgres + Redis
.\run-dev.ps1        # API :8080 + FE :3000
```

See [docs/README.md](docs/README.md) for the full doc index and [docs/local-prod-deploy.md](docs/local-prod-deploy.md) for a local production-shaped run.

**Demo logins (local seed):** `admin@demo.com` / `demo123` · `staff.demo@demo.com` / `demo123`

## Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR. Short version:

- Branch from `main` using the naming rules below
- Open a PR; squash-merge only
- Conventional Commits; keep `main` releasable
- Product decisions defer to [docs/product-doctrine.md](docs/product-doctrine.md)

## Branching & releases

| Branch / tag | Purpose |
|--------------|---------|
| `main` | Production-ready line. Protected. |
| `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*` | Short-lived work branches |
| `release/x.y.z` | Optional release-prep branch when needed |
| `vX.Y.Z` tags | Immutable releases (GitHub Releases + notes) |

Full rules: [docs/engineering/branching-and-releases.md](docs/engineering/branching-and-releases.md)

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.

## License

Proprietary — all rights reserved unless a `LICENSE` file is added later.
