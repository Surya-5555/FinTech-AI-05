# ADR 009: NestJS API Foundation

- We use NestJS for its dependency injection and architecture constraints.
- We restrict Prisma access behind repository interfaces.
- We use centralized exception filters to ensure secure, standardized error responses.
