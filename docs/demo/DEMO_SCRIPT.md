# Razorpay AI Buildathon: Track 03 Demo Script

## Preparation
- Ensure `pnpm run dev` is running (API, Worker, Frontend).
- Ensure Docker Compose is running (Postgres, Redis).
- Keep terminal open to run commands.

## Segment 1: The Architecture and Goal (0:00 - 1:00)
1. **Show Architecture Diagram**: Briefly show the `README.md` architecture.
2. **Explain the Loop**: State the goal is to detect failures, diagnose root causes with AI, plan bounds, check policies, and execute deterministically.
3. **Show Limitations**: Highlight that the demo uses synthetic data and simulated external adapters to ensure deterministic evaluation without exposing real merchant keys.

## Segment 2: Operations Dashboard & UI (1:00 - 2:00)
1. **Open `http://localhost:5173`**: Show the Cases list.
2. **Explain the Workflow**: Show a case moving from `DETECTED` to `PLANNED` to `RECOVERED`.
3. **Audit Trail**: Click a case detail to show the AI diagnosis, policy approval, and executed intervention.

## Segment 3: Batch Evaluation & Data-Driven Proof (2:00 - 3:00)
1. **Switch to CLI**: Run `pnpm evaluate-smoke`.
2. **Explain the Run**: Show how it evaluates the AI System vs Baseline 0 (No recovery) and Baseline 1 (Naive retry).
3. **Switch to Evaluation Dashboard**: Open the Evaluation tab in the UI.
4. **Show Charts**: Point out the "Financial Impact Comparison" (Total At Risk vs Baseline vs System) and the "Case Outcome Distribution" chart.
5. **Final Metric**: Emphasize the incremental recovery, the stopped cases (safety bounds), and precision.

## Segment 4: Code Highlights & Safety (3:00 - 4:00)
1. **Show `idempotency.ts`**: Explain how duplicate external events are blocked.
2. **Show `policy.ts`**: Explain the deterministic gates for AI plans.
3. **Wrap up**: Reiterate that AI is bounded, and financial actions are strictly deterministic.
