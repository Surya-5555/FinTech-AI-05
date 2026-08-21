# ADR-014: Bounded LLM Decision-Support

## Status
Accepted

## Context
We need to leverage LLMs to generate high-quality payment recovery messages and explain recovery decisions, without compromising the deterministic financial safety of the core platform.

## Decision
We will use a strictly bounded AI integration model:
1. **No direct financial authority:** LLMs cannot initiate, approve, or execute payments.
2. **No tool-calling:** The model operates strictly in a generation-only capability.
3. **Deterministic fallbacks:** If the LLM is unavailable, unsafe, or produces invalid output, the system seamlessly falls back to pre-approved deterministic templates.
4. **Structured output:** All LLM outputs must match predefined Zod schemas.
5. **No raw PII:** LLM context must be synthesized and masked.

## Consequences
- High safety guarantees for financial interactions.
- Allows AI to add value in communication while keeping the core reliable.
- Requires maintaining fallback templates.
