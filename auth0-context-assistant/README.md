# The Context-Preserving Assistant

MLH Global Hack Week: Builders Week — **The Context-Preserving Assistant (Focus: Full-Stack Identity & API Access)**.

A full-stack personal assistant that:

1. Authenticates the user with Auth0 **Universal Login** (`@auth0/auth0-react`).
2. Calls a **first-party API** with the user's access token to read profile settings (usual city, units, preferred name).
3. Calls a **third-party API** (Open-Meteo weather) using that setting, in the same conversation turn.
4. Implements Auth0 **Token Vault** access-token exchange against the official `/oauth/token` grant for delegated connections (for example Google). Dashboard steps that cannot be done here are listed in `SETUP_NEEDED.md`. A labelled local mock is used only when those credentials are absent, so tests can run.

The assistant itself is a **deterministic local responder**. No LLM API key is used or required.

Auth0 tenant (from the existing login-flow app): `dev-6eodd480pubdklld.us.auth0.com`.

## Success criteria

A single conversation where the agent references a user-specific setting from the first-party API and then performs a task using a third-party API, all secured by the initial user authentication.

Suggested prompt after sign-in: **What's the weather like for my usual city?**

The reply cites the saved `homeCity` and units, then the Open-Meteo conditions for that city. The UI also lists the tool calls (`first_party_settings`, `third_party_weather`).

## Setup

```bash
cp .env.example .env
# Follow SETUP_NEEDED.md, then fill AUTH0_CLIENT_ID / VITE_AUTH0_CLIENT_ID.
# For a local walkthrough without dashboard changes, leave AUTH_DEMO=1 and VITE_AUTH_DEMO=1.
npm install
```

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run client
```

Open [http://localhost:5174](http://localhost:5174). In live mode, click **Log in with Auth0**. In demo mode a clearly labelled mock session is used.

## Tests

```bash
npm test
```

The API integration test performs the success-criteria conversation (settings + live Open-Meteo) under demo auth. Unit tests cover JWT/demo auth, the settings store, the official Token Vault request shape, and agent tool routing.

## Demo vs live Auth0

| Mode | How to enable | What it proves |
| --- | --- | --- |
| Demo (`AUTH_DEMO=1`) | Default in the local `.env` until dashboard setup is done | End-to-end assistant behaviour and tests, with a labelled mock login and a labelled Token Vault fallback |
| Live (`AUTH_DEMO=0`) | After `SETUP_NEEDED.md` | Real Universal Login, real JWT audience checks, optional real Token Vault exchange |
