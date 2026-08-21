# Asynchronous Workflow Foundation

## Architecture
The system uses an event-driven async workflow orchestration.

1. **API / Core System**: Generates a `RecoveryPlan` with status `POLICY_APPROVED`.
2. **Enqueue Intent**: The API saves an `OutboxEvent` to Postgres while updating the Case state.
3. **Outbox Publisher**: A daemon reads the `OutboxEvent` and safely publishes a `RecoveryPlanExecutionJob` to Redis (BullMQ).
4. **Worker (BullMQ Processor)**: Pulls the job.
   - Re-reads canonical state (Postgres).
   - Re-evaluates policies (domain logic).
   - Checks idempotency keys.
   - Prepares an `Intervention` record.
   - Audits the action.

## Safety Constraints
- Workers do not own State. They only mediate execution and record outcomes.
- Queue jobs carry identifiers, not secure data.
- Transient DB failures in the worker cause a job retry (handled natively by BullMQ).
- Persistent or logic failures cause the job to eventually fail and the case to escalate.
