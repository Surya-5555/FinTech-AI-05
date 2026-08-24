# State Machine Architecture

## Overview
The `RevenueCase` aggregate operates as a strictly controlled State Machine. In an asynchronous, distributed environment, ensuring that a case transitions through its lifecycle logically and linearly is critical to preventing duplicate interventions or dropped recoveries.

## The State Lifecycle

The system enforces a rigid Directed Acyclic Graph (DAG) of states:

1. **`OPEN`**: The initial state when a failure webhook is received. The case is awaiting AI evaluation.
2. **`PLANNED`**: The AI has proposed a `RecoveryPlan` and the Deterministic Policy Engine has approved it. The intervention is enqueued.
3. **`EXECUTING`**: A worker is currently communicating with an external provider (Twilio, Resend, Razorpay).
4. **`RECOVERED`**: A webhook was received indicating the customer successfully paid the outstanding balance. This is a terminal state.
5. **`FAILED`**: The case has exhausted all permitted retry attempts, or the subscription was explicitly cancelled by the merchant. This is a terminal state.

## Enforcing Transitions

State transitions are not simple CRUD `UPDATE` operations. They are executed via domain methods (e.g., `revenueCase.markAsPlanned()`) which internally validate the transition matrix. 

If a worker attempts to transition a case from `RECOVERED` back to `EXECUTING` (perhaps due to a delayed duplicate webhook arriving late), the domain model throws an `InvalidStateTransitionError`.

## Concurrency and Locking
Because multiple workers might attempt to transition a state simultaneously (e.g., the planning worker finishes just as a webhook arrives saying the user paid independently):
- **Optimistic Concurrency Control (OCC):** Every state transition increments a `version` integer in the database. The `UPDATE` statement explicitly requires the previous version number.
- **Distributed Locks:** For complex, multi-step execution flows, workers acquire a short-lived Redis lock using the Case ID to ensure absolute mutual exclusion during the transition.
