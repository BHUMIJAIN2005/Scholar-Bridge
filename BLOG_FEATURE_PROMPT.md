# Antigravity Prompt: Add a "Research Blog" Feature to ScholarBridge

Paste everything under the **Prompt** heading into Antigravity. The prompt tells the agent to read your existing code first and follow its conventions, so the new feature matches what you already built.

---

## Prompt

### Context

ScholarBridge is a research collaboration platform for the Computer Science department at MITS DU. The current stack:

- **Backend:** Java 17, Spring Boot 3, Spring Security with JWT, Spring Data JPA, PostgreSQL, Maven. Packages under `com.scholarbridge` (`controller`, `service`, `repository`, `entity`, `dto`, `security`, `exception`).
- **Frontend:** React (Vite), React Router, Axios, Tailwind CSS, Context API for auth. API calls live in `src/api/`, pages in `src/pages/`, shared UI in `src/components/`.
- **Roles:** `STUDENT` and `FACULTY`, enforced by JWT.
- **Existing features:** research openings, applications, paper upload with ML categorization (Python FastAPI service), conferences, guidance page, showcase page.

**Before writing any code, explore the repository.** Read the existing entities, controllers, security config, file-upload handling, `axiosClient`, `AuthContext`, `Navbar`, and `App.jsx` routes. Match their naming, error handling, DTO usage, and styling. Do not refactor or break any existing feature.

### Feature goal

Add a **Research Blog** where students and faculty can share their experience of writing a research paper (the process, challenges, tips, lessons learned), attach relevant PDF work, and where other users can **comment and react**. It supports the platform's mentorship goal, since newcomers can learn from the experience of others.

---

### Functional requirements

#### 1. Blog posts

- Any logged-in Student or Faculty can create, edit, and delete **their own** posts.
- Fields: `title` (required, max 150 chars), `content` (required, Markdown), `summary` (optional, max 300 chars, auto-generated from the first 200 chars of content if empty), `tags` (0 to 5 free-text tags, e.g. "literature review", "LaTeX", "peer review"), `status` (`DRAFT` or `PUBLISHED`), `createdAt`, `updatedAt`.
- Authors can save a post as a draft and publish it later. Only published posts appear in the public feed. Drafts are visible only to their author.
- Each post shows the author's name and a role badge (Student or Faculty).
- Optional: an author can link one of their existing `PaperSubmission` records to the post, so the post shows the paper's title and its AI-assigned category chip.

#### 2. PDF attachments

- An author can attach up to **3 PDF files** per post, each at most **10 MB**.
- Validate on the server: check the content type **and** the file signature (the first bytes should be `%PDF`), not just the extension. Reject anything else with a clear error message.
- Store files using the same mechanism the paper upload already uses. Save a randomized file name on disk and keep the original name in the database.
- Any logged-in user can download or preview attachments. Serve them through an authenticated endpoint, with no direct public file path.
- The author can remove an attachment.

#### 3. Comments

- Any logged-in user can comment on a published post.
- Support **one level of replies** (a reply to a comment, but no replies to replies).
- Authors can edit and delete their own comments. The **post author** can delete any comment on their post (moderation). Faculty cannot delete other people's comments on posts that are not theirs.
- Comment text is required, max 1000 chars, and rendered as plain text, never as HTML.
- Show the commenter's name, role badge, and relative time ("2 hours ago").

#### 4. Reactions

- Reaction types on posts: `LIKE`, `INSIGHTFUL`, `HELPFUL`, `INSPIRING`.
- A user can have **at most one reaction per post**. Clicking the same reaction again removes it, and clicking a different one switches it.
- Also allow a simple `LIKE` toggle on comments.
- Show reaction counts per type, and highlight the reaction the current user selected.
- Update the UI optimistically and roll back if the API call fails.

#### 5. Discovery

- A blog feed page with newest-first ordering and **pagination** (10 per page).
- Filter by tag, filter by author role (All / Students / Faculty), and keyword search on the title.
- A "My Posts" page listing the user's drafts and published posts, with edit and delete actions.

---

### Backend design

#### Entities (JPA, PostgreSQL)

- **BlogPost**: id, authorId (FK to User), title, summary, content (TEXT), status, linkedPaperId (nullable FK to PaperSubmission), createdAt, updatedAt
- **BlogTag**: id, name (unique, lowercase), joined to BlogPost through a many-to-many table
- **BlogAttachment**: id, postId (FK), originalFileName, storedFileName, fileSize, uploadedAt
- **BlogComment**: id, postId (FK), authorId (FK), parentCommentId (nullable self-FK), content, createdAt, updatedAt
- **BlogReaction**: id, postId (FK), userId (FK), type (enum), createdAt, with a **unique constraint on (postId, userId)**
- **CommentLike**: id, commentId (FK), userId (FK), with a unique constraint on (commentId, userId)

Add indexes on `BlogPost(status, createdAt)`, `BlogComment(postId)`, and `BlogReaction(postId)`. Use cascade delete so removing a post removes its comments, reactions, and attachment records (and delete the files from disk too).

#### REST endpoints (all require JWT unless stated)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/blogs` | Create post (draft or published) |
| GET | `/api/blogs` | Paginated feed. Query params: `page`, `tag`, `authorRole`, `q` |
| GET | `/api/blogs/{id}` | Post detail with counts, current user's reaction, attachments |
| PUT | `/api/blogs/{id}` | Edit own post |
| DELETE | `/api/blogs/{id}` | Delete own post |
| GET | `/api/blogs/my` | Current user's posts, including drafts |
| POST | `/api/blogs/{id}/attachments` | Upload a PDF (multipart) |
| GET | `/api/blogs/attachments/{attachmentId}` | Download or preview a PDF |
| DELETE | `/api/blogs/attachments/{attachmentId}` | Remove an attachment (post author only) |
| PUT | `/api/blogs/{id}/reaction` | Set, change, or remove the current user's reaction |
| GET | `/api/blogs/{id}/comments` | Comments with replies and like counts |
| POST | `/api/blogs/{id}/comments` | Add a comment or reply (`parentCommentId` optional) |
| PUT | `/api/blogs/comments/{commentId}` | Edit own comment |
| DELETE | `/api/blogs/comments/{commentId}` | Delete own comment, or any comment if you are the post author |
| PUT | `/api/blogs/comments/{commentId}/like` | Toggle like on a comment |
| GET | `/api/blogs/tags` | Popular tags, for the filter UI |

#### Backend rules

- Use DTOs for all requests and responses, never return entities. Never expose password hashes or emails of other users.
- Enforce ownership and role checks in the **service layer**, returning 403 for violations and 404 for missing resources, using the project's existing exception handler.
- Validate all inputs with Jakarta Validation annotations.
- **Security:** sanitize or escape user-provided content so it cannot cause stored XSS. Prefer rendering Markdown on the frontend with a sanitizing renderer, and also strip raw HTML on the server side. Protect against path traversal in file handling. Never trust the client-supplied file name.
- Use pagination (`Pageable`) in the feed query. Avoid N+1 queries by fetching counts with aggregate queries or projections.

---

### Frontend design

#### New pages (routes protected by the existing `ProtectedRoute`)

- `/blog`: **BlogFeed** with search, tag chips, role filter, post cards, and pagination
- `/blog/:id`: **BlogDetail** with rendered Markdown, attachments list (PDF icon, name, size, download button), reaction bar, comments section
- `/blog/new` and `/blog/:id/edit`: **WriteBlog**, with title, a Markdown editor and live preview tab, tag input, PDF upload dropzone with progress and error states, optional "link one of my papers" dropdown, and **Save Draft** and **Publish** buttons
- `/blog/my`: **MyPosts** with a Drafts and Published tab, edit and delete buttons

#### New components

`BlogCard`, `ReactionBar`, `CommentSection`, `CommentItem`, `TagInput`, `AttachmentList`, `RoleBadge`, `MarkdownRenderer`

#### Frontend rules

- Put all API calls in a new `src/api/blogApi.js` using the existing `axiosClient`.
- Add a "Blog" link to the Navbar for both roles.
- Use the existing Tailwind styling and visual language (same card style, colors, buttons).
- Include loading skeletons, empty states ("No posts yet. Share your first experience!"), and error messages for every async action.
- Confirm before deleting a post or comment.
- Show Edit and Delete controls only to the right users (the backend remains the real enforcement).
- Render Markdown with a sanitizing renderer (for example `react-markdown` without raw HTML enabled).
- Make it usable on laptop screens and reasonably responsive on mobile.

---

### Seed data

Add seed data (using the project's existing seeding approach) with:

- 5 published blog posts from a mix of students and faculty, on topics like "How I wrote my first research paper", "Choosing a research topic as a third-year student", "What I look for as a reviewer", "Learning LaTeX the hard way", and "Turning a course project into a conference paper"
- A few comments with replies, and a spread of reactions
- 1 draft post
- No real PDFs are needed, but make the attachment flow testable with the sample PDFs already in the project

### Out of scope

Do not build notifications, image uploads in the editor, a follow system, or an admin panel. Do not change existing endpoints, entities, or pages other than adding the Navbar link and the new routes.

### Deliverables and working order

Work in this order, and run or test after each step:

1. Backend entities, repositories, and migrations or schema updates
2. Services, controllers, DTOs, and validation, with ownership and role checks
3. Attachment upload, validation, and secure download
4. Reactions and comments (including replies and comment likes)
5. Frontend API layer, then feed, detail, write, and my-posts pages
6. Seed data
7. Tests: unit tests for services (ownership rules, the one-reaction-per-user rule, file validation) and a few controller tests for the main endpoints

### Acceptance criteria

- A student and a faculty member can each write, publish, edit, and delete their own posts.
- A draft is visible only to its author, and publishing it makes it appear in the feed.
- Only valid PDFs up to 10 MB, max 3 per post, are accepted, and a renamed `.exe` is rejected.
- A user can hold only one reaction per post, and toggling or switching works correctly with accurate counts.
- Comments and one-level replies work, and a post author can moderate comments on their own post.
- Script tags typed into a post, comment, or tag are shown as plain text and never executed.
- Unauthenticated requests are rejected, and a user cannot edit or delete another user's post.
- All existing features still work.

At the end, give me a short summary of the files you added or changed, any new dependencies, and how to run and test the feature.

---

## Tips for using this prompt

- Antigravity works best when it can plan first. If it jumps straight into coding, ask it to produce an implementation plan and wait for your approval before it makes changes.
- If the agent's output feels too large to review, split the prompt in two. Do the backend first (the Backend design and Backend rules sections), test it in Postman, then run the frontend part.
