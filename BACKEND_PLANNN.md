# Backend Plan — Java Spring Boot

This is the core of ScholarBridge. It owns authentication, all persistent data, and every business rule. Read `ARCHITECTURE_AND_ROLES.md` first if you haven't.

## Tech Stack

| Purpose | Tool |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.x |
| Build tool | Maven |
| Auth | Spring Security + JWT (`jjwt` library) |
| ORM | Spring Data JPA / Hibernate |
| Database | PostgreSQL |
| Validation | `spring-boot-starter-validation` (Jakarta Bean Validation) |
| HTTP client (to call Python) | Spring `RestClient` or `WebClient` |
| API testing | Postman |

## Project Structure

```
backend/
└── src/main/java/com/scholarbridge/
    ├── config/
    │   ├── SecurityConfig.java
    │   └── WebClientConfig.java
    ├── security/
    │   ├── JwtService.java
    │   ├── JwtAuthFilter.java
    │   └── UserDetailsServiceImpl.java
    ├── entity/
    │   ├── User.java
    │   ├── StudentProfile.java
    │   ├── FacultyProfile.java
    │   ├── ResearchOpening.java
    │   ├── Application.java
    │   ├── PaperSubmission.java
    │   ├── Conference.java
    │   └── ConferenceSubmission.java
    ├── repository/
    │   └── (one interface per entity, e.g. UserRepository.java)
    ├── dto/
    │   ├── request/  (e.g. LoginRequest, OpeningCreateRequest)
    │   └── response/ (e.g. AuthResponse, OpeningResponse)
    ├── service/
    │   ├── AuthService.java
    │   ├── OpeningService.java
    │   ├── ApplicationService.java
    │   ├── PaperService.java
    │   └── ConferenceService.java
    ├── controller/
    │   ├── AuthController.java
    │   ├── OpeningController.java
    │   ├── ApplicationController.java
    │   ├── PaperController.java
    │   └── ConferenceController.java
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   └── ResourceNotFoundException.java
    └── ScholarbridgeApplication.java
```

## Entities & Relationships

- **User** — id, name, email, passwordHash, role (`STUDENT` / `FACULTY`)
- **StudentProfile** — userId (FK, 1:1), skills (comma-separated or a separate table), year
- **FacultyProfile** — userId (FK, 1:1), department, researchDomains
- **ResearchOpening** — id, facultyId (FK), title, description, requiredSkills, seats, status (`OPEN`/`CLOSED`)
- **Application** — id, studentId (FK), openingId (FK), statementOfInterest, status (`PENDING`/`ACCEPTED`/`REJECTED`), appliedAt
- **PaperSubmission** — id, studentId (FK), title, fileUrl, extractedText, category, confidenceScore, status (`PROCESSING`/`DONE`/`FAILED`), uploadedAt
- **Conference** — id, name, department, submissionDeadline, eventDate, tracks (list of strings)
- **ConferenceSubmission** — id, paperId (FK), conferenceId (FK), track, status (`SUBMITTED`/`UNDER_REVIEW`/`ACCEPTED`/`REJECTED`), reviewComments

Relationships: `User` 1—1 `StudentProfile`/`FacultyProfile` · `FacultyProfile` 1—N `ResearchOpening` · `StudentProfile` 1—N `Application`/`PaperSubmission` · `PaperSubmission` 1—N `ConferenceSubmission`

## API Endpoints

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register as Student or Faculty |
| POST | `/api/auth/login` | Public | Returns JWT |
| GET | `/api/profile/me` | Both | Get logged-in user's profile |
| PUT | `/api/profile/me` | Both | Update profile (skills, domains) |
| POST | `/api/openings` | Faculty | Create a research opening |
| GET | `/api/openings` | Both | List/browse openings |
| GET | `/api/openings/{id}` | Both | Opening detail |
| GET | `/api/openings/{id}/applicants` | Faculty | View applicants for an opening |
| POST | `/api/applications` | Student | Apply to an opening |
| PUT | `/api/applications/{id}/status` | Faculty | Accept/reject an applicant |
| GET | `/api/applications/my` | Student | View own application statuses |
| POST | `/api/papers/upload` | Student | Upload a paper (triggers categorization) |
| GET | `/api/papers/my` | Student | List own categorized papers |
| POST | `/api/conferences` | Faculty | Create a conference (admin-style) |
| GET | `/api/conferences` | Both | List open conferences |
| POST | `/api/conferences/{id}/submit` | Student | Submit a paper to a conference |
| GET | `/api/conferences/{id}/submissions` | Faculty | Review submissions for their track |
| PUT | `/api/submissions/{id}/status` | Faculty | Accept/reject a submission |
| GET | `/api/conferences/{id}/showcase` | Public | Accepted papers, grouped by track |

## Step-by-Step Build Plan

### Week 1 — Project setup & auth
1. Generate project via [start.spring.io](https://start.spring.io) with dependencies: Web, JPA, PostgreSQL Driver, Security, Validation, Lombok.
2. Set up `application.properties` with your local Postgres connection.
3. Create `User` entity + `UserRepository`.
4. Implement password hashing (`BCryptPasswordEncoder`).
5. Build `JwtService` (generate/validate tokens) and `JwtAuthFilter`.
6. Wire up `SecurityConfig` — public routes for `/api/auth/**`, everything else requires a valid JWT.
7. Build `AuthController` with `/signup` and `/login`. Test both in Postman before moving on — this is the foundation everything else depends on.

### Week 2 — Profiles & openings
1. Create `StudentProfile`, `FacultyProfile` entities + repositories.
2. Build profile GET/PUT endpoints, restricted by role (use `@PreAuthorize` or manual role checks).
3. Create `ResearchOpening` entity + repository.
4. Build `OpeningController`: create (Faculty only), list, and detail endpoints.
5. Test the full loop in Postman: signup as faculty → login → post an opening → signup as student → login → browse openings.

### Week 3 — Applications
1. Create `Application` entity + repository.
2. Build apply, status-update, and "my applications" endpoints.
3. Add validation: a student can't apply twice to the same opening; only the faculty who owns an opening can view/accept its applicants.
4. Test the full accept/reject flow end to end in Postman.

### Week 4 — File upload & paper records (no ML yet)
1. Configure file storage — for a prototype, storing files on local disk under a known folder is fine; save the path/URL on the `PaperSubmission` row.
2. Create `PaperSubmission` entity + repository.
3. Build `POST /api/papers/upload` — accept a multipart PDF, save the file, create a `PaperSubmission` row with status `PROCESSING`. At this stage, stop here — don't call Python yet, just prove the upload and storage works.
4. Build `GET /api/papers/my`.

### Week 5 — Wire in the Python categorization service
*(Do this only after `PYTHON_ML_SERVICE_PLAN.md`'s service is built and independently tested.)*
1. Add a `WebClient` (or `RestClient`) bean pointing at `http://localhost:8000`.
2. In the paper upload flow, after saving the file, call `POST /categorize` on the Python service with the extracted text (or have Python do extraction — see the Python plan for which side does extraction).
3. On response, update the `PaperSubmission` row with `category`, `confidenceScore`, and status `DONE`. On failure, set status `FAILED` and don't crash the whole request.
4. Test with a few real PDF papers and confirm categories look sensible.

### Week 6 — Conferences
1. Create `Conference` and `ConferenceSubmission` entities + repositories.
2. Build conference creation, listing, and submission endpoints.
3. Implement auto-track-assignment: when a student submits a paper, default the `track` field to the paper's `category` (student can be allowed to override).
4. Build the faculty review endpoint and the public showcase endpoint.

### Week 7 — Polish, validation, error handling
1. Add a `GlobalExceptionHandler` so bad requests return clean JSON errors, not stack traces.
2. Add input validation annotations (`@NotBlank`, `@Email`, etc.) on all DTOs.
3. Add pagination to list endpoints (`/api/openings`, `/api/papers/my`) if you have time — not essential at prototype scale with a small dataset.
4. Seed the database with realistic demo data (3–4 faculty, 8–10 students, sample openings, sample papers) using a `data.sql` file or a `CommandLineRunner`.

### Week 8 — Integration testing with frontend
Once the frontend is ready (see `FRONTEND_PLAN.md`), spend this week purely on fixing integration issues — CORS configuration, response shape mismatches, auth token handling on the frontend side.

## Key implementation notes

- **CORS**: enable it early (`@CrossOrigin` or global `CorsConfigurationSource` bean) — otherwise your React app can't call the API at all, and this is a common source of confusing errors late in the project.
- **DTOs, not entities, in responses**: never return a JPA entity directly from a controller — map it to a DTO. Otherwise you risk exposing password hashes or hitting lazy-loading serialization errors.
- **Role checks**: enforce them at the service layer, not just by hiding buttons in the frontend. A student calling the "accept applicant" endpoint directly should get a 403, even if the frontend never shows them that button.
- **Keep the Python call isolated**: wrap the call to the ML service in a try/catch. If Python is down, the paper upload should still succeed — just leave the paper `PROCESSING` and let it be retried, rather than failing the whole upload.
