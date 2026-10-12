# Branching, PRs, merging, and releases

Canonical engineering process for this repository. [CONTRIBUTING.md](../../CONTRIBUTING.md) is the short contributor-facing version.

## Model

Long-lived **integration** and **production** branches:

```
feat/* | fix/* | …  ──PR──►  dev  ──PR──►  main
                              │              │
                              ▼              ▼
                         staging (Omen)   prod (Hostinger, later)
                              │              │
                         GHA on push      GHA on push (stub until VPS)
```

| Branch | Role |
|--------|------|
| `dev` | Default working branch. Integration + **staging** source of truth. Auto-deploys to Omen. |
| `main` | **Production-ready** only. Advances via PR from `dev`. Future Hostinger prod deploy. |
| `feat/*` etc. | Short-lived work. PR into `dev` (not directly into `main`). |

- Hotfixes that must skip staging: still land on `dev` first when possible; emergency `fix/*` → `main` only with an explicit follow-up merge back into `dev`.
- Tags / GitHub Releases are cut from `main`.

## Protected `main` (policy + settings)

> **Enforcement note:** Branch protection / rulesets on a **private** repo require GitHub Pro (or Team/Enterprise). Merge methods below are applied; protection rules are policy until Pro is available. See [`.github/REPO_SETTINGS.md`](../../.github/REPO_SETTINGS.md).

| Rule | Setting |
|------|---------|
| Require a pull request | Yes |
| Preferred head for prod promotion | `dev` (policy: open `dev` → `main` PRs) |
| Required approving reviews | 0 while solo → ≥ 1 with a team |
| Dismiss stale reviews on new commits | Yes |
| Require conversation resolution | Yes |
| Allow force pushes | No |
| Allow deletions | No |
| Bypass allowances | Repo admins may bypass review gates on PRs only (solo self-merge) |
| Status checks | Required once CI is enabled (later) |

**Direct pushes to `main` are not allowed.** Prefer not pushing directly to `dev` either — use feature branches + PRs; admin push to `dev` is an escape hatch only.

## Deploy mapping

| Event | Workflow | Target |
|-------|----------|--------|
| Push to `dev` | [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml) | Omen LAN staging (self-hosted runner `mesaro-staging`) |
| Push to `main` | [`.github/workflows/deploy-prod.yml`](../../.github/workflows/deploy-prod.yml) | Production (stub until Hostinger VPS) |

See [docs/deploy-staging-omen.md](../deploy-staging-omen.md).

## Merge settings (applied on GitHub)

| Method | Status |
|--------|--------|
| Merge commits | **Disabled** |
| Rebase and merge | **Disabled** |
| Squash and merge | **Enabled (only)** |
| Auto-delete head branch | **On** (feature branches; keep `dev`) |
| Auto-merge | Optional (on after checks exist) |

Squash subject = Conventional Commit PR title. Squash body = short summary from the PR template.

## PR labels (for release notes)

Apply one primary category label on every PR that should appear in release notes:

| Label | Release-notes section |
|-------|------------------------|
| `release-notes:feature` | Features |
| `release-notes:fix` | Bug Fixes |
| `release-notes:breaking` | Breaking Changes |
| `release-notes:security` | Security |
| `release-notes:docs` | Documentation |
| `release-notes:chore` | Maintenance |
| `skip-release-notes` | Omitted from generated notes |

Additional triage labels (optional): `area:api`, `area:web`, `area:billing`, `area:booking`, `area:ops`, `priority:p0`.

## Cutting a release

1. Ensure `dev` has been validated on staging
2. Open / merge PR `dev` → `main`
3. Confirm [CHANGELOG.md](../../CHANGELOG.md) `Unreleased` section (or generate from labeled PRs)
4. Decide semver bump (MAJOR / MINOR / PATCH) per CONTRIBUTING
5. Tag from `main`:

```powershell
git checkout main
git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

6. Create a GitHub Release for the tag (UI or `gh release create`)
7. Use **Generate release notes** — categories come from [`.github/release.yml`](../../.github/release.yml)
8. Move changelog items from `Unreleased` → `[X.Y.Z] - YYYY-MM-DD` in a follow-up PR if not already done

### Optional `release/x.y.z` branch

Use only when you need a short freeze window. Branch from `main`, PR back to `main`, then merge `main` back into `dev` so staging stays aligned.

## Versioning contract

- Tags are immutable; never move a published `vX.Y.Z`
- Backend Maven `version` and frontend `package.json` version should match the release tag when we start shipping customer-facing builds (can be automated later with Actions)
- Database: Flyway migrations shipped in a release are append-only forever

## What “done” means for a PR

- Behavior matches doctrine (or documents an intentional temporary gap)
- Tests cover the risk you touched
- No secrets committed
- Docs updated if user-facing or ops behavior changed
- Labels set for release notes
- Feature PRs target `dev`; promotion PRs target `main` from `dev`
