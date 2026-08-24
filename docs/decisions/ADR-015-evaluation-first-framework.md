# ADR 015: Evaluation-First Framework

## Context
The Razorpay AI Buildathon requires an honest, reproducible report showing incremental revenue recovery, intervention precision, safety blocks, and AI behavior. We must ensure that the AI decision-support layer is strictly evaluated in isolation on a deterministic dataset without risking live external API calls, and without fabricating numbers.

## Decision
We have built a completely isolated evaluation framework (`@rr/evaluator`) that runs locally using seeded, deterministic synthetic data generated via an LCG (Linear Congruential Generator). 

1. **Benchmark Data**: We generate cases dynamically using a seeded random number generator so all developers get the exact same dataset without sharing PII. 
2. **Baselines**:
   - `Baseline0`: No Recovery (baseline simulation).
   - `Baseline1`: Naive Retry (attempts recovery blindly without policy constraints).
   - `SystemUnderTest (SUT)`: The actual deterministic planning engine + AI fallback.
3. **Hidden Ground Truth**: Each test case contains a `groundTruth` object representing real-world behavior (e.g. if the user will pay the link, or if it will permanently fail). The SUT cannot see this label during planning, but the Runner uses it to simulate outcomes.
4. **Metrics**: BigInt math ensures accurate calculations of `systemRecoveredMinor` against `totalAtRiskMinor`, guaranteeing no false inflation of recovery rates.

## Consequences
- Evaluation runs are 100% reproducible and deterministic.
- External dependencies (LLMs, Razorpay) are faked/disabled during `make evaluate`.
- We can statistically prove the incremental value of the SUT over Baseline 1 without touching real money.
