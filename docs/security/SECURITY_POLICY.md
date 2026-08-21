# Security Policy

## Vulnerability Handling

1. **Dependency Exceptions**: The CI pipeline will fail on any verified high-severity vulnerability in production dependencies. Exceptions must be documented in `SECURITY_EXCEPTIONS.md` and approved by the team.
2. **Secret Scanning**: TruffleHog checks for committed secrets. Any found secrets must be revoked immediately, and the offending commit should be addressed.
3. **Low-Risk Advisories**: Dev-only low-risk advisories will not fail the CI build by default to reduce noise.

## Reporting a Vulnerability

Please do not open a public issue for security vulnerabilities. Instead, contact the repository maintainer directly.
