/**
 * Auth0 Token Vault client (access-token exchange).
 *
 * Official exchange (Access Token Exchange with Token Vault):
 *   POST https://{domain}/oauth/token
 *   grant_type: urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token
 *
 * When Token Vault dashboard credentials are not configured, exchangeToken()
 * returns a clearly labelled local mock so tests and demo mode can run.
 * That mock is never treated as a real third-party token.
 */

export const TOKEN_VAULT_GRANT_TYPE =
  "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token";
export const TOKEN_VAULT_SUBJECT_TOKEN_TYPE =
  "urn:ietf:params:oauth:token-type:access_token";
export const TOKEN_VAULT_REQUESTED_TOKEN_TYPE =
  "http://auth0.com/oauth/token-type/federated-connection-access-token";

export function isConfigured(env = process.env) {
  return Boolean(
    env.AUTH0_DOMAIN &&
      env.TOKEN_VAULT_CLIENT_ID &&
      env.TOKEN_VAULT_CLIENT_SECRET &&
      env.TOKEN_VAULT_CONNECTION
  );
}

export function buildExchangeRequest({
  domain,
  clientId,
  clientSecret,
  subjectToken,
  connection,
}) {
  return {
    url: `https://${domain}/oauth/token`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      client_id: clientId,
      client_secret: clientSecret,
      subject_token: subjectToken,
      grant_type: TOKEN_VAULT_GRANT_TYPE,
      subject_token_type: TOKEN_VAULT_SUBJECT_TOKEN_TYPE,
      requested_token_type: TOKEN_VAULT_REQUESTED_TOKEN_TYPE,
      connection,
    },
  };
}

export async function exchangeToken(subjectToken, env = process.env, fetchImpl = fetch) {
  if (!isConfigured(env)) {
    return {
      ok: false,
      source: "local_mock_fallback",
      reason: "TOKEN_VAULT_NOT_CONFIGURED",
      message:
        "Token Vault client credentials are not set. Complete the dashboard steps in SETUP_NEEDED.md. Using a labelled local mock only so the rest of the app can be tested.",
      access_token: "mock-federated-connection-token",
      token_type: "Bearer",
      connection: env.TOKEN_VAULT_CONNECTION || "google-oauth2",
    };
  }

  const req = buildExchangeRequest({
    domain: env.AUTH0_DOMAIN,
    clientId: env.TOKEN_VAULT_CLIENT_ID,
    clientSecret: env.TOKEN_VAULT_CLIENT_SECRET,
    subjectToken,
    connection: env.TOKEN_VAULT_CONNECTION,
  });

  const res = await fetchImpl(req.url, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(req.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error_description || data.error || `Token Vault HTTP ${res.status}`);
    error.status = res.status;
    error.body = data;
    throw error;
  }
  return {
    ok: true,
    source: "auth0_token_vault",
    access_token: data.access_token,
    token_type: data.token_type || "Bearer",
    scope: data.scope,
    expires_in: data.expires_in,
    connection: env.TOKEN_VAULT_CONNECTION,
  };
}
