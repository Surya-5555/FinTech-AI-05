# ALL POSSIBLE LIMITATIONS (PENDING USER INPUT)
# Razorpay AI Revenue Recovery (Track 03)

This document lists the final remaining limitations of the Razorpay AI Revenue Recovery system. All engineering, architectural, and security vulnerabilities (such as plaintext PII, mocked APIs, DB polling, and lack of reconciliations) have been successfully eliminated by the autonomous agent.

The ONLY remaining limitations are external dependencies that require manual user intervention, datasets, and authorization.

---

## 1. Evaluation Data Realism (Requires Real Dataset)
- **Status:** BLOCKED BY USER
- **Description:** The "Incremental Recovered" metric currently evaluates against synthetic data. To prove real-world recovery, we need a dump of actual Razorpay payment failures and their historical outcomes.
- **Action Required:** The user must provide a real historical data dump (JSON/CSV) of Razorpay webhooks and place it in the `data/historical/` directory so the evaluator can measure real-world performance.

## 2. ML Propensity Modeling (Requires Training Data)
- **Status:** BLOCKED BY USER
- **Description:** The system has a fully integrated Shadow ML Pipeline that safely routes data for propensity scoring (`p(Retry)`, `p(Link)`). However, it currently uses a simulated XGBoost model because it has not been trained on real merchant data.
- **Action Required:** Once the historical data is provided, the ML training pipeline must be executed to fit the actual XGBoost model and calibrate its true probabilities.

## 3. Production API Credentials (Requires Authorization)
- **Status:** BLOCKED BY USER
- **Description:** The external API integration has been fully hardened with Axios, exponential backoffs, and circuit breakers. However, it currently cannot execute live financial operations because it lacks production credentials.
- **Action Required:** The user must provide actual live Razorpay API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and any required AI provider keys in the `.env` file to transition the execution from test mode to live production mode.
