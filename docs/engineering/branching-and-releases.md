# Branching, PRs, merging, and releases

Canonical engineering process for this repository. [CONTRIBUTING.md](../../CONTRIBUTING.md) is the short contributor-facing version.

## Model

We use a **trunk-based** workflow with short-lived branches:

```
main  ←── squash-merge PRs from feat/* | fix/* | chore/* | …
  │
  └── tag vX.Y.Z  →  GitHub Release (+ notes)
```

- `main` is always production-ready (or the closest honest equivalent while we harden launch)
- No long-lived `develop` branch
- Hotfixes: branch `fix/<slug>` from `main`, PR back to `main`, then tag a patch release

## Protected `main` (enforced on GitHub)

| Rule | Setting |
|------|---------|
| Require a pull request | Yes |
| Required approving reviews | 0 while solo → ≥ 1 with a team |
| Dismiss stale reviews on new commits | Yes |
| Require conversation resolution | Yes |
| Allow force pushes | No |
| Allow deletions | No |
| Bypass allowances | Repo admins may bypass review gates on PRs only (solo self-merge) |
| Status checks | Required once CI is enabled (later) |

Direct pushes to `main` are not allowed.

## Merge settings (enforced on GitHub)

| Method | Status |
|--------|--------|
| Merge commits | **Disabled** |
| Rebase and merge | **Disabled** |
| Squash and merge | **Enabled (only)** |
| Auto-delete head branch | **On** |
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

1. Ensure `main` is green and includes everything intended for the cut
2. Confirm [CHANGELOG.md](../../CHANGELOG.md) `Unreleased` section (or generate from labeled PRs)
3. Decide semver bump (MAJOR / MINOR / PATCH) per CONTRIBUTING
4. Tag from `main`:

```powershell
git checkout main
git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

5. Create a GitHub Release for the tag (UI or `gh release create`)
6. Use **Generate release notes** — categories come from [`.github/release.yml`](../../.github/release.yml)
7. Move changelog items from `Unreleased` → `[X.Y.Z] - YYYY-MM-DD` in a follow-up PR if not already done

### Optional `release/x.y.z` branch

Use only when you need a short freeze window (docs polish, version bumps, last-minute patch) without blocking unrelated `main` merges. Merge the release branch back to `main` via PR, then tag.

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
