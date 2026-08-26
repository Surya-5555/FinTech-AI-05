# ADR-017: React + Vite for Operations Dashboard

**Status:** Accepted
**Date:** 2026-08-22
**Context:** Phase 5.1 (UI Implementation)

## Context and Problem Statement
Track 03 (AI Revenue Recovery) requires an internal operations console to view recovery metrics, track the AI decision funnel, manually audit recovery cases, and inspect failure simulations. The system needs a frontend that is fast to build, type-safe, and closely aligned with our existing monorepo tooling, while explicitly avoiding complex meta-frameworks that would violate the "No Next.js" rule.

## Decision
We will build the operations dashboard as a Single Page Application (SPA) using:
- **React 18** for component-based UI.
- **Vite** for fast, modern build tooling.
- **TypeScript** for end-to-end type safety, integrated with the backend via shared types (if needed) or typed fetch clients.
- **Tailwind CSS (v3/v4 via Vite plugin)** for rapid, utility-first styling without external UI component library overhead.
- **TanStack React Query** for data fetching, caching, and state management.
- **React Router** for client-side routing.

## Rationale
1. **Compliance with Constraints:** The project strictly prohibits Next.js and Go/Rust. An SPA using React + Vite perfectly fits the "React + Vite + TypeScript + Tailwind CSS" stack requirement.
2. **Speed & Simplicity:** Vite offers sub-second HMR and a straightforward configuration compared to Webpack or full-stack frameworks. 
3. **Internal Tooling Nature:** SEO is irrelevant for an internal operations dashboard, eliminating the need for Server-Side Rendering (SSR) or Static Site Generation (SSG). Client-side rendering is completely sufficient and simplifies the deployment architecture (static files served by NGINX or similar).
4. **Data Fetching:** React Query simplifies async state management (loading, error, caching) and works seamlessly with standard `fetch` wrappers connecting to our NestJS `api/v1` backend.

## Consequences
- **Positive:** Very fast development cycle, minimal configuration, strong type safety, simple static deployment model.
- **Negative:** Initial page load might be slightly slower than SSR (negligible for an internal tool), requires maintaining a separate API client layer to consume the NestJS backend.
- **Mitigation:** Built a lightweight `ApiClient` utilizing standard `fetch` with strict generic return types to ensure UI models match backend payloads without heavy OpenAPI/Swagger code generation overhead.
