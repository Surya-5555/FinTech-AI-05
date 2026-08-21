# Contributing to RazorPay Buildathon

## Branch Strategy

- **`main`**: The primary integration branch. All code must be merged here. Direct commits are permitted and encouraged in this phase.
- Ensure the branch is synced and healthy before committing.

## Pull Requests

When creating a PR (if applicable):
1. Use the standard PR template.
2. Ensure you have tested the code locally (`make verify`).
3. Ensure no PII or live secrets are included in tests.
4. Update relevant documentation in `/docs`.

## Code Quality

- Maintain deterministic logic for financial operations.
- Avoid magical abstractions; prefer clear module boundaries.
- Document the "why", not just the "how".
