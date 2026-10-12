# Parked workflows

Some GitHub Actions workflows are intentionally **not active** yet.

**Active:** `backend-ci.yml` lives in `.github/workflows/` — runs on push/PR to `dev` and `main` when `backend/**` changes.

**Still parked:** `e2e.yml` remains here until secrets and fragile mocks are ready. When you unpark it, move the file into `.github/workflows/` (requires a GitHub token with the `workflow` scope), then require the matching status checks on `main` (see `.github/REPO_SETTINGS.md`).
