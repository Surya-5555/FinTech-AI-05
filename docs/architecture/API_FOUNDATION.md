# API Foundation

- NestJS serves strictly as the HTTP delivery layer.
- Persistence details are isolated using tokens/adapters.
- Controllers validate DTOs and call domain/use-case services (to be added later).
- No business logic in controllers.
