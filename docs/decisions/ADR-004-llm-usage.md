# ADR-004: Bounded AI and Deterministic Policy Enforcement

**Status:** Accepted
**Date:** 2026-08-03
**Context:** AI Integration Strategy

## Context and Problem Statement
The goal of this track is "AI Revenue Recovery." However, granting autonomous AI systems direct control over financial transactions or customer communications poses unacceptable risks (hallucinations, infinite retry loops, spam, unbounded cost). The system must utilize AI for intelligence while deterministically enforcing financial safety.

## Decision
We will enforce a strict architectural boundary where **AI Proposes, but Deterministic Policy Disposes**. AI models (Causal ML and LLMs) are restricted solely to the `RecoveryPlan` generation phase. All plans must pass through a rule-based, deterministic TypeScript policy engine before execution.

## Rationale
1. **Financial Safety:** The policy engine (`libs/domain/src/policy.ts`) enforces hard rules that the AI cannot override. This includes:
   - Maximum intervention attempts per case (e.g., 3).
   - Mandatory cooldown periods between contacts.
   - Explicit verification of customer consent channels (SMS/Email).
2. **Causal ML for Advisory Targeting:** We utilize XGBoost/T-Learners offline to calculate a Net Expected Intervention Value (Net EIV). This score dictates *which* channel to use, but the policy engine dictates *whether* it is legally and financially permissible to use it.
3. **LLMs for Templating:** LLMs are used to analyze raw failure reasons (e.g., "insufficient_funds") and generate contextually appropriate SMS templates, but they cannot trigger the SMS themselves.
4. **Graceful Degradation:** By isolating the AI, if the LLM provider experiences an outage, the deterministic policy engine seamlessly falls back to a standard, rule-based retry strategy.

## Consequences
- AI decisions must be serialized into a strict JSON format (`RecoveryPlan`) capable of being evaluated by the policy engine.
- Prevents the use of "Agentic Loops" where the AI is given free rein to retry indefinitely. The system relies on a Directed Acyclic Graph (DAG) state machine instead.
