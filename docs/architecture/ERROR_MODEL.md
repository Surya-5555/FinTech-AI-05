# Stable Error Model

## Overview
In financial infrastructure, error handling must be completely deterministic, safe, and highly structured. An unhandled exception or an inconsistent error response can lead to corrupted client state, incorrect retries, or security vulnerabilities (via stack trace leakage). The Razorpay AI Revenue Recovery system implements a unified, global Error Model across the entire API and Worker boundaries.

## The Global Exception Filter

All exceptions thrown within the NestJS execution context are caught by a global `HttpExceptionFilter`. This filter ensures that regardless of where a failure occurs (a database constraint violation, a Zod validation error, or an unhandled Promise rejection), the client receives a strictly typed JSON response.

### Standard Error Envelope
Every API error adheres to the following JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE_ENUM",
    "message": "Human-readable but safe error description",
    "correlationId": "uuid-v4-string",
    "details": [
      {
        "field": "amount",
        "issue": "must be a positive integer"
      }
    ]
  }
}
```

## Error Classifications

### 1. Domain Exceptions
Business logic errors (e.g., `PlanAlreadyExecutingError`, `UnmetPreconditionError`) inherit from a base `DomainError` class. These map cleanly to HTTP 409 (Conflict) or 422 (Unprocessable Entity). These errors indicate the request was understood but violates financial safety rules.

### 2. Validation Exceptions
Payload failures caught by the validation pipe map to HTTP 400 (Bad Request). The `details` array is populated with the specific fields that failed validation, ensuring the consumer can programmatically correct their request.

### 3. System Exceptions
Unexpected failures (e.g., `PrismaClientInitializationError`, Redis timeouts) are caught, logged as `ERROR` severity with full stack traces internally, but returned to the client as a generic HTTP 500 (Internal Server Error) with a `code` of `INTERNAL_ERROR`. **No database internals or connection strings are ever leaked in the response.**

## Tracing and Diagnostics
The `correlationId` included in every error response matches the `x-correlation-id` injected by the Observability layer, allowing engineers to instantly query the exact execution path in the logging backend using the error ID provided by the client.
