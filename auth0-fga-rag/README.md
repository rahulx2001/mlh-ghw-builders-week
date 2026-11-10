# Privacy-Aware RAG Bot (Auth0 FGA / OpenFGA)

Internal HR / Legal knowledge assistant for MLH Global Hack Week Builders Week: *The Privacy-Aware RAG Bot (Focus: Auth0 FGA)*.

The assistant answers questions from a small document index, but every document is authorized with Fine-Grained Authorization **before** retrieval or context building. A manager can read salary documents; a general employee cannot, even though those documents sit in the same index.

## Architecture

```
User query
   │
   ▼
FGA filter (check / batchCheck / listObjects on document#can_view)
   │  allowed document IDs only
   ▼
Retriever ranks ONLY the authorized subset (keyword overlap)
   │
   ▼
Deterministic local responder (extractive sentences)
   │
   ▼
Answer + audit of allowed / denied documents
```

Authorization model (`fga/model.fga`):

- `user` can be an `assignee` of a `role` and a `member` of a `department`
- a `document` `viewer` may be a user, `role#assignee`, or `department#member`
- `owner` implies `viewer`
- `can_view` is computed from `viewer`

Sample identities (`data/users.json`):

| User  | Role     | Department  | Can view |
|-------|----------|-------------|----------|
| alice | manager  | finance     | handbook, salary bands, exec comp, Q4 budget |
| bob   | employee | engineering | handbook only |
| carol | employee | legal       | handbook, legal retention policy |
| dave  | manager  | hr          | handbook, salary bands, exec comp, Q4 budget |

The answer generator is a **deterministic local responder**, not an LLM. It extracts the highest-overlap sentences from authorized chunks. Swap `DeterministicLocalResponder` for a real model behind the `Responder` interface if you later add a key.

## How to run

```bash
npm install
# Optional: start a local OpenFGA server (binary in bin/ after you download it)
# ./bin/openfga run --http-addr 127.0.0.1:8080 --grpc-addr 127.0.0.1:8081
npm start
# open http://127.0.0.1:3456
```

The server tries, in order:

1. A configured Auth0 FGA / OpenFGA store (`FGA_API_URL` + `FGA_STORE_ID` in `.env`)
2. A local OpenFGA process using `./bin/openfga` (seeded automatically)
3. The labelled in-memory fallback (`src/fga/in-memory.ts`)

Copy `.env.example` to `.env` and see `SETUP_NEEDED.md` for Auth0 FGA credentials.

```bash
npm test
```

Tests start local OpenFGA when the binary is present and print `TEST_AUTHZ_BACKEND=...` so you can see which engine ran.

## Challenge requirements mapped to code

| Challenge goal | Where it lives |
| --- | --- |
| Internal HR / Legal RAG assistant | `src/rag/assistant.ts`, `data/documents.json`, `public/index.html` |
| Document-level access from the logged-in user's role and department | `fga/model.fga`, `fga/tuples.json` |
| Auth0 FGA / OpenFGA checks such as `user:alice` can view `document:budget_Q4` | `src/fga/openfga-sdk-client.ts` using `@openfga/sdk` |
| Manager can read salary docs; general employee cannot, even if the doc is indexed | `tests/privacy-rag.test.ts` (alice vs bob on `salary_band_2026`) |
| Deny access when the LLM / responder would otherwise retrieve a sensitive doc | `src/rag/retriever.ts` filters with `batchCheck` **before** ranking |
| Official SDK and authorization model file | `@openfga/sdk`, `fga/model.fga`, `fga/model.json`, `fga/tuples.json` |
| No secrets committed | `.env` is gitignored; `.env.example` has empty placeholders |
| No LLM key | `src/rag/responder.ts` (`deterministic-local`) |

## Project layout

```
fga/                  authorization model and sample tuples
data/                 documents and demo users
src/fga/              OpenFGA SDK client, in-memory fallback, factory
src/rag/              store, FGA-first retriever, responder, assistant
src/server.ts         demo HTTP API + static UI
public/index.html     side-by-side Alice vs Bob demo
tests/                node:test suite
reports/              captured test output
```
