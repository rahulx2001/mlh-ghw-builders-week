# Setup needed for a hosted Auth0 FGA store

Local tests do **not** require this file. They start the OpenFGA binary (when present) or fall back to the labelled in-memory checker.

Use these steps when you want the same app to talk to Auth0 FGA in the cloud.

## 1. Create an Auth0 FGA store

1. Open [https://dashboard.fga.dev](https://dashboard.fga.dev) and sign in.
2. Create a store, for example `privacy-aware-rag`.
3. Copy the **Store ID**. That becomes `FGA_STORE_ID`.
4. Note the API URL for your region, commonly:
   - US: `https://api.us1.fga.dev`
   - EU: `https://api.eu1.fga.dev`
   - AU: `https://api.au1.fga.dev`
   This becomes `FGA_API_URL`.

## 2. Create client credentials

1. In the store, open **Settings** → **Authorized Clients**.
2. Create a client with permission to read and write.
3. Copy the client ID and client secret into your local `.env` (never commit them):

```
FGA_API_URL=https://api.us1.fga.dev
FGA_STORE_ID=01H...
FGA_MODEL_ID=
FGA_AUTH_MODE=client_credentials
FGA_API_TOKEN_ISSUER=auth.fga.dev
FGA_API_AUDIENCE=https://api.us1.fga.dev/
FGA_CLIENT_ID=
FGA_CLIENT_SECRET=
```

For a local OpenFGA process, keep `FGA_AUTH_MODE=none` and omit the client fields.

## 3. Write the authorization model

Paste `fga/model.fga` into the Auth0 FGA dashboard model editor, or write it via the SDK (`npm run seed:fga` against a local server, or `OpenFgaClient.writeAuthorizationModel` against the cloud API using `fga/model.json`).

Copy the resulting **Authorization Model ID** into `FGA_MODEL_ID`.

## 4. Write the sample tuples

Load `fga/tuples.json`. These tuples encode the demo:

- `user:alice` is `assignee` of `role:manager` and `member` of `department:finance`
- `user:bob` is `assignee` of `role:employee` and `member` of `department:engineering`
- `role:manager#assignee` is `viewer` of `document:salary_band_2026`, `document:exec_compensation`, and `document:budget_Q4`
- each department `#member` is `viewer` of `document:employee_handbook`
- `department:legal#member` is `viewer` of `document:legal_retention_policy`

You can write them from the dashboard **Tuples** page or:

```ts
await client.write({ writes: tuples });
```

## 5. Confirm a check

Expected results after seeding:

- `user:alice` `can_view` `document:salary_band_2026` → allow
- `user:bob` `can_view` `document:salary_band_2026` → deny
- `user:alice` `can_view` `document:budget_Q4` → allow

Then run `npm start` with the `.env` values above. The factory in `src/fga/factory.ts` will use `@openfga/sdk` against that store.
