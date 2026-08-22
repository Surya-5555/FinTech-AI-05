# Security & Demo Boundaries

This document details the intentional security boundaries, auth models, and data handling policies implemented for the Razorpay AI Buildathon (Track 03). Our goal is to close critical security gaps without over-engineering an enterprise identity platform (e.g., full OAuth/OIDC).

## 1. Auth Model (API Authentication)
We implemented a deliberate, lightweight **Bearer-token guard** (`OperatorAuthGuard`) for all operator and administrative actions. 
- The token is defined via the `API_AUTH_TOKEN` environment variable.
- Requests to protected endpoints must include the header: `Authorization: Bearer <API_AUTH_TOKEN>`.
- **Fail-Closed Boot:** The API strictly validates the presence of this token at startup and will fail to boot if it is missing.

## 2. Protected Endpoints (Authorization Boundary)
All mutation, execution, and evaluation-trigger endpoints are explicitly protected by the `OperatorAuthGuard`. This ensures no state-changing actions can be performed without authorization.
- `POST /events/ingest`
- `POST /cases/:caseId/plans`
- `POST /cases/:caseId/plans/:planId/enqueue`
- `PUT /policies/merchants/:merchantId`
- `POST /cases/:caseId/message-draft`

### Demo Read Boundary
To support seamless demonstration of the internal operations console, **read-only endpoints** (e.g., `GET /cases`, `GET /dashboard`, `GET /evaluation`) are intentionally left open. This satisfies the Buildathon's demo requirements while ensuring deterministic financial safety on all mutations.

## 3. Secure Configuration & Fail-Closed Behaviors
The system relies on strict runtime environment validation (`configuration.ts`):
- All live credentials (LLM, Razorpay, Twilio, Resend) are strictly validated.
- If live integration is requested (`RAZORPAY_INTEGRATION_ENABLED=true`) but the provided keys do not match the expected test-mode prefix (`rzp_test_`), the application forcibly crashes on boot.
- The `.env.example` file is strictly scrubbed of any live or test secrets, ensuring no credentials leak into Git.

## 4. Input & Tool Boundaries
The system treats all LLM outputs as untrusted text:
- **LLM Boundary:** The LLM's role is strictly bounded to reasoning and message generation. The LLM cannot mutate critical deterministic state (e.g., intervention types, amounts, or idempotency keys). 
- **Strict Validation:** The API uses NestJS's `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`. Any attempt (by an operator, a script, or an LLM payload) to inject unauthorized fields into DTOs is immediately rejected with a `400 Bad Request`.

## 5. Data Minimization
Logs are treated as an untrusted sink:
- The global `Pino` logger is configured to aggressively redact sensitive request payloads (`req.headers.authorization`, `req.headers.cookie`, `req.body.token`, `req.body.apiKey`).
- The system operates entirely on synthetic data (e.g., generated case IDs and synthetic amounts), meaning actual PII is never handled or logged during the demo.
