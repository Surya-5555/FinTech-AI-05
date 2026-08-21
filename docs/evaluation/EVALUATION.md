# Evaluation Framework Guide

This document describes how to use the Evaluation Framework to measure the performance of the Revenue Recovery AI system.

## Running the Evaluation

You can execute the evaluation safely without making any live Razorpay or LLM calls:
```bash
make evaluate
```
This will run the `evaluator` CLI over the synthetic dataset.

## The Synthetic Dataset
Because we cannot expose real merchant configurations or customer PII, we evaluate the system against a synthetic dataset located in `data/evaluation/v1/`.

This dataset is generated using a completely deterministic PRNG (Linear Congruential Generator) seeded with `42`. This ensures that every developer sees the exact same edge cases, failure reasons, and expected outcomes without risking live data.

## Baselines
We compare the AI-powered System Under Test (SUT) against two baselines:
- **Baseline 0 (No Recovery)**: What happens if we do absolutely nothing. Measures the organic recovery rate.
- **Baseline 1 (Naive Retry)**: A simple rule-based approach that blindly retries the first allowed channel.

## Metrics
All monetary values are calculated using `BigInt` to prevent floating-point precision loss.
The integrity assertions will automatically fail the build if the system claims to recover more money than was originally at risk.

For an exhaustive list of metrics, see `METRICS.md`.
