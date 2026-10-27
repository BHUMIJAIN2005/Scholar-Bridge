# Frontend Plan — React

This is the interface students and faculty actually use. It talks only to the Java backend (see `ARCHITECTURE_AND_ROLES.md`) — it never calls the Python service directly. Build this *after* the backend's core APIs (auth, openings, applications) are working and testable in Postman.

## Tech Stack

| Purpose | Tool |
|---|---|
| Build tool | Vite (`npm create vite@latest`) |
| Routing | React Router |
| HTTP calls | Axios |
| Auth state | React Context API (no need for Redux at this scale) |
| Styling | Tailwind CSS (fast to work with, keeps you from hand-writing lots of CSS) |
| Forms | Plain controlled components (no need for a form library at this scale) |

## Project Structure

```
frontend/
└── src/
    ├── api/
    │   ├── axiosClient.js       (base config, attaches JWT to every request)
    │   ├── authApi.js
    │   ├── openingsApi.js
    │   ├── applicationsApi.js
    │   ├── papersApi.js
    │   └── conferenceApi.js
    ├── context/
    │   └── AuthContext.jsx       (stores logged-in user + token, login/logout functions)
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ProtectedRoute.jsx    (redirects to login if not authenticated)
    │   ├── OpeningCard.jsx
    │   ├── ApplicationStatusBadge.jsx
    │   ├── PaperCard.jsx
    │   └── CategoryChip.jsx
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── SignupPage.jsx
    │   ├── student/
    │   │   ├── StudentDashboard.jsx
    │   │   ├── BrowseOpenings.jsx
    │   │   ├── OpeningDetail.jsx
    │   │   ├── MyApplications.jsx
    │   │   ├── MyPapers.jsx
    │   │   └── SubmitToConference.jsx
    │   ├── faculty/
    │   │   ├── FacultyDashboard.jsx
    │   │   ├── PostOpening.jsx
    │   │   ├── ViewApplicants.jsx
    │   │   └── ReviewSubmissions.jsx
    │   ├── GuidancePage.jsx       (static content for newbies)
    │   └── ShowcasePage.jsx       (public, no login needed)
    ├── App.jsx                    (routes)
    └── main.jsx
```

## Pages & What Each One Does

| Page | Role | Purpose |
|---|---|---|
| Login / Signup | Public | Auth forms, role selection on signup |
| Student Dashboard | Student | Overview: active applications, papers, quick links |
| Browse Openings | Student | List + filter openings by domain/skills |
| Opening Detail | Student | Full opening info + apply form |
| My Applications | Student | Status of each application |
| My Papers | Student | Upload form + list of papers with category/confidence shown |
| Submit to Conference | Student | Pick a paper, pick a conference, submit |
| Faculty Dashboard | Faculty | Overview: their openings, pending applicants, pending reviews |
| Post Opening | Faculty | Form to create a new opening |
| View Applicants | Faculty | List of applicants per opening, with linked paper categories, accept/reject buttons |
| Review Submissions | Faculty | Conference submissions for their track, accept/reject with comments |
| Guidance Page | Both (mainly Student) | Static articles — how to approach research, write a statement of interest |
| Showcase Page | Public | Accepted conference papers, grouped by track — no login required |

## Step-by-Step Build Plan

### Week 1 — Setup, routing, auth
1. Scaffold with Vite, install Tailwind, React Router, Axios.
2. Build `axiosClient.js` — base URL pointing at the Java backend, an interceptor that attaches the JWT from context/localStorage to every request.
3. Build `AuthContext` — holds `user`, `token`, exposes `login()`, `logout()`, `signup()`.
4. Build `LoginPage` and `SignupPage` (with role toggle: Student / Faculty), wired to the real `/api/auth` endpoints.
5. Build `ProtectedRoute` and set up `App.jsx` with routes for public vs authenticated pages.
6. At this point: confirm you can sign up, log in, and land on a placeholder dashboard with the JWT correctly attached to subsequent requests (check the Network tab).

### Week 2 — Openings flow
1. Build `BrowseOpenings` — fetch and list from `/api/openings`, simple client-side filter by skill/domain text match.
2. Build `OpeningDetail` — fetch single opening, show an "Apply" form for students only.
3. Build `PostOpening` (Faculty) — form that posts to `/api/openings`.
4. Build `OpeningCard` component, reused in both browse and faculty's "my openings" list.

### Week 3 — Applications
1. Build the apply flow from `OpeningDetail` — submit statement of interest.
2. Build `MyApplications` (Student) — list with status badges.
3. Build `ViewApplicants` (Faculty) — list applicants per opening with accept/reject buttons, calling the status-update endpoint.

### Week 4 — Paper upload
1. Build `MyPapers` — file upload form (multipart) posting to `/api/papers/upload`.
2. Show upload status: while `PROCESSING`, show a loading state; poll or refetch every few seconds until status is `DONE`, then show the category chip and confidence score.
3. Build `CategoryChip` and `PaperCard` components.

### Week 5 — Conference flow + guidance + showcase
1. Build `SubmitToConference` — dropdown to pick one of the student's `DONE` papers, pick an open conference, submit.
2. Build `ReviewSubmissions` (Faculty) — list submissions for conferences/tracks matching their domain, accept/reject with a comment field.
3. Build `GuidancePage` — this can be entirely static JSX content (a few sections of hard-coded text/markdown-like content) — no need for a backend-driven CMS at prototype scale.
4. Build `ShowcasePage` — public route, fetches `/api/conferences/{id}/showcase`, groups and displays accepted papers by track.

### Week 6 — Dashboards, polish, integration fixes
1. Build `StudentDashboard` and `FacultyDashboard` — pull together summary counts and recent activity from the APIs you already built (no new backend work needed here, just composing existing calls).
2. Add loading states, empty states ("No applications yet"), and error toasts/messages across all pages.
3. Fix any CORS/response-shape mismatches found while wiring real data in.
4. Responsive pass — make sure it's at least usable on a laptop screen for your demo; mobile isn't a priority for a college prototype.

## Key implementation notes

- **Keep API calls in the `api/` folder, not scattered in components** — every component should call a function like `openingsApi.getAll()`, never `axios.get(...)` directly. This makes it much easier to fix things when the backend response shape changes.
- **Store the JWT in memory + localStorage** — memory (Context) for use during the session, localStorage so a page refresh doesn't log the user out. Clear both on logout.
- **Don't trust the frontend to enforce roles** — hiding a button from a student is a UX nicety, not security; the real enforcement is in the Java backend. Still do it, though, since it makes the demo look polished.
- **Build against real backend data, not mocked data**, once Week 1's auth is working — catching integration issues early is much easier than discovering them all in Week 6.
