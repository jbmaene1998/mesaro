## Target branch

- [ ] `dev` (normal work → staging)
- [ ] `main` (promotion from `dev` only)

## Summary

<!-- 1–3 bullets: what and why (not a file list) -->

-

## Type of change

- [ ] Feature (`feat`)
- [ ] Bug fix (`fix`)
- [ ] Docs
- [ ] Chore / refactor / test
- [ ] Breaking change (call out migration / API impact below)

## Doctrine check

- [ ] Aligns with [docs/product-doctrine.md](../docs/product-doctrine.md) (or explains a temporary exception)
- [ ] Does **not** add competitor-suite complexity for its own sake

## How tested

- [ ] Backend tests (`.\run-be-test.ps1` or scoped Maven)
- [ ] Frontend unit tests (`.\run-fe-test.ps1` / vitest)
- [ ] Playwright / manual path for guest or floor flows (if touched)
- [ ] N/A — docs / chore only

## Risk & rollout

<!-- Data migration? Feature flag? Stripe / webhook impact? Tenant isolation? -->

-

## Release notes

- [ ] Label applied (`release-notes:*` or `skip-release-notes`)
- [ ] User-facing blurb (one line, or “none”):

>

## Checklist

- [ ] Conventional Commit PR title (becomes the squash commit)
- [ ] No secrets / `.env` / PII / scratch JSON
- [ ] Docs updated if behavior or ops changed
- [ ] Linked issue (`Fixes #…`) if applicable
