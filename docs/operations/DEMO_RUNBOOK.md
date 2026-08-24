# Reviewer Demo Runbook

Welcome to the Razorpay AI Revenue Recovery demonstration. This guide will walk you through a fully reproducible local evaluation of the system.

## 1. Startup

Open your terminal and run:

```bash
cp infra/env/demo.env.example infra/env/demo.env
make demo-up
```

Wait for the containers to build and start. You can monitor the health status using:

```bash
make demo-status
```

## 2. Access the Operations Dashboard

Once all services are healthy, open your browser to:

[http://localhost:5173](http://localhost:5173)

You will see the Revenue Funnel, active cases, and system health metrics.

## 3. Run the Smoke Test (Simulate a Failure)

To simulate an incoming payment failure event and trigger the AI recovery pipeline, run:

```bash
make demo-smoke
```

Watch the terminal output. It will log the ingestion of the event, the creation of a case, and the generated recovery plan. Refresh the Operations Dashboard to see the new case and its audit trail.

## 4. Run the Evaluation Batch

To prove the system works at scale across a held-out dataset, run:

```bash
make demo-evaluate
```

This will spin up a one-shot container that executes the batch evaluation and renders the results directly to the console. You can view these results in the Operations Dashboard under the "Evaluations" tab.

## 5. Teardown

To stop the demo and clean up:

```bash
make demo-down
# Or, to completely wipe all data:
make demo-reset
```
