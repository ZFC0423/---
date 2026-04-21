# Ganzhou Travel Platform

This repository contains the graduation project workspace for:

`Design and Implementation of a Ganzhou Travel and Culture Smart Service Platform`

## Current Scope

The repository currently includes:

- `client-web/` for the public website
- `admin-web/` for the admin console
- `server/` for the Node.js backend
- `sql/` for MySQL initialization scripts
- `docs/` for project documentation

## Current Backend Status

The backend already has:

- Express startup entry
- environment variable loading
- Sequelize database connection
- unified response helpers
- JWT auth middleware
- upload endpoint with local `/uploads` static access
- first batch of front/admin APIs

## Intent Router PR1

PR1 adds a backend-only intent router at `POST /api/front/ai/intent`.

- What it does:
  - normalizes `input` and optional `priorState`
  - returns structured routing JSON for `task_type`, `constraints`, `clarification_needed`, `clarification_questions`, and `next_agent`
  - uses `preprocess -> llm extract -> validate -> fallback -> normalize result`
- What it is responsible for:
  - routing between `guide_understand`, `plan_route`, and clarify paths
  - extracting only the constraint fields needed by the downstream AI entry points
  - producing stable debug trace via internal `_meta`
- What it does not do:
  - it does not execute `ai-chat` or `ai-trip`
  - it does not change database schema
  - it does not add frontend integration in PR1

Run the local PR1 tests from the repo root:

```bash
node --test --test-concurrency=1 --test-isolation=none server/test/intent-router.test.js
node --test --test-concurrency=1 --test-isolation=none server/test/intent-router.contract.test.js
node --test --test-concurrency=1 --test-isolation=none server/test/intent-router.extract.test.js
node --test --test-concurrency=1 --test-isolation=none server/test/intent-route.http.test.js
```

## Knowledge & Trust Agent v1

PR adds a new backend-only guide endpoint at `POST /api/front/ai/knowledge`.

- What it does:
  - accepts only structured `guide_understand` router output
  - returns a structured guide answer with `retrieval_status`, `evidence_status`, and `evidence.citations`
  - supports a `mock` provider first, so the RouterOutput -> Service -> Controller -> HTTP response chain can be verified before real LLM generation
- What it is responsible for:
  - guide-style explanation for scenic / theme / culture understanding
  - code-owned evidence assembly from existing `scenic_spots`, `articles`, and `categories`
  - explicit uncertainty when retrieval is empty or evidence is insufficient
- What it does not do:
  - it does not accept free chat input
  - it does not do trip planning
  - it does not reuse the old `ai-chat` retrieval/context strategy
  - it does not change database schema or frontend page structure

Local Knowledge Agent tests:

```bash
node --test --test-concurrency=1 --test-isolation=none server/test/knowledge-agent.test.js
node --test --test-concurrency=1 --test-isolation=none server/test/knowledge-agent.contract.test.js
node --test --test-concurrency=1 --test-isolation=none server/test/knowledge-route.http.test.js
```

Provider switch:

- `AI_GUIDE_PROVIDER=mock` runs the structured mock path
- `AI_GUIDE_PROVIDER=llm` enables real answer generation while keeping evidence/status fields code-owned

## Database Name

Use the same database name everywhere:

- `ganzhou_travel_platform`

## Initialization

Prerequisites:

- MySQL 8.x
- Node.js 18+ and npm

1. Import [sql/schema.sql](C:\Users\Administrator\Desktop\ganzhou-travel-platform\sql\schema.sql)
2. Copy `server/.env.example` to `server/.env`
3. Update database credentials in `server/.env`
4. Install dependencies in `server`
5. Start the backend with `npm run dev`

## Local Run SOP

If you want a step-by-step local startup guide, see:

- [docs/本地运行SOP.md](C:\Users\Administrator\Desktop\ganzhou-travel-platform\docs\本地运行SOP.md)

## Default Admin Account

- username: `admin`
- password: `Admin@123456`
