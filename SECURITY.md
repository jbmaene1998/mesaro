# Security Policy

## Supported versions

Only the latest tagged release on `main` receives security fixes unless a prior tag is explicitly marked as supported.

## Reporting a vulnerability

**Do not open a public GitHub issue for security bugs.**

Email the maintainers privately (or use GitHub Security Advisories once enabled on this repository) with:

1. Description of the issue and impact
2. Steps to reproduce (PoC if available)
3. Affected component (`backend`, `frontend`, infra, third-party)
4. Whether you believe customer data or payments are at risk

We aim to acknowledge within **3 business days** and provide a remediation plan or status update within **10 business days**.

Please give us a reasonable window to patch and release before any public disclosure.

## Scope highlights

Highest priority surfaces:

- Auth / JWT / session handling
- Multi-tenant isolation and RBAC
- Stripe webhooks and billing confirmation
- Guest booking tokens (confirm / cancel links)
- PII storage and GDPR deletion paths
- Secrets in env / CI / hosting

## Out of scope (report still welcome, lower priority)

- Denial of service without a concrete exploit path
- Issues that require physical access or already-compromised admin credentials
- Findings only present on intentionally insecure local demo seeds
