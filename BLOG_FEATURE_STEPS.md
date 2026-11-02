# Blog Feature: Step-by-Step Prompts (VS Code)

Eight small prompts instead of one big one. Agents stop midway on long tasks, so each phase ends with something you can build, test, and commit. Paste one phase at a time, finish it, then move to the next.

The full feature spec is in `BLOG_FEATURE_PROMPT.md`. Copy that file into the repo root so the agent can read it.

---

## Before you start (you, in PowerShell)

```powershell
cd "C:\Users\Dell\OneDrive\Scholar Bridge\Scholar-Bridge"
git checkout -b feature/blog
cd backend
.\mvnw.cmd clean compile
```

If `mvnw.cmd` doesn't exist, use `mvn clean compile`. Note whether it succeeds. If it fails, paste the error into Phase 0 below.

Use VS Code with Claude Code or Copilot Agent mode, opened on the `Scholar-Bridge` folder. If your Next.js frontend is a separate folder outside this repo, add it to the workspace too (File > Add Folder to Workspace) so the agent can see both.

---

## Shared context (paste at the top of EVERY phase prompt)

```
Project: ScholarBridge, a research collaboration platform for the CS department
at MITS DU. Roles: STUDENT and FACULTY (JWT auth).
Backend: Java + Spring Boot (Maven), in the `backend` folder, entry point
ScholarBridgeApplication.java. Frontend: Next.js (App Router, .tsx).
A Python ML service exists separately and is NOT part of this feature.

I'm adding a "Research Blog" feature. Full spec: BLOG_FEATURE_PROMPT.md.
Rules for every phase:
- Read the existing code first and match its package names, naming, DTO usage,
  exception handling, security config, and styling. Do not guess structure.
- Do not change or break existing features, endpoints, or entities.
- Work only on the current phase. Stop when it's done and summarize what you
  changed. Do not start the next phase.
- Windows/PowerShell environment: use `.\mvnw.cmd`, not `./mvnw`.
```

---

## Phase 0: Inspect and verify (no feature code)

```
[Paste shared context]

Phase 0. Do NOT write any feature code yet.

1. Inspect the `backend` folder: list the packages, entities, controllers,
   security/JWT setup, how the current user is obtained in controllers, how
   file uploads are handled (paper upload), and the DB config
   (application.properties/yml). Note whether the schema is auto-generated
   (ddl-auto) or uses migrations.
2. Run `.\mvnw.cmd clean compile` in `backend`. Report whether it builds. If it
   fails, list the errors and propose the minimal fixes. Do not apply them
   until I approve.
3. Locate the Next.js frontend (the folder with an `app/` directory of .tsx
   files). Report its path, how it calls the backend (fetch/axios, base URL,
   where the JWT is stored), how auth/role checks are done on pages, and which
   components folder the pages actually import from (I may have both
   `components/` and `src/components/`).
4. Give me a short plan for the remaining phases that fits what you found.
```

**Done when:** you have a report on structure and build status. Fix build errors first if there are any.

---

## Phase 1: Backend data layer

```
[Paste shared context]

Phase 1: entities and repositories only.

Create JPA entities and Spring Data repositories for: BlogPost, BlogTag
(many-to-many with BlogPost), BlogAttachment, BlogComment (nullable
parentComment, one level of replies only), BlogReaction (enum LIKE, INSIGHTFUL,
HELPFUL, INSPIRING; unique constraint on postId+userId), CommentLike (unique on
commentId+userId).

BlogPost fields: id, author (User), title (max 150), summary (max 300),
content (TEXT), status (DRAFT/PUBLISHED), optional linkedPaper (existing
PaperSubmission entity), createdAt, updatedAt.
BlogAttachment: id, post, originalFileName, storedFileName, fileSize, uploadedAt.
BlogComment: id, post, author, parentComment, content (max 1000), createdAt,
updatedAt.

Add indexes on BlogPost(status, createdAt), BlogComment(post), BlogReaction(post).
Cascade delete from a post to its comments, reactions, and attachments.

No controllers or services in this phase. Run `.\mvnw.cmd clean compile`, then
start the app once to confirm the tables are created without errors.
```

**Done when:** the app starts and the new tables appear in PostgreSQL.
**Commit:** `git add . ; git commit -m "blog: add entities and repositories"`

---

## Phase 2: Backend posts API

```
[Paste shared context]

Phase 2: blog post CRUD, feed, and tags (no attachments, comments, or
reactions yet).

Build DTOs, a BlogService, and a BlogController for:
- POST /api/blogs (create as DRAFT or PUBLISHED)
- GET /api/blogs (published only, newest first, paginated 10 per page; params:
  page, tag, authorRole, q for title keyword)
- GET /api/blogs/{id} (published posts visible to all logged-in users; drafts
  only to their author)
- PUT /api/blogs/{id} and DELETE /api/blogs/{id} (author only)
- GET /api/blogs/my (the current user's posts including drafts)
- GET /api/blogs/tags (popular tags)

Rules: use DTOs, never return entities; max 5 tags per post, stored lowercase;
auto-generate summary from the first 200 chars of content if empty; enforce
ownership in the service layer (403 for wrong user, 404 for missing) using the
project's existing exception handling; validate input with Jakarta Validation;
avoid N+1 queries. Post responses include author name and role, but never
email or password hash.

Add a short list of curl/PowerShell or Postman requests I can use to test each
endpoint.
```

**Done when:** you can create, publish, list, edit, and delete posts in Postman with both a student and a faculty token.
**Commit:** `blog: add post CRUD and feed API`

---

## Phase 3: PDF attachments

```
[Paste shared context]

Phase 3: PDF attachments for blog posts.

Endpoints:
- POST /api/blogs/{id}/attachments (multipart; post author only)
- GET /api/blogs/attachments/{attachmentId} (any logged-in user, authenticated
  download/preview)
- DELETE /api/blogs/attachments/{attachmentId} (post author only)

Rules: max 3 PDFs per post, max 10 MB each. Validate the content type AND the
file signature (first bytes must be %PDF), not just the extension, and return a
clear error otherwise. Save under a randomized file name, keep the original name
in the database, and protect against path traversal. Reuse the existing paper
upload storage mechanism and folder convention where possible. Deleting a post
or attachment must delete the file from disk too. Check that
spring.servlet.multipart max sizes allow 10 MB. Include the attachment list in
the post detail response.

Add test requests, including one that uploads a renamed .exe or .txt file to
confirm it is rejected.
```

**Done when:** a real PDF uploads and downloads, and a fake PDF is rejected.
**Commit:** `blog: add PDF attachments`

---

## Phase 4: Reactions and comments

```
[Paste shared context]

Phase 4: reactions and comments (backend).

Endpoints:
- PUT /api/blogs/{id}/reaction (body: type or null) sets, switches, or removes
  the current user's single reaction on a post
- GET /api/blogs/{id}/comments (top-level comments with their replies and like
  counts)
- POST /api/blogs/{id}/comments (optional parentCommentId; replies to replies
  are rejected)
- PUT /api/blogs/comments/{commentId} (comment author only)
- DELETE /api/blogs/comments/{commentId} (comment author, OR the author of the
  post for moderation)
- PUT /api/blogs/comments/{commentId}/like (toggle)

Rules: only published posts accept comments and reactions; one reaction per
user per post (clicking the same type removes it); comment content required, max
1000 chars, plain text only. Include in the post detail response: reaction
counts per type, and the current user's reaction. Include in the comment
response: author name and role, createdAt, like count, whether the current user
liked it. Use aggregate queries to avoid N+1.

Add test requests covering the one-reaction rule and the moderation rule.
```

**Done when:** reaction counts stay correct when you click, switch, and remove, and a post author can delete someone else's comment on their own post only.
**Commit:** `blog: add reactions and comments`

---

## Phase 5: Frontend API layer, feed, and detail page (Next.js)

```
[Paste shared context]

Phase 5: frontend, read-side pages. Use the Next.js frontend you located in
Phase 0 and the same components folder the existing pages import from.

1. Create a blog API helper (same approach the existing pages use to call the
   backend and attach the JWT) with functions for every endpoint from
   Phases 2 to 4.
2. Add pages with the App Router:
   - app/blog/page.tsx: feed with title search, tag chips, a role filter
     (All/Students/Faculty), post cards, pagination (10 per page)
   - app/blog/[id]/page.tsx: post detail with Markdown rendered through a
     sanitizing renderer (react-markdown, raw HTML disabled), attachments list
     (name, size, download button), reaction bar, and comments section with
     one level of replies and comment likes
3. Components: BlogCard, ReactionBar, CommentSection, CommentItem, RoleBadge,
   AttachmentList, MarkdownRenderer.
4. Add a "Blog" link to the existing navigation for both roles.
5. Reuse the existing styling, card, and button look. Add loading skeletons,
   empty states, and error messages. Reaction clicks update optimistically and
   roll back on failure. Confirm before deleting a comment.

Show edit/delete controls only to the right users (the backend still enforces).
Run the frontend build and fix type errors in the new files only.
```

**Done when:** you can browse the feed, open a post, react, and comment in the browser.
**Commit:** `blog: add feed and detail pages`

---

## Phase 6: Frontend write and my-posts pages

```
[Paste shared context]

Phase 6: frontend, write-side pages.

- app/blog/new/page.tsx and app/blog/[id]/edit/page.tsx: title, Markdown
  editor with a Preview tab, tag input (max 5), PDF upload area with progress
  and error states (max 3 files, 10 MB each, PDF only, validate on the client
  too), optional dropdown to link one of the user's existing papers, and Save
  Draft / Publish buttons.
- app/blog/my/page.tsx: Drafts and Published tabs with edit and delete (with a
  confirmation).

Match the existing styling. Use the same auth and role handling as the other
pages. Run the frontend build and fix type errors in the new files only.
```

**Done when:** a student and a faculty member can each write a post, attach a PDF, publish it, and see it in the feed.
**Commit:** `blog: add write and my-posts pages`

---

## Phase 7: Seed data and tests

```
[Paste shared context]

Phase 7: seed data and tests.

1. Seed (using the project's existing seeding approach, only if it has one;
   otherwise add a dev-only CommandLineRunner that skips if posts exist): 5
   published posts from a mix of existing student and faculty users, a few
   comments with replies, a spread of reactions, and 1 draft. Topics: "How I
   wrote my first research paper", "Choosing a research topic as a third-year
   student", "What I look for as a reviewer", "Learning LaTeX the hard way",
   "Turning a course project into a conference paper".
2. Add backend tests: service-level tests for ownership rules, the
   one-reaction-per-user rule, comment depth limit, and PDF validation; plus a
   few controller tests for the main endpoints.
3. Run all tests and report results.
4. Give me a final summary: files added or changed, new dependencies, and how
   to run and test the feature.
```

**Done when:** tests pass and the demo has realistic content.
**Commit:** `blog: add seed data and tests`

---

## If the agent stops midway again

- Run `git status` and `git diff --stat` to see what it wrote.
- Run the build (`.\mvnw.cmd clean compile` or the frontend build) to see what is half-finished.
- Commit what works, then re-paste the **same phase** with this line added at the end: `Part of this phase may already be done. Check the repo first and only finish what is missing.`

## Final checks before you merge

- No secrets or `.env` files are committed.
- Run the backend and frontend together, and test the full flow with one student and one faculty account.
- Merge `feature/blog` into `main` through a pull request, as you did for the ML service.
