# Contributing to RazorPay Buildathon

## Branch Strategy

- **`main`**: The primary integration branch. All code must be merged here. Direct commits are permitted and encouraged in this phase.
- Ensure the branch is synced and healthy before committing.

## Pull Requests

When creating a PR (if applicable):
1. Use the standard PR template.
2. Ensure you have tested the code locally (`make verify`).
3. Ensure no PII, real customer emails, or live secrets are included in any test payloads.
4. Update relevant documentation in `/docs` (Architecture, ADRs) *in the same PR* as your code change.

## Code Quality & Fintech Safety

- **Deterministic over Smart**: Maintain deterministic logic for financial operations. AI models (LLMs/XGBoost) must never directly initiate a state transition.
- **Idempotency**: All background workers must use locks and version checks. Never assume a webhook will only fire once.
- **Type Safety**: Avoid `any` types. Rely on Zod and Prisma generated types.
- **Explain the Why**: Document the "why", not just the "how", in inline comments. Avoid magical abstractions; prefer clear module boundaries.
