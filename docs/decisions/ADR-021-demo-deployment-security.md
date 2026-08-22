# Demo Deployment Security (ADR-021)

**Date**: 2026-08-22
**Status**: Accepted
**Track**: 03 — AI Revenue Recovery

## Context
The Razorpay AI Buildathon requires a deployable demonstration environment. This environment will likely run on a VM or Docker host exposed to reviewers. We must ensure that deploying the demo does not expose the host system, the database, or any sensitive API keys to the public internet.

## Decision
We enforce the following strict boundaries for the demo deployment:

1. **Port Binding Restriction**: The `postgres` container in `docker-compose.yaml` is bound strictly to `127.0.0.1:5433:5432`. It is not accessible from the external network interfaces of the host.
2. **API & Frontend Binding**: The API and Frontend services are bound to `127.0.0.1`. A reverse proxy (e.g., Nginx or Caddy) must be used on the host to expose the frontend safely over HTTPS if external access is required.
3. **Configuration Guards**: The `configuration.ts` explicitly checks the `APP_ENV`. If it is `demo`, it strictly forbids `RAZORPAY_MODE=live` and `TWILIO_ENABLED=true` (for real SMS/Voice). It also validates that if Razorpay integration is enabled, the key must start with `rzp_test_`.
4. **Secret Management**: The `.env` file is excluded from Docker build contexts using `.dockerignore`.

## Consequences
### Positive
- Reviewers can safely deploy the demo without risking actual financial transactions.
- Port scans on the demo host will not reveal an open PostgreSQL port.
- Hardcoded test configurations prevent accidental exposure even if a user accidentally pastes a live API key into the environment variables.

### Negative
- If a reviewer wishes to test the API directly from a different machine without a reverse proxy, they will need to manually edit `compose.yaml` to bind to `0.0.0.0`, assuming the risk intentionally.
