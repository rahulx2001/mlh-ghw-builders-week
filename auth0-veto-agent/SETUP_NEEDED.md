# Auth0 dashboard setup

This project cannot complete these steps for you. They require an Auth0 tenant
with Token Vault and CIBA (CIBA needs an Enterprise plan or the appropriate
add-on — see [Auth0 Pricing](https://auth0.com/pricing) and
[Configure CIBA](https://auth0.com/docs/get-started/applications/configure-client-initiated-backchannel-authentication)).

Reuse the **same tenant domain** as the existing SPA in
`../auth0-login-flow` (`VITE_AUTH0_DOMAIN`). Create a **new confidential Regular
Web Application** for this agent; do not turn the public SPA into a CIBA/Token
Vault client. The SPA client’s `token_endpoint_auth_method` is `none`, and
Auth0 only allows CIBA and Token Vault on first-party, confidential, OIDC-conformant clients.

## 1. Application (confidential client)

1. Open [Auth0 Dashboard](https://manage.auth0.com/) → **Applications > Applications > Create Application**.
2. Name it `mlh-ghw-veto-agent`. Choose **Regular Web Applications**. Click **Create**.
3. **Settings**:
   - Copy **Domain**, **Client ID**, and **Client Secret** into `.env` as
     `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET`.
   - **Allowed Callback URLs**: `http://localhost:3847/callback`
   - **Allowed Logout URLs**: `http://localhost:3847`
   - **Allowed Web Origins**: `http://localhost:3847`
   - Save.
4. **Settings > Advanced Settings > Grant Types**. Enable and save:
   - Authorization Code
   - Refresh Token
   - Client Credentials (if you also call the Management API)
   - **Client Initiated Backchannel Authentication (CIBA)**
     (`urn:openid:params:grant-type:ciba`)
   - **Token Vault**
     (`urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`)
5. After CIBA is enabled, open the application’s **Client Initiated Backchannel Authentication (CIBA)** settings and enable the **Guardian mobile push** notification channel. Use a `requested_expiry` of 300 seconds or lower (this app requests 300) so Auth0 selects push rather than email. Enable email only if you have that add-on and want the longer-lived channel.

## 2. API audience and scopes

1. **Applications > APIs > Create API**.
2. Name: `Veto Agent API`. Identifier: `https://veto-agent.example.com` (must match `AUTH0_AUDIENCE`).
3. **Permissions** — add:
   - `calendar:write` — create calendar events after approval
   - `mail:delete` — authorize bulk mail deletion after approval
4. Authorize the `mlh-ghw-veto-agent` application to request these permissions (application **APIs** / API access tab, or the API’s **Machine to Machine Applications** tab as applicable).

## 3. Guardian (or another authenticator) for out-of-band consent

1. **Security > Multi-factor Auth**.
2. Enable **Push Notification** using **Auth0 Guardian**.
3. Enroll the approving user:
   - **User Management > Users** → open the user → **Multi-factor Authentication** → **Send an enrolment invitation**, or have them enroll during login while MFA is required.
   - Install the Auth0 Guardian app on their phone and scan the QR code.
4. Copy that user’s `user_id` (for example `auth0|…`) into `AUTH0_USER_ID`. CIBA addresses this user, not whoever typed in the chat.
5. Note: retrieving Token Vault tokens can fail if the tenant MFA policy is set to **Always**. Auth0 documents setting MFA to **Never** for Token Vault retrieval, and using **Customize MFA Factors using Actions** plus `event.transaction.protocol` if you still want MFA on interactive logins. See [Configure Token Vault](https://auth0.com/docs/secure/tokens/token-vault/configure-token-vault).

## 4. Token Vault and Connected Accounts (Google)

1. **Authentication > Social** (or **Authentication > Enterprise**) → create or open **Google** (`google-oauth2`).
2. Enable **Connected Accounts for Token Vault** / Token Vault on that connection. See [Connected Accounts for Token Vault](https://auth0.com/docs/secure/tokens/token-vault/connected-accounts-for-token-vault) and [Configure Token Vault](https://auth0.com/docs/secure/tokens/token-vault/configure-token-vault).
3. In the Google Cloud console for the OAuth client used by this connection, enable the **Google Calendar API** (and **Gmail API** if you want the unread-mail path against a live mailbox). Add the scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.modify` (optional, unread-mail tool)
4. Sign a user in through this connection and grant those scopes so Auth0 can store the Google tokens in Token Vault.
5. This agent uses the **refresh token exchange** documented for Token Vault. After the user signs in (authorization code + refresh token grants), put a current Auth0 **refresh token** for that user in `AUTH0_REFRESH_TOKEN`. The SDK then posts:
   - `grant_type=urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token`
   - `subject_token_type=urn:ietf:params:oauth:token-type:refresh_token`
   - `requested_token_type=http://auth0.com/oauth/token-type/federated-connection-access-token`
   - `connection=google-oauth2`

Set `AUTH0_CONNECTION=google-oauth2` unless you chose a different connection name.

## 5. Turn off demo mode

In `.env`:

```
AUTH0_DEMO_MODE=false
```

Restart `npm start`. High-impact tools will call `/bc-authorize` and poll `/oauth/token` until the enrolled device approves or vetoes the request. The in-page Approve / Veto buttons are disabled outside demo mode.

## References

- [The Veto Agent challenge](https://www.mlh.com/events/global-hack-week-builders-week/challenges/01a1ad3c-362d-ef98-556d-3c5b44e1551a)
- [Asynchronous Authorization](https://auth0.com/ai/docs/intro/asynchronous-authorization)
- [Configure CIBA](https://auth0.com/docs/get-started/applications/configure-client-initiated-backchannel-authentication)
- [Mobile push notifications with CIBA](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow/mobile-push-notifications-with-ciba)
- [Token Vault](https://auth0.com/ai/docs/intro/token-vault)
- [Configure Token Vault](https://auth0.com/docs/secure/tokens/token-vault/configure-token-vault)
- [@auth0/ai](https://www.npmjs.com/package/@auth0/ai)
