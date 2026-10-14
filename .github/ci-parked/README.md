# Parked workflows

Some GitHub Actions workflows are intentionally **not active** yet.

**Active (under `.github/workflows/`):**

| Workflow | When | Job names (for required checks) |
|----------|------|----------------------------------|
| `backend-ci.yml` | Every PR/push to `dev`/`main` | `Backend CI / Backend tests` |
| `frontend-ci.yml` | Every PR/push to `dev`/`main` | `Frontend CI / Frontend unit tests` |
| `e2e.yml` | Every PR/push to `dev`/`main` | `E2E Tests / Playwright E2E` |
| `deploy-staging.yml` | Push to `dev` | includes `E2E smoke (staging)` after deploy |

When enabling branch protection / rulesets, require the three PR check names above (exact job titles). See [`.github/REPO_SETTINGS.md`](../REPO_SETTINGS.md).

**Empty:** this folder previously held `e2e.yml` until secrets/mocks were ready; E2E is now unparked.
