# UI Information Architecture

This document describes the structure and routing of the React Operations Dashboard (`apps/frontend`).

## Navigation & Routing Shell
The application uses a standard sidebar navigation shell defined in `src/components/Layout.tsx`. 

### Main Navigation Routes
- `/` - **Dashboard (Summary)**
- `/cases` - **Case Management**
- `/cases/:id` - **Case Detail & Audit Log**
- `/evaluations` - **Evaluation Runs**
- `/failures` - **System Failures Log**
- `/system` - **Resilience & Health Status**

## View Models & Components

### 1. Dashboard (`/`)
**File:** `src/features/dashboard/DashboardPage.tsx`
- **Data Source:** `GET /api/v1/dashboard/summary`
- **Key Visuals:** 
  - Revenue Funnel (Total At Risk -> In Progress -> Recovered).
  - High-level metric cards (Total Cases, Active Interventions, Completion Rate).

### 2. Cases View (`/cases`)
**File:** `src/features/cases/CasesPage.tsx`
- **Data Source:** `GET /api/v1/cases`
- **Key Visuals:** 
  - Data table listing all recent cases.
  - Quick filters for State (OPEN, RECOVERED, ESCALATED, FAILED).
  - Color-coded badges for Case Status.

### 3. Case Detail (`/cases/:id`)
**File:** `src/features/cases/CaseDetailPage.tsx`
- **Data Source:** `GET /api/v1/cases/:id`
- **Key Visuals:** 
  - Header: Core Case Metadata (Customer Info, Amount, Current State).
  - Left Column: Active Intervention Details (if any).
  - Right Column (Scrollable): Immutable Audit Log of all State Changes and AI Decisions.

### 4. Evaluations (`/evaluations`)
**File:** `src/features/evaluation/EvaluationRunsPage.tsx`
- **Data Source:** `GET /api/v1/evaluation/runs`
- **Key Visuals:**
  - Historical list of batch evaluations.
  - Drill-down into specific run metrics (Accuracy, ROI, False Positive Rate).

### 5. Failures (`/failures`)
**File:** `src/features/failures/FailuresPage.tsx`
- **Data Source:** `GET /api/v1/failures`
- **Key Visuals:**
  - Listing of all dead-letter cases or critical system exceptions.
  - Manual retry/escalate actions (future scope).

### 6. System Status (`/system`)
**File:** `src/features/system/SystemPage.tsx`
- **Data Source:** `GET /api/v1/system/resilience/status`
- **Key Visuals:**
  - Circuit Breaker statuses (Razorpay API, LLM Gateway, DB).
  - Queue Depths (Pending Interventions, Failed Webhooks).
  - Memory/CPU basic metrics.
