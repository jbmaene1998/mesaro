# GitHub repository settings (Mesaro)

This file is the source of truth for how the remote repo should be configured.
Apply once after `gh repo create` (or re-apply after org policy changes).

CI workflows are active on every PR to `dev`/`main`. Require these status checks when the plan allows (GitHub Pro / public / org rulesets):

| Check name | Workflow |
|------------|----------|
| `Backend CI / Backend unit tests` | `backend-ci.yml` |
| `Frontend CI / Frontend unit tests` | `frontend-ci.yml` |
| `E2E Tests / Playwright E2E` | `e2e.yml` |

Staging also runs `E2E smoke (staging)` after `deploy-staging` (not a PR gate).

## Visibility & basics

| Setting | Value |
|---------|--------|
| Visibility | Private (until public launch decision) |
| Default branch | `dev` (day-to-day); `main` is production-ready only |
| Features | Issues ✅ · Projects optional · Wiki ❌ · Discussions optional |
| Preserve this repository | Recommended once shipping |

## Pull requests & merging

| Setting | Value |
|---------|--------|
| Allow merge commits | ❌ |
| Allow squash merging | ✅ |
| Allow rebase merging | ❌ |
| Squash commit default message | Pull request title |
| Always suggest updating PR branches | ✅ |
| Automatically delete head branches | ✅ |
| Allow auto-merge | ✅ (useful once checks exist) |

## Branch protection — `main` (prod)

| Rule | Value |
|------|--------|
| Require a pull request before merging | ✅ |
| Preferred head branch for promotion | `dev` (policy) |
| Required approvals | **0 while solo** → raise to **1** when a second engineer joins |
| Dismiss stale pull request approvals when new commits are pushed | ✅ |
| Require review from Code Owners | ❌ while solo → ✅ with team |
| Require conversation resolution before merging | ✅ |
| Require status checks to pass | ✅ when plan allows — require `Backend CI / Backend unit tests`, `Frontend CI / Frontend unit tests`, `E2E Tests / Playwright E2E` |
| Require branches to be up to date before merging | Optional; turn on with checks |
| Admin bypass | `pull_request` mode only (merge own PRs; still no direct push) |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |
| Lock branch | ❌ |

## Branch protection — `dev` (staging)

| Rule | Value |
|------|--------|
| Require a pull request before merging | ✅ (feature → `dev`) |
| Required approvals | **0 while solo** → raise to **1** with a team |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |
| Admin bypass | Merge own PRs only — **no direct push** |

Prefer **Rulesets** (modern) over legacy branch protection if the account supports them.

## Deploy Actions

| Workflow | Branch | Runner | GitHub Environment |
|----------|--------|--------|--------------------|
| `backend-ci.yml` | PR/push `dev`/`main` | `ubuntu-latest` | — |
| `frontend-ci.yml` | PR/push `dev`/`main` | `ubuntu-latest` | — |
| `e2e.yml` | PR/push `dev`/`main` | `ubuntu-latest` (ephemeral API + Playwright) | optional `E2E_*` repo secrets |
| `deploy-staging.yml` | `dev` | Self-hosted `mesaro-staging` + post-deploy smoke on `ubuntu-latest` | `staging` |
| `deploy-prod.yml` | `main` | GitHub-hosted stub until Hostinger VPS | `production` |
| `require-pull-request.yml` | `dev`, `main` | Fails the push check if the commit is not from a PR | — |

### Environments (secrets & config)

| Environment | Source of truth for values | Schema |
|-------------|----------------------------|--------|
| `staging` | Settings → Environments → staging (Variables + Secrets) | [`backend/.env.staging.example`](../backend/.env.staging.example) |
| `production` | Settings → Environments → production | [`backend/.env.prod.example`](../backend/.env.prod.example) |

Full var/secret checklist: [`.github/environments/README.md`](environments/README.md).

Deploy jobs **rewrite** host `.env.staging` / (future) `.env.prod` from the Environment on every run. Do not treat the file on disk as editable source of truth.

**Who can access**

| Role | Secrets UI | Effect |
|------|------------|--------|
| Repo admin (you) | Create/update Variables & Secrets (values never shown again after save) | Servers receive them via Actions |
| Future employees (write) | Cannot read secret values | Can still exfiltrate if they change a workflow that prints secrets |

**When a second engineer joins**

1. Raise required PR approvals to **1** on `dev`/`main` (and enable CODEOWNERS).
2. Add CODEOWNERS for `.github/workflows/**` and `.github/environments/**` (admin-only review).
3. On Environment `production` (and optionally `staging`): enable **Required reviewers** so only you approve deploys that receive secrets.
4. Do not grant admin to employees who should not manage credentials.

### Free-plan note (current account)

GitHub **does not allow branch protection / rulesets on private repos** without GitHub Pro (or a Team/Enterprise org). On the free plan:

- Keep the repo **private** and treat CONTRIBUTING as policy
- Use [`.github/workflows/require-pull-request.yml`](workflows/require-pull-request.yml) so direct pushes to `dev`/`main` fail the check (does not block the git push itself without Pro rulesets)
- Upgrade to **GitHub Pro** to hard-block pushes at the API (recommended), or
- Make the repo **public** (then protection works on free) — usually wrong for proprietary SaaS

`scripts/github-bootstrap.ps1` applies merge methods + labels on any plan; protection applies only when the API allows it.

## Labels to create

Release-note categories:

- `release-notes:feature`
- `release-notes:fix`
- `release-notes:breaking`
- `release-notes:security`
- `release-notes:docs`
- `release-notes:chore`
- `skip-release-notes`

Triage:

- `type:bug`, `type:feature`
- `area:api`, `area:web`, `area:billing`, `area:booking`, `area:ops`
- `priority:p0`, `priority:p1`, `priority:p2`

## Security features (enable in UI / API)

- Private vulnerability reporting ✅
- Secret scanning ✅ (and push protection if available on plan)
- Dependabot alerts ✅ (grouped updates later with Actions)

## Apply via CLI (after auth)

See `scripts/github-bootstrap.ps1`.
