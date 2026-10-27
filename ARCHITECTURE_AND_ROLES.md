# Architecture & Division of Responsibility

ScholarBridge is made of **three independent pieces** that talk to each other over REST APIs. Read this file before the other three — it explains *why* the project is split this way, and exactly what each piece is (and isn't) responsible for.

## Why split it at all?

You could technically do everything in Java, or everything in Python. The split exists because each language is genuinely the stronger tool for a different half of the job:

- **Java (Spring Boot)** is built for exactly this kind of work: user accounts, permissions, structured data, transactions, and serving a stable set of APIs to a frontend. It has mature, well-documented tooling for all of it (Spring Security, Spring Data JPA), and it's also the skill you specifically want to get stronger at.
- **Python** has, by a wide margin, the best ecosystem for text processing and machine learning (scikit-learn, pandas, PDF-parsing libraries). Trying to do TF-IDF vectorization or train a classifier in Java is possible but painful — you'd be fighting the language instead of learning the concept.

So: **Java owns the application. Python owns one narrow, well-defined ML task.** They never share a database or call each other's internal code — they only talk over plain HTTP, which means you can build, run, and test each one completely on its own.

## Who does what

### Java Spring Boot Backend — "the application"
This is the core system. It owns:
- User accounts and login (Student / Faculty roles), via JWT
- Research openings — create, browse, apply
- Applications — status tracking, faculty review
- Conferences and conference submissions
- The database (PostgreSQL) — Java is the *only* service that talks to the database directly
- Storing uploaded PDF files (just storing them — not reading their content)
- Calling the Python service when a paper needs to be categorized, and storing the result it gets back

If a feature involves **accounts, permissions, or persistent data**, it lives in Java.

### Python FastAPI Service — "the categorization engine"
This is a small, stateless microservice with exactly one job: given a PDF, extract its text and return a predicted research category with a confidence score. It has no login system, no database of its own, and no idea who the user is — it just receives a file, does NLP work on it, and responds with JSON. It owns:
- Extracting text from an uploaded PDF (abstract/body)
- Cleaning and vectorizing that text (TF-IDF)
- Running the trained classifier and returning `{ category, confidence }`

If a feature involves **reading the content of a document and making a prediction about it**, it lives in Python.

### React Frontend — "what the user sees"
Talks *only* to the Java backend, never directly to the Python service. It owns:
- Login/signup forms, dashboards for Student and Faculty
- Displaying openings, applications, papers, conference submissions
- File upload UI (the file itself goes to Java, which then forwards it to Python internally)

## How a paper upload actually flows through the system

This is the one moment where all three pieces work together — worth understanding end to end:

1. Student selects a PDF in the React upload form and submits it.
2. React sends the file to the Java backend: `POST /api/papers/upload`.
3. Java saves the file and creates a `PaperSubmission` row with status `PROCESSING`.
4. Java calls the Python service internally: `POST http://ml-service:8000/categorize` with the file (or its extracted text).
5. Python extracts the text, runs the classifier, and responds: `{ "category": "Machine Learning", "confidence": 0.87 }`.
6. Java updates the `PaperSubmission` row with that category and confidence, sets status to `DONE`.
7. React polls or refetches the paper list and shows the result to the student.

Note that **the frontend never knows Python exists** — as far as React and the student are concerned, they just asked Java to categorize a paper and got an answer back. This is the benefit of the split: you could swap out the entire Python service for a different implementation later, and nothing else in the system would need to change, as long as it still returns the same JSON shape.

## Communication contract (the one thing that must stay in sync)

Java and Python only need to agree on one thing: the shape of the request and response between them.

**Java → Python** (`POST /categorize`)
```json
{
  "text": "raw extracted abstract/body text of the paper..."
}
```

**Python → Java** (response)
```json
{
  "category": "Machine Learning",
  "confidence": 0.87
}
```

As long as both sides honor this contract, you can build and test them completely independently — Java can be tested by mocking this response, and Python can be tested by hitting it directly with Postman, long before the two are wired together.

## Local development setup

Run the complete application with the VS Code task **ScholarBridge: Start all local services**. It starts the current Next.js frontend on port 3000, the Spring Boot backend on port 8080, and the FastAPI categorization service on port 8000.

The backend's default `local` profile uses embedded in-memory H2, so PostgreSQL and Docker are optional for local development. The backend calls the ML service at `http://localhost:8000`; the frontend calls the backend at `http://localhost:8080`. See the root `README.md` for prerequisites and one-time dependency installation.

## What to say in your viva if asked "why two languages?"

> "The Java backend handles everything transactional — accounts, permissions, applications, data storage. The Python service is a separate, stateless microservice that does one job: text classification. This is a common real-world pattern called a microservice architecture — it lets each part use the best tool for its job, and means the ML component could be improved, retrained, or replaced without touching the rest of the system."

That's a genuinely correct and defensible answer, not just a justification — this is a real pattern used in production systems.
