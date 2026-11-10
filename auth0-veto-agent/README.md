# The Veto Agent

MLH Global Hack Week: Builders Week challenge
**[The Veto Agent (Focus: Token Vault & Asynchronous Authorization)](https://www.mlh.com/events/global-hack-week-builders-week/challenges/01a1ad3c-362d-ef98-556d-3c5b44e1551a)**.

A small Node.js / TypeScript agent that:

- Uses Auth0 **Token Vault** (`@auth0/ai` `TokenVaultAuthorizerBase`) to exchange an Auth0 refresh token for a Google token, then reads or writes Google Calendar.
- Uses Auth0 **CIBA / asynchronous authorization** (`@auth0/ai` `AsyncAuthorizerBase`) so high-impact tools pause until a human approves or vetoes the request out-of-band.
- Uses a **deterministic local responder** instead of an LLM. No model API key is required. The responder is labelled in the UI and API as such.

## What the agent can do

| User says | Risk | What happens |
| --- | --- | --- |
| “What’s on my calendar?” | Safe | Token Vault → Google Calendar list. No CIBA. |
| “Schedule a meeting with the CEO” | High-impact | CIBA push/email. On approve, Token Vault → create the event. On veto, nothing is created. |
| “Delete all unread emails” | High-impact | CIBA. On approve, Token Vault fetches a Gmail token and reports the unread count. The demo does not call `messages.batchDelete`. |

## Run

```bash
cp .env.example .env
npm install
npm start
```

Open [http://localhost:3847](http://localhost:3847).

The tenant domain field matches the existing SPA config in `../auth0-login-flow` (`VITE_AUTH0_DOMAIN` / `YOUR_AUTH0_APP_DOMAIN`). Until you complete the dashboard steps in `SETUP_NEEDED.md` and put real values in `.env`, the app starts in **`AUTH0_DEMO_MODE`**. In that mode Auth0 HTTP calls are mocked and clearly labelled. The Approve / Veto buttons in the page are a stand-in for Guardian push.

To talk to a live tenant:

1. Follow `SETUP_NEEDED.md`.
2. Fill in `.env` (never commit it).
3. Set `AUTH0_DEMO_MODE=false`.

## Tests

```bash
npm test
# or, to write the real runner output:
npm run test:report
```

Tests use the real `@auth0/ai` authorizer classes and mock Auth0/Google network calls. They do not invent pass/fail counts — see `reports/test-output.txt` after you run them.

## Layout

- `src/agent/local-responder.ts` — deterministic intent mapper (not an LLM)
- `src/auth0/token-vault.ts` — Token Vault wrapper around `@auth0/ai/TokenVault`
- `src/auth0/ciba.ts` — CIBA wrapper around `@auth0/ai/AsyncAuthorization`
- `src/auth0/demo-network.ts` — labelled Auth0 HTTP mock used in demo mode and tests
- `src/tools/tools.ts` — calendar list (Token Vault) and high-impact tools (CIBA then Token Vault)
- `SETUP_NEEDED.md` — Auth0 dashboard steps this repo cannot perform for you
