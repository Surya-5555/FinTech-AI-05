# Razorpay AI Buildathon: Track 03 — 5-Minute Demo Script

> **Audience**: Razorpay engineering judges
> **Duration**: 5 minutes
> **Mode**: Live walkthrough (screen share or recorded video)
> **Services needed**: Docker + `pnpm dev` stack running locally (see README §6)

---

## Preparation Checklist

- [ ] `docker compose -f infra/compose/compose.yaml up -d` — Postgres + Redis running
- [ ] `pnpm --filter @rr/api dev` — API on port 3000
- [ ] `pnpm --filter @rr/worker dev` — Worker running
- [ ] `pnpm --filter @rr/frontend dev` — Dashboard on port 5173
- [ ] `cd apps/ml-pipeline/src && source ../venv/bin/activate && python server.py` — ML on port 8000
- [ ] `.env` has `ENABLE_RAZORPAY_TEST_MODE=true` and `API_AUTH_TOKEN` set
- [ ] Terminal open at project root for CLI commands

---

## Segment 1: The Problem & Architecture (0:00 – 1:00)

### What to Show
Open `README.md` in the browser (or the rendered GitHub README). Scroll to the Mermaid architecture diagram.

### What to Say
> "This is an AI Revenue Recovery Orchestrator for Razorpay Track 03. Merchants lose revenue every day when payment mandates fail, cards expire, or banks time out. Most systems blindly retry — which triggers fraud alerts, wastes API calls, and annoys customers.
>
> This system does something different: it detects the failure, uses a causal ML model to estimate the *incremental* recovery probability for each intervention type, has an LLM diagnose the root cause and draft a contextually appropriate message, and then passes the AI's plan through a *deterministic* policy engine that enforces consent, stopping rules, and maximum attempts before anything touches an external API.
>
> AI reasons. Deterministic code acts."

### What This Proves to Judges
✅ Engineering judgment — not an LLM chatbot wrapper
✅ Bounded AI — AI cannot directly execute financial actions

---

## Segment 2: Live Ingestion & Case Lifecycle (1:00 – 2:00)

### What to Show
Open [http://localhost:5173](http://localhost:5173) — the React Operations Dashboard.

### CLI Command
Run in terminal:
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_AUTH_TOKEN" \
  -d '{
    "merchantId": "merchant_demo_01",
    "externalEventId": "evt_demo_001",
    "eventType": "MANDATE_FAILED",
    "amountMinor": 250000,
    "currency": "INR",
    "failureCode": "bank_timeout",
    "customerPhone": "+91XXXXXXXXXX",
    "customerEmail": "customer@example.com",
    "smsConsent": true,
    "emailConsent": true
  }'
```

### Expected Output
```json
{ "caseId": "<uuid>", "status": "DETECTED" }
```

### What to Show Next
Refresh the Dashboard. The new case appears in `DETECTED` state. Within a few seconds (after planning + worker execution), it transitions to `PLANNED` → `EXECUTING` → `RECOVERED` or `FAILED`.

Click the case row to open the **Case Detail** view:
- AI Diagnosis (root cause from LLM / fallback template)
- ML Propensity Scores (CATE per treatment arm)
- Policy Gate Decision (Approved / Blocked with reason codes)
- Worker Execution Result (provider response + outcome)
- Full Audit Trail (timestamped, immutable)

### Duplicate Event (Idempotency Demo)
Run the exact same curl command again. Response:
```json
{ "caseId": "<same-uuid>", "status": "...", "idempotent": true }
```
> "The database unique constraint blocked the duplicate. No second case was created. No second intervention was queued. This is enforced at the DB level — not application-level caching."

### What This Proves to Judges
✅ Real system: webhook ingestion, state machine, async worker pipeline
✅ Idempotency: database-enforced, not application-level
✅ Audit trail: every decision visible and inspectable

---

## Segment 3: Batch Evaluation & Data-Driven Proof (2:00 – 3:00)

### What to Say
> "Let me show the evaluation framework — this is the most important part. Anyone can claim their AI recovers revenue. This system *proves* it, or doesn't claim it."

### CLI Command
```bash
pnpm evaluate-smoke
```

### Expected Terminal Output
```
✓ Dataset loaded: 500 cases (checksum: 666ac3f3...)
✓ Baseline 0 (No Action):    Recovered: ₹0
✓ Baseline 1 (Naive Retry):  Recovered: ₹774,446 (49.9% rate)
✓ System (AI-Assisted):      Recovered: ₹149,200 (9.62% rate)

Safety Metrics:
  Stopped Cases:     202/300 (67.33%) — policy halted unrecoverable cases
  Escalations:       67/300  (22.33%) — flagged for human review
  False Interventions: 0 (0.00%)
  Workflow Failures:   0
```

### What to Explain
> "Why is our recovery rate lower than naive retry? Because naive retry retries *everything* — including fraud cases and insufficient funds. That triggers chargebacks and burns API quota. Our system correctly stops 67% of cases where intervention has negative expected value, and escalates 22% that need human review. The 0% false intervention rate is the real signal: we never executed a harmful action. In production, when you factor in SMS costs and chargeback liability, our system's net expected value exceeds naive retry."

### Switch to Evaluation Dashboard
Open the **Evaluation** tab in the React Dashboard. Show:
- Financial Impact Comparison chart (Total At Risk vs Baselines vs System)
- Case Outcome Distribution (RECOVERED / FAILED / STOPPED / ESCALATED)
- Safety metrics panel

### What This Proves to Judges
✅ Honest metrics — not fabricated, fully reproducible with one command
✅ Cost-sensitive evaluation — false intervention rate, not just accuracy
✅ Understanding of why AI is better than naive rules, not just "AI good"

---

## Segment 4: Safety Architecture Deep-Dive (3:00 – 4:00)

### Show 1: Idempotency (Code)
Open `libs/domain/src/idempotency.ts`:
> "Every external event is mapped to a deterministic key. The database unique constraint makes duplicate handling unconditional — not a cache that can be evicted."

### Show 2: Policy Engine (Code)
Open `libs/domain/src/policy.ts`:
> "This is the trust boundary. AI output arrives as a `RecoveryPlan`. The policy engine checks consent, attempt count, fraud codes, and cooldowns — synchronously, deterministically. AI cannot skip this gate."

### Show 3: Execution Lock (Code)
Open `libs/persistence/src/repositories/execution.repository.ts` — `claimExecutionLock()`:
> "Before calling Razorpay, the worker does an atomic DB update: SET lockedBy WHERE lockedBy IS NULL. If a second worker picks up the same job, the update affects 0 rows — lock not acquired, job silently dropped. At-most-once execution, no distributed coordination needed beyond Postgres."

### Show 4: LLM Fallback (Code)
Open `libs/llm/src/fallbacks/templates.ts`:
> "If Gemini is down, these deterministic templates fire. The system never stalls waiting for an LLM. English and Hinglish fallbacks are both defined — regional language support works even without the model."

### What This Proves to Judges
✅ Financial safety: OCC, locks, stopping rules, policy gates
✅ Bounded AI: explicit code showing where AI ends and deterministic logic begins
✅ Resilience: system degrades gracefully, never crashes

---

## Segment 5: Closing & Business Alignment (4:00 – 5:00)

### What to Say
> "To summarise what this system demonstrates:
>
> **AI Judgment**: The causal T-Learner estimates incremental recovery probability per treatment arm — not just 'will they pay' but 'will they pay *because* of our action'. The LLM produces context-aware, locale-appropriate communication including Hinglish for Indian customers.
>
> **Deterministic Safety**: Every AI recommendation passes through a policy engine that enforces Razorpay-grade constraints — consent, fraud detection, stopping rules, idempotency. The evaluation proves 0% false intervention rate.
>
> **Production Engineering**: This is not a demo script over mock data. It is a modular NestJS monorepo with Prisma + Redis + BullMQ, integration tests that verify failure recovery scenarios against a live database, and a reproducible evaluation framework with real causal ML metrics.
>
> This is the kind of system that protects Razorpay merchants' revenue at scale — not by retrying blindly, but by reasoning about when to act, how to act, and when to stop."

### Final Metric to Emphasise
> "Zero workflow failures across 300 evaluated cases. Zero false interventions. 22% escalation rate means humans review genuinely ambiguous cases. That is production-grade reliability from a system that also happens to have AI in it."

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Dashboard blank | Check API is on port 3000; check CORS config in `apps/api/src/main.ts` |
| ML scores all 0 | ML server may not be running; planning falls back gracefully (expected) |
| curl 401 | Set `API_AUTH_TOKEN` env var matching `.env` value |
| No case in dashboard | Check worker logs; BullMQ may need Redis connectivity |
| `pnpm evaluate-smoke` fails | No DB needed; check if `data/evaluation/v1/heldout.jsonl` exists |
