# GitHub repository settings (Mesaro)

This file is the source of truth for how the remote repo should be configured.
Apply once after `gh repo create` (or re-apply after org policy changes).

CI/Actions are intentionally **not** required yet; enable status-check protection when workflows are ready.

## Visibility & basics

| Setting | Value |
|---------|--------|
| Visibility | Private (until public launch decision) |
| Default branch | `main` |
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

## Branch protection — `main`

| Rule | Value |
|------|--------|
| Require a pull request before merging | ✅ |
| Required approvals | **0 while solo** → raise to **1** when a second engineer joins |
| Dismiss stale pull request approvals when new commits are pushed | ✅ |
| Require review from Code Owners | ❌ while solo → ✅ with team |
| Require conversation resolution before merging | ✅ |
| Require status checks to pass | ❌ until Actions are enabled |
| Require branches to be up to date before merging | Optional; turn on with checks |
| Admin bypass | `pull_request` mode only (merge own PRs; still no direct push) |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |
| Lock branch | ❌ |

Prefer **Rulesets** (modern) over legacy branch protection if the account supports them.

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
