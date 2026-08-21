# Operations Dashboard

The Operations Dashboard is the internal UI for the Razorpay AI Revenue Recovery system. It allows operators, product managers, and support staff to visualize the performance of the system, audit individual case histories, and monitor overall infrastructure resilience.

## Core Capabilities

1. **Revenue Funnel Monitoring:**
   - Visualizes the conversion from `total_at_risk` -> `interventions_attempted` -> `recovered`.
   - Displays real-time metrics on overall recovery rate and outstanding active escalations.

2. **Case Auditing & History:**
   - Lists all cases with advanced filtering (by `merchantId`, `state`, etc.).
   - Provides a detailed view for a specific Case ID, including the complete, immutable event-sourced audit log.
   - Shows all interventions taken by the AI for a specific case, alongside their final outcomes.

3. **Evaluation Runs:**
   - Displays historical evaluation artifacts (generated via `make evaluate`).
   - Allows users to review the batch outcomes, false intervention costs, and stopping rule compliance.

4. **System Resilience & Status:**
   - Monitors internal safety mechanisms (circuit breakers for Razorpay API, LLM API, and Redis).
   - Displays real-time queue depths for the outbox processor and background intervention workers.

## Technical Architecture

The dashboard is built using a modern, lightweight Single Page Application (SPA) architecture, decoupled from the backend monolith but tightly integrated via standard HTTP REST APIs.

### Stack
- **Framework:** React 18 + Vite (Strictly no Next.js).
- **Language:** TypeScript for end-to-end safety.
- **Styling:** Tailwind CSS (utility-first, no heavy component libraries).
- **State & Data Fetching:** TanStack React Query + native `fetch` (via `ApiClient`).
- **Routing:** React Router DOM (v7).

### API Integration
The dashboard communicates exclusively with the NestJS backend via the `api/v1` namespace. It does **not** communicate directly with the database, Redis, the LLM, or Razorpay APIs.

*See `docs/operations/UI_INFORMATION_ARCHITECTURE.md` for a detailed breakdown of pages and components.*
