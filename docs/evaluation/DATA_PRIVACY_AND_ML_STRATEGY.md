# Data Privacy & Causal ML Strategy

As software and machine learning engineers building financial recovery infrastructure, we prioritized strict data privacy and architectural rigor for the Machine Learning component of Track 03.

**To train a Causal ML model (T-Learner) for intervention routing, you need a dataset representing a Randomized Controlled Trial (RCT) of payment interventions (Retry vs. Link vs. Control).**

Razorpay’s actual operational dataset for payment recovery is strictly private. Creating a fake dataset from scratch to train a causal model is methodologically weak, as the causal relationships (the "math") are entirely fabricated, meaning the architecture's ability to detect actual causal uplift remains unproven. 

To solve this, we architected a **Dual-Track ML Strategy** that proves both mathematical rigor and operational readiness without compromising data privacy.

## The Dual-Track ML Strategy

### Track 1: Methodology Proof (The Hillstrom Benchmark)
We built our XGBoost T-Learner and Causal Uplift architecture and evaluated it against the public **Hillstrom MineThatData** dataset. 
- **What this proves:** This proves that our causal inference math works. It demonstrates that the architecture correctly identifies the dominant treatment, prices interventions via Net Expected Incremental Value (Net EIV), and evaluates policies on *real human randomized controlled trial data*. 
- **Location:** This proof is maintained purely as an offline benchmark (`apps/ml-pipeline/src/statistical_audit.py`). 

### Track 2: Operational Demo (Synthetic Razorpay Webhooks)
For the live FastApi inference server that the NestJS backend calls, we simulate a production deployment. 
- **What we did:** We wrote a statistical generator (`apps/ml-pipeline/src/generate_synthetic_data.py`) that outputs a purely synthetic dataset. This dataset exactly mirrors Razorpay’s webhook schemas and domain features (`isCardError`, `amountMinor`, `customerLocation`, etc.) and simulates realistic causal distributions (e.g., retries work better for timeouts).
- **What this proves:** This proves that our operational API and backend integration are perfectly typed and structurally sound for the Razorpay context. We trained our live model on this synthetic data (`apps/ml-pipeline/src/train.py`), meaning the system operates on genuine payment fields without exposing any real PII.

## Architectural Advantages
1. **Absolute Data Privacy:** We ensure zero PII risk. No real Razorpay data is exposed or needed for evaluation.
2. **Methodologically Sound:** We proved the math works on real humans (Track 1) and proved the code works on real Razorpay schemas (Track 2).
3. **Production Ready:** When deployed to production, the training pipeline is simply pointed to internal SQL exports instead of the synthetic CSV. The entire architecture—the preprocessing, the T-Learner, the FastAPI server, the NestJS ingestion, and the deterministic safety policies—remains exactly the same. 

This approach reflects mature engineering practices, cleanly separating methodology validation from operational testing.
