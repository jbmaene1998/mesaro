# Changelog

All notable changes to Mesaro are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

How we cut releases: [docs/engineering/branching-and-releases.md](docs/engineering/branching-and-releases.md)

## [Unreleased]

### Added

- Repository production baselines: branching, PR templates, CODEOWNERS, security policy, release-note categories
- Privacy + Terms marketing routes (founder drafts)
- Hostinger VPS + local-prod deploy runbooks; parked CI workflows under `.github/ci-parked/`

### Changed

- Docs rescored 2026-10-12 from code audit: readiness ~72%; staging CD live; test CI still parked; webhook deserialize hole + PAST_DUE called out as open
- `.env.prod.example` aligned with compose (Stripe, `MESARO_DOMAIN`, `ACME_EMAIL`)

### Fixed

- Billing success confirm; guest booking billing gate; webhook claim→done/failed path *(deserialize-null→done still open)*
- STAFF cancel/switch + self-vacation; restaurant `/select`; accept-invite set-password
- Dev seed `maxRestaurants` aligned with 2 demo restaurants
- Planning cold-load; guest slot `HH:mm`; guest cancel deep-links

### Security

- Prod fail-fast for insecure secrets / log-only email outside `dev`

<!--
When cutting a release:
1. Move Unreleased items under ## [X.Y.Z] - YYYY-MM-DD
2. Tag vX.Y.Z on main
3. Publish a GitHub Release with generated notes
-->
