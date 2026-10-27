# Phase 1 Development Report

**Project:** ScholarBridge  
**Report date:** 27 October 2026  
**Scope:** Current workspace snapshot

## Executive summary

ScholarBridge has moved beyond planning: a Java Spring Boot backend, a Python/FastAPI paper-categorization service, and a Next.js frontend are present. The main student and faculty workflows are represented in code, and the services have local-development configuration. The repository also contains automated test code and a saved ML evaluation.

This report describes what is evidenced in the workspace; it does not claim that every workflow has been manually verified or deployed. The most important next steps are to improve the ML model's evaluation and dataset, run and strengthen cross-service tests, reconcile the planning documents with the implementation, and decide and complete a production deployment setup.

## Work completed or present in the workspace

### 1. Architecture and planning

- Documented the three-service design and responsibilities: React/Next.js frontend, Java application backend, and Python ML service.
- Added backend, frontend, and ML-service plans covering intended features, APIs, and staged implementation.
- Documented local service addresses and a VS Code task for starting the services together in the root README and architecture document.

### 2. Java backend

- Implemented a Spring Boot REST backend with entities and service/controller code for users and profiles, research openings, applications, papers, conferences, and conference submissions.
- Added signup/login and JWT-based authentication, security configuration, and role-aware business operations.
- Added paper upload and file handling, plus a configured client for the categorization service.
- Added request/response DTO mapping, validation dependencies, business and not-found exceptions, and a global exception handler.
- Configured local development with in-memory H2 and included a production profile with PostgreSQL configuration.
- Added demo-data initialization and a backend platform-flow integration test.

### 3. Python ML service

- Implemented a FastAPI service with health, text categorization, and PDF categorization endpoints.
- Added PDF text extraction and shared text preprocessing, model training code, a training dataset, and a persisted classifier artifact.
- Saved an evaluation report. It records **40 dataset rows**, an **80/20 split (32 train, 8 test)**, and **37.5% test accuracy**. With only eight test samples, this is a preliminary result and should not be treated as a reliable estimate of production performance.
- Added tests for training and preprocessing.

### 4. Frontend

- Implemented a Next.js application with public login/signup, guidance, and showcase pages.
- Added student pages for dashboards, openings, applications, papers, and conference submissions.
- Added faculty pages for dashboards, posting openings, applicant review, and submission review.
- Added shared API clients, authentication context, route protection, and reusable UI components for openings, papers, categories, and application statuses.

## Remaining work and recommended order

### Priority 1 — Prove the current baseline

- Run the Python tests, backend Maven tests, and frontend production build; record results and address failures.
- Exercise the key end-to-end flows with all services running: authentication, opening/application review, PDF upload/categorization, conference submission/review, and public showcase.
- Check API contracts, authorization boundaries, error responses, CORS, and frontend behavior against the running services. Existing test files are evidence of test coverage being started, not proof that the full system currently passes.

### Priority 2 — Improve and validate paper categorization

- Expand and verify the labeled dataset; document its provenance, category balance, and any licensing or usage constraints.
- Use a larger, representative held-out test set and report per-class precision, recall, F1, and confusion matrix. Compare a baseline model and record reproducible training settings.
- Review the current low accuracy before presenting categorization as dependable; investigate category overlap, sparse data, and model choices.

### Priority 3 — Finish integration and user-facing behavior

- Verify loading, empty, and error states across pages and confirm frontend route protection complements (but does not replace) backend authorization.
- Confirm each frontend action maps to the implemented backend endpoint and that backend-to-ML failures produce a clear recoverable paper status.
- Perform a responsive and accessibility pass on the implemented screens.

### Priority 4 — Production readiness and release

- Decide and document the intended production hosting for the backend and ML service, and configure the frontend's API URL and backend CORS allowlist for the deployed domains.
- Validate the production PostgreSQL profile, schema management, secrets/environment configuration, persistent file storage, upload limits, logging, health checks, and backup/recovery expectations.
- Run a release smoke test against the deployed environment and document the deployment and rollback procedure.

### Priority 5 — Reconcile project documentation

- The README links to `BACKEND_PLAN.md`, but the file currently in the workspace is named `BACKEND_PLANNN.md`; correct the link or rename the plan consistently.
- The frontend plan describes a Vite/React setup, while the implementation is Next.js. Update the plan to match the chosen stack and current routes.
- Align the architecture's paper-categorization contract with the implemented text and PDF endpoints and the actual Java-to-Python request format.
- Mark completed, deferred, and intentionally changed plan items so future development has a reliable source of truth.

## Phase 1 status

**Status: Core implementation present; verification and readiness work remain.**

The repository shows a substantial functional foundation, but the saved ML score, test coverage evidence, and lack of deployment evidence mean the project should not yet be described as fully validated or production-ready. Treat Phase 1 as complete only after the baseline checks and end-to-end workflows above have been run and their outcomes recorded.

