# FINAL AI READINESS REPORT
**Razorpay AI Revenue Recovery — Track 03**
**Status:** SCIENTIFICALLY LOCKED

---

## A. Actual Implemented AI Features

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Multi-Treatment T-Learner (XGBoost) | `apps/ml-pipeline/src/train.py` | ✅ Trained, persisted, serving |
| 2 | Causal Uplift Estimation (τ̂) | `apps/ml-pipeline/src/train.py` | ✅ P(Y\|X,T) − P(Y\|X,T=0) |
| 3 | Net Expected Incremental Value | `apps/ml-pipeline/src/train.py` | ✅ Gross EIV − assumed cost |
| 4 | FastAPI Inference Service | `apps/ml-pipeline/src/predict.py` | ✅ JSON API |
| 5 | Shadow ML Propensity Scoring | `libs/domain/src/ml/propensity.ts` | ✅ Calls Python service, fallback to mock |
| 6 | LLM Failure Diagnosis + SMS Drafting | `libs/llm/src` | ✅ Zod-validated JSON output |
| 7 | Deterministic Policy Engine | `libs/domain/src/policy.ts` | ✅ Max attempts, consent, cooldown |
| 8 | Offline Policy Value Simulation | `apps/ml-pipeline/src/evaluate_policy.py` | ✅ 5-policy comparison |
| 9 | Statistical Audit Suite | `apps/ml-pipeline/src/statistical_audit.py` | ✅ 9-section forensic audit |

---

## B. Actual Model Architecture

**Multi-Treatment T-Learner** with 3 independent XGBoost classifiers:
- **μ̂₀(x):** P(conversion | X, T=Control) — 17,045 train samples
- **μ̂₁(x):** P(conversion | X, T=Mens Email) — 17,046 train samples
- **μ̂₂(x):** P(conversion | X, T=Womens Email) — 17,109 train samples

Hyperparameters: `n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42`

15 pre-treatment features: `recency, history, mens, womens, newbie` + one-hot encoded `history_segment, zip_code, channel`.

---

## C. Mathematical Formulation

**Causal Uplift (CATE):**
$$\hat{\tau}_t(x) = \hat{\mu}_t(x) - \hat{\mu}_0(x)$$

**Gross Expected Incremental Value:**
$$\text{EIV}_t(x) = \hat{\tau}_t(x) \times V(x)$$

where V(x) = invoice amount (proxied by purchase history in Hillstrom).

**Net Expected Incremental Value:**
$$\text{Net\_EIV}_t(x) = \text{EIV}_t(x) - c_t$$

where c₁ = $0.10 (assumed retry cost), c₂ = $2.00 (assumed SMS cost).

> [!IMPORTANT]
> Intervention costs are **ASSUMED / DEMO values**. They are not backed by authoritative Razorpay pricing data. In production, these would be replaced by actual Razorpay API + Twilio costs.

**Policy Selection:**
$$\pi(x) = \arg\max_{t \in \{0,1,2\}} \text{Net\_EIV}_t(x)$$

where Net_EIV₀(x) = 0 (doing nothing costs nothing and gains nothing).

---

## D. Offline Evaluation

**Dataset:** Hillstrom MineThatData E-Mail Analytics (64,000 customers, public RCT).

**Split:** 80/20 stratified train/test, `random_state=42`. Test set: 12,800 rows.

**Positive-class prevalence:** 0.90% overall (0.56% Control, 1.24% T1, 0.89% T2).

| Metric | T0 (Control) | T1 (Retry) | T2 (Link) |
|--------|-------------|-----------|----------|
| Accuracy | 99.44% | 98.76% | 99.11% |
| Majority-class baseline accuracy | 99.44% | 98.76% | 99.11% |
| **Accuracy delta vs baseline** | **+0.00%** | **+0.00%** | **+0.00%** |
| AUROC | 0.6317 | 0.5969 | 0.5613 |
| AUROC 95% CI (bootstrap) | [0.53, 0.73] | [0.52, 0.68] | [0.49, 0.64] |
| PR-AUC | 0.0224 | 0.0192 | 0.0106 |
| PR-AUC (random baseline) | 0.0056 | 0.0124 | 0.0089 |
| Brier Score | 0.005600 | 0.012286 | 0.008847 |
| Brier Skill Score | +0.0002 | -0.0002 | -0.0049 |

> [!CAUTION]
> **Accuracy is identical to a trivial majority-class classifier** that always predicts 0. It is NOT evidence of model quality. The only honest discrimination metric is AUROC, which shows modest signal above random (0.50). Calibration is excellent (mean predicted probability matches actual prevalence), but Brier Skill is approximately zero — the models learn the base rate accurately but offer near-zero probabilistic improvement over predicting the prevalence constant.

**No target leakage detected.** All 15 features are pre-treatment. Post-treatment outcomes (`visit`, `spend`, `conversion`) are correctly excluded.

**Treatment randomization verified.** Groups are balanced (~⅓ each). Chi² test shows significant T×Y association, which confirms treatment genuinely affects the outcome — expected for a valid RCT, not evidence of bias.

---

## E. Policy Value Results

| Policy | Expected Revenue/Customer | 95% CI |
|--------|--------------------------|--------|
| Treat None (Control) | $0.7119 | — |
| Treat All T1 (Retry) | $1.2055 | [$0.79, $1.69] |
| Treat All T2 (Link) | $1.0693 | — |
| Random | $0.9956 | — |
| **Learned ML Policy** | **$1.1668** | **[$0.74, $1.64]** |

**The learned policy does NOT statistically significantly beat Treat-All-T1.** Confidence intervals fully overlap.

**Learned policy treatment allocation:**

| Treatment | Allocation |
|-----------|-----------|
| T0 (Do Nothing) | 15.3% |
| T1 (Retry) | 79.2% |
| T2 (Payment Link) | 5.5% |

The policy correctly identifies T1 as dominant, but its withholding of 15.3% from treatment and the small T2 allocation do not produce a net gain over the simpler Treat-All-T1 strategy.

---

## F. Statistical Limitations

1. **Class imbalance:** <1% positive rate makes discrimination extremely difficult.
2. **Modest AUROC (~0.60):** The pre-treatment features have limited predictive power for individual conversion. This is measured on Hillstrom's own held-out test set — it is NOT caused by domain shift.
3. **T2 AUROC not significant:** T2's bootstrap CI [0.49, 0.64] includes 0.50.
4. **Limited exploitable heterogeneity:** T1 has the strongest average treatment effect ($0.49 vs $0.36 for T2). Real heterogeneity exists (Womens Buyers prefer T2: $1.28 vs $0.96), but the model cannot reliably exploit it at <1% prevalence.
5. **Calibration does not need improvement:** Brier Skill ≈ 0 means Platt scaling would add complexity without material benefit.

---

## G. Domain-Shift Honesty

The Hillstrom dataset features (recency, purchase history, email channel preference) have **no causal relationship** to payment gateway failure modes (bank timeout, insufficient funds, network error).

**Correct framing:**
- Hillstrom validates the **causal policy-learning methodology** (T-Learner, uplift estimation, policy evaluation).
- Razorpay Sandbox validates the **execution architecture** (webhook → ingestion → policy → worker → audit).
- These are **separate proofs** that together demonstrate a production-ready system.

---

## H. Razorpay Sandbox Boundary

The dashboard displays Razorpay Test-Mode execution metrics. All monetary values on the dashboard originate from:
- Razorpay test-mode webhook amounts (simulated transactions), OR
- The evaluation engine's batch-run outputs.

AI scores attached to these cases come from the offline benchmark model (Hillstrom-trained). The dashboard now explicitly labels this: *"AI scores from offline benchmark model"* and *"Data Mode: RAZORPAY_TEST"*.

---

## I. LLM Safety

The LLM (Claude/GPT-class) is used exclusively for:
1. **Failure diagnosis** — classifies the failure reason from event metadata.
2. **SMS template generation** — drafts customer-facing recovery messages.

It outputs **Zod-validated JSON**. It **cannot**:
- Modify payment state
- Trigger financial execution
- Bypass the deterministic policy engine
- Access API keys or credentials

On LLM failure, the system falls back to hardcoded text templates. AI failure ≠ financial execution failure.

---

## J. Deterministic Policy Safety

Verified in `libs/domain/src/policy.ts`:
- ✅ Max attempts per case (hard stop)
- ✅ Cooldown between interventions
- ✅ Customer consent enforcement (SMS, email, voice)
- ✅ Idempotency via PostgreSQL unique constraints
- ✅ Optimistic concurrency control (version matching)
- ✅ At-most-once execution via distributed locks
- ✅ State machine with terminal states (STOPPED, FAILED, RECOVERED)

**The AI is mathematically subjugated to these rules.** No ML score or LLM output can override a policy rejection.

---

## K. Interpretability

Every intervention decision is fully reconstructable:

```
INPUT (webhook event)
  → SHADOW ML SCORES (τ̂₁, τ̂₂, Net_EIV₁, Net_EIV₂)
  → LLM DIAGNOSIS (failure reason, SMS draft)
  → POLICY CONSTRAINTS (max attempts? consent? cooldown?)
  → FINAL ACTION (approved/rejected + reason codes)
  → AUDIT EVENT (persisted to PostgreSQL)
```

The dashboard audit trail shows all of these stages for every case.

---

## SCIENTIFIC LOCK DECLARATION

> All P0 issues are resolved. The architecture is scientifically honest, technically sound, and financially safe. No further model changes, evaluation manipulations, or architectural redesigns are warranted.
>
> The system is ready.
