# RAZORPAY TEST MODE GUIDE
# Razorpay AI Buildathon (Track 03)

This document provides exact instructions for configuring the system safely using Razorpay Test Mode, adhering to official Razorpay documentation. **Live credentials and real customer data must NEVER be used.**

## 1. Safety and Data Boundaries
- **No Live Money:** The system must run strictly in Test Mode to prevent accidental real-world charges.
- **Opt-in Adapters:** The Razorpay adapter requires explicit opt-in via `.env`.
- **Default Simulator:** For CI and evaluation, the system defaults to deterministic simulated adapters.

## 2. Environment Variables Configuration
To enable the Razorpay Test Mode integration, configure the following variables in your local `.env` file (never commit this file to version control):

```env
ENABLE_RAZORPAY_TEST_MODE=true
RAZORPAY_MODE=test

# Replace placeholders with your Test Mode keys from the dashboard
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
```

## 3. Obtaining Test Mode Keys
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Ensure the environment toggle in the top-left corner is set to **Test Mode**.
3. Navigate to **Settings -> API Keys**.
4. Generate a new test key. The Key ID will always begin with `rzp_test_`.

## 4. Webhook Setup and Signature Validation
The system strictly enforces Razorpay's HMAC-SHA256 signature verification for webhook ingestion.

1. Navigate to **Settings -> Webhooks** in the Razorpay Test Mode dashboard.
2. Add a new webhook pointing to your application's public URL (e.g., via ngrok): `https://your-ngrok-url/events/ingest`.
3. Set the **Secret** to a strong string and add it to your `.env` as `RAZORPAY_WEBHOOK_SECRET`.
4. Select the relevant event (e.g., `payment.failed`).
5. **Security enforcement:** The NestJS `RazorpayWebhookGuard` uses `rawBody` to compute `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` and securely compares it against `X-Razorpay-Signature`.

## 5. Safe Actions for Manual Demo
The `RazorpayAdapter` currently restricts execution exclusively to safe workflows. 
It supports **CREATE_PAYMENT_LINK**, which securely generates a recovery payment link without initiating blind capture attempts.

## 6. Test-Mode Limitations
- Test mode webhooks may exhibit latency.
- Provider errors (like 429 Rate Limits) are harder to simulate predictably compared to local mocked endpoints. 
- You cannot simulate live bank decline codes (e.g., insufficient funds vs expired card) accurately without using specific Razorpay test cards.
