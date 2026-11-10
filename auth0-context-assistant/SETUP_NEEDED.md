# Auth0 dashboard steps still needed

The tenant domain is already known from the existing login-flow app:

`dev-6eodd480pubdklld.us.auth0.com`

The code is written against the real Auth0 SPA SDK (`@auth0/auth0-react`), real JWKS JWT validation (`jose`), and the official Auth0 Token Vault access-token exchange. These dashboard steps cannot be completed from this environment (no Auth0 Management session in this task). After you finish them, copy values into `.env` (from `.env.example`), set `AUTH_DEMO=0` and `VITE_AUTH_DEMO=0`, and restart.

Until then, `AUTH_DEMO=1` runs a **labelled local mock login** so tests and a screenshot can run.

## 1. SPA application (Universal Login)

1. Open [Auth0 Dashboard](https://manage.auth0.com/) → **Applications** → **Applications**.
2. Either reuse the existing Single Page Web Application used for `auth0-login-flow`, or click **Create Application**, name it `mlh-ghw-context-assistant`, choose **Single Page Web Applications**, and click **Create**.
3. On the **Settings** tab, copy **Domain** (should already be `dev-6eodd480pubdklld.us.auth0.com`) and **Client ID**.
4. Add these URLs, then **Save Changes**:
   - Allowed Callback URLs: `http://localhost:5174`
   - Allowed Logout URLs: `http://localhost:5174`
   - Allowed Web Origins: `http://localhost:5174`
5. Put the Client ID in `.env` as `AUTH0_CLIENT_ID` and `VITE_AUTH0_CLIENT_ID`.

## 2. First-party API (audience for the user access token)

1. Go to **Applications** → **APIs** → **Create API**.
2. Name: `Context Assistant API`.
3. Identifier (Audience): `https://mlh-ghw-context-assistant-api` (must match `AUTH0_AUDIENCE` / `VITE_AUTH0_AUDIENCE`).
4. Signing Algorithm: RS256. Click **Create**.
5. Open the **Permissions** tab and add a permission, for example:
   - `read:settings` — “Read the signed-in user's profile settings”
   - `write:settings` — “Update the signed-in user's profile settings”

The SPA already requests this audience in `authorizationParams.audience`, and the server verifies JWTs against this audience and the tenant JWKS.

## 3. Token Vault (for delegated third-party APIs such as Google)

Weather in this app uses the public Open-Meteo API and does not need Token Vault. Token Vault is implemented for a delegated connection (default `google-oauth2`) when the user asks the assistant to use a connected account. To turn the exchange on for real:

1. Configure **Connected Accounts for Token Vault** on a supported social connection (for example Google):
   - **Authentication** → **Social** → **Google**, enable the connection, and complete the Token Vault / Connected Accounts setup for that connection as described in [Configure Token Vault](https://auth0.com/docs/secure/call-apis-on-users-behalf/token-vault/configure-token-vault).
2. Create (or confirm) the backend API from step 2.
3. On that API, click **Add Application** to create a **Custom API Client** linked to `https://mlh-ghw-context-assistant-api`. Open **Configure Application**.
   - Application Type should be **Custom API Client**.
   - Under **Advanced Settings** → **Grant Types**, enable **Token Vault** (`urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`) if it is not already enabled. Save.
4. Copy the Custom API Client's **Client ID** and **Client Secret** into `.env` as `TOKEN_VAULT_CLIENT_ID` and `TOKEN_VAULT_CLIENT_SECRET`.
5. Set `TOKEN_VAULT_CONNECTION=google-oauth2` (or the connection name you enabled).
6. Have the signed-in user complete the Connected Accounts flow so Token Vault holds a federated token for that connection.

The backend exchange is `POST https://dev-6eodd480pubdklld.us.auth0.com/oauth/token` with:

- `grant_type`: `urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`
- `subject_token_type`: `urn:ietf:params:oauth:token-type:access_token`
- `requested_token_type`: `http://auth0.com/oauth/token-type/federated-connection-access-token`
- `subject_token`: the user's Auth0 access token
- `connection`: `TOKEN_VAULT_CONNECTION`
- `client_id` / `client_secret`: the Custom API Client

If those credentials are missing, the server returns a **labelled local mock** (`source: local_mock_fallback`) instead of calling Auth0, so tests still run.

## 4. Switch off demo mode

```bash
# in .env
AUTH_DEMO=0
VITE_AUTH_DEMO=0
```

Restart the API and Vite dev server, open http://localhost:5174, and log in with Universal Login.
