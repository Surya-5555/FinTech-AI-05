# Deterministic Recovery Planning

This document outlines the architecture and design of the recovery planning system.

## Overview
The recovery planning phase is responsible for diagnosing a failed payment and proposing a recovery plan. This phase is entirely deterministic, meaning that given the same input, it will always produce the same plan.

## AI and Determinism
AI is intentionally absent from this phase to ensure strict financial safety, deterministic outcomes, and auditable reasons for any action. We must prove the system can handle state safely before introducing stochastic models.

## Plan Generation
1. **Diagnosis**: Event mappings determine the RootCause.
2. **Candidate Selection**: Merchant policy filters possible interventions.
3. **Recommendation**: The lowest-risk valid intervention is chosen.
4. **Policy Check**: The intervention is evaluated against safety limits (amounts, attempts, consent).
5. **Persistence**: The proposed plan is saved with optimistic concurrency.

A plan being "POLICY_APPROVED" merely means it passed safety checks. It does NOT automatically execute. Execution is a separate phase.
