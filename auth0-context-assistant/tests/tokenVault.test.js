import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOKEN_VAULT_GRANT_TYPE,
  TOKEN_VAULT_REQUESTED_TOKEN_TYPE,
  TOKEN_VAULT_SUBJECT_TOKEN_TYPE,
  buildExchangeRequest,
  exchangeToken,
  isConfigured,
} from "../server/tokenVault.js";

test("isConfigured is false when client credentials are missing", () => {
  assert.equal(isConfigured({ AUTH0_DOMAIN: "example.us.auth0.com" }), false);
});

test("buildExchangeRequest matches the official Auth0 Token Vault access-token exchange", () => {
  const req = buildExchangeRequest({
    domain: "dev-6eodd480pubdklld.us.auth0.com",
    clientId: "vault-client",
    clientSecret: "vault-secret",
    subjectToken: "user-access-token",
    connection: "google-oauth2",
  });
  assert.equal(req.url, "https://dev-6eodd480pubdklld.us.auth0.com/oauth/token");
  assert.equal(req.method, "POST");
  assert.equal(req.body.grant_type, TOKEN_VAULT_GRANT_TYPE);
  assert.equal(req.body.subject_token_type, TOKEN_VAULT_SUBJECT_TOKEN_TYPE);
  assert.equal(req.body.requested_token_type, TOKEN_VAULT_REQUESTED_TOKEN_TYPE);
  assert.equal(req.body.subject_token, "user-access-token");
  assert.equal(req.body.connection, "google-oauth2");
  assert.equal(
    TOKEN_VAULT_GRANT_TYPE,
    "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token"
  );
});

test("exchangeToken uses a labelled local mock when Token Vault is not configured", async () => {
  const result = await exchangeToken("tok", { AUTH0_DOMAIN: "example.us.auth0.com" });
  assert.equal(result.ok, false);
  assert.equal(result.source, "local_mock_fallback");
  assert.equal(result.reason, "TOKEN_VAULT_NOT_CONFIGURED");
  assert.match(result.message, /SETUP_NEEDED/);
});

test("exchangeToken posts the official payload when configured", async () => {
  let captured;
  const fetchImpl = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      json: async () => ({ access_token: "ya29.real", token_type: "Bearer", expires_in: 3600 }),
    };
  };
  const env = {
    AUTH0_DOMAIN: "dev-6eodd480pubdklld.us.auth0.com",
    TOKEN_VAULT_CLIENT_ID: "cid",
    TOKEN_VAULT_CLIENT_SECRET: "secret",
    TOKEN_VAULT_CONNECTION: "google-oauth2",
  };
  const result = await exchangeToken("user-at", env, fetchImpl);
  assert.equal(result.ok, true);
  assert.equal(result.source, "auth0_token_vault");
  assert.equal(result.access_token, "ya29.real");
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.grant_type, TOKEN_VAULT_GRANT_TYPE);
  assert.equal(body.subject_token, "user-at");
  assert.equal(captured.url, "https://dev-6eodd480pubdklld.us.auth0.com/oauth/token");
});
