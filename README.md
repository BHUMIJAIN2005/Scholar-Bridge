# ScholarBridge

**A Research Collaboration & Mentorship Platform — Department of Computer Science, MITS DU**

ScholarBridge connects students and faculty for research collaboration. Students discover research openings matched to their skills, upload papers they've written, get those papers auto-categorized by an AI service, and can carry accepted work all the way to the department's research conference. Faculty post openings, review applicants alongside their categorized research history, and manage conference submissions.

This repository's planning is split into four documents, each covering one part of the system in step-by-step detail:

| File | Covers |
|---|---|
| [`ARCHITECTURE_AND_ROLES.md`](./ARCHITECTURE_AND_ROLES.md) | How the three parts of the system (Java, Python, React) fit together, and exactly what job each one does |
| [`BACKEND_PLAN.md`](./BACKEND_PLAN.md) | Java Spring Boot backend — entities, APIs, security, week-by-week build steps |
| [`FRONTEND_PLAN.md`](./FRONTEND_PLAN.md) | React frontend — pages, components, state, week-by-week build steps |
| [`PYTHON_ML_SERVICE_PLAN.md`](./PYTHON_ML_SERVICE_PLAN.md) | Python microservice for paper categorization — extraction, model, API, week-by-week build steps |

**Read `ARCHITECTURE_AND_ROLES.md` first.** It explains why the project is split into a Java service and a Python service, and how they talk to each other — the other three files assume you already understand that split.

---

## System at a Glance

```
                    ┌─────────────────────┐
                    │   React Frontend     │
                    │  (Student & Faculty  │
                    │      Dashboards)      │
                    └──────────┬───────────┘
                               │ REST (JSON, JWT)
                               ▼
                    ┌─────────────────────┐
                    │  Java Spring Boot    │
                    │   Backend (core)     │
                    │  — Auth              │
                    │  — Openings          │
                    │  — Applications      │
                    │  — Conference        │
                    └──────────┬───────────┘
                               │ REST (internal call)
                               ▼
                    ┌─────────────────────┐
                    │  Python FastAPI      │
                    │  ML Microservice     │
                    │  — PDF text extract  │
                    │  — Paper categorize  │
                    └─────────────────────┘
                               │
                    ┌─────────────────────┐
                    │    PostgreSQL DB     │
                    └─────────────────────┘
```

## Recommended Build Order

Don't build all three parts in parallel — you'll spend most of your time debugging integration issues instead of learning either stack properly. Build in this order:

1. **Backend first** (`BACKEND_PLAN.md`) — get auth, openings, and applications working end-to-end, tested with Postman, before writing any frontend code.
2. **Frontend second** (`FRONTEND_PLAN.md`) — once the backend APIs are stable, build the UI against them.
3. **Python ML service last** (`PYTHON_ML_SERVICE_PLAN.md`) — build and test it standalone (feed it a PDF, get back a category), *then* wire it into the Java backend as the final integration step.

This order means you always have something working and demoable, even if you run out of time before finishing every feature.

## Prerequisites

- Java 17+, Maven
- Node.js 20.9+, pnpm 12+
- Python 3.10+, pip
- PostgreSQL 14+ (or Docker, if you'd rather run it in a container)
- Postman or similar, for testing APIs before the frontend exists

## Suggested Repository Structure

```
scholarbridge/
├── backend/          # Java Spring Boot project
├── frontend/         # React project
├── ml-service/        # Python FastAPI project
└── docs/              # these planning files
```

Each part can be developed, run, and tested independently — that's the whole point of the split explained in `ARCHITECTURE_AND_ROLES.md`.

## Frontend

## Run the full app locally

The workspace task starts all three services together. Local backend storage uses embedded H2, so Docker and PostgreSQL are not needed.

Prerequisites: JDK 25, Node.js 20.9 or later with pnpm, and Python 3.10 or later.

Install dependencies once from the workspace root:

```powershell
pnpm --dir deploy-scholar-bridge-frontend-to-vercel install
python -m pip install -r ml-service/requirements.txt
```

The trained classifier is already included. If you remove it, regenerate it from `ml-service` with `python -m model.train`.

In VS Code, run **Tasks: Run Task** and choose **ScholarBridge: Start all local services**. The individual services can also be launched separately from the task list.

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- H2 console: http://localhost:8080/h2-console
- ML API docs and health: http://localhost:8000/docs and http://localhost:8000/health

The Java service connects to the ML API at `http://localhost:8000`; the frontend connects to the Java API at `http://localhost:8080`. The local H2 database is in memory and resets when the backend stops. Uploaded PDFs are saved under `backend/uploads`.

The frontend is a Next.js app in `deploy-scholar-bridge-frontend-to-vercel/`. From that directory, install dependencies and start the development server:

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The workspace root also provides `npm run dev` after the frontend dependencies have been installed.

The frontend calls the Java API at `http://localhost:8080` by default. To use a different backend, set `NEXT_PUBLIC_API_BASE_URL` in `deploy-scholar-bridge-frontend-to-vercel/.env.local`, for example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

For Vercel deployments, set `NEXT_PUBLIC_API_BASE_URL` in the project's environment variables to the deployed Java backend origin and configure that backend's CORS policy to allow the frontend domain.
