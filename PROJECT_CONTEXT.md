# ScholarBridge: agent context (read this first; do not re-explore the repo)

Stack: Spring Boot 3 + Maven in `backend/` (package com.scholarbridge: controller,
service, repository, entity, dto, security, exception). Frontend: Next.js App
Router + TypeScript + pnpm in `deploy-scholar-bridge-frontend-to-vercel/`.
Roles: STUDENT, FACULTY (JWT). Existing features: openings, applications, papers,
conferences, blog.

Ignore: Scholar-Bridge/ (duplicate), node_modules, target, .next, ml-service*,
scholarbridge_ml.

Conventions: match existing code style. DTOs only (never return entities).
Ownership and role checks in the service layer. Never change existing endpoints
or behavior.

Token-saving rules:
- Open only the files you need. Search instead of reading whole folders.
- Do not paste code into chat. Write it to files.
- Do not start the app, write tests, or run builds. I will build and test myself.
- Skip anything that already exists.
- Final reply: max 8 lines (files changed + how to test).
- Windows: .\mvnw.cmd and pnpm.