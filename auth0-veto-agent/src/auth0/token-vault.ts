import { TokenVaultAuthorizerBase } from "@auth0/ai/TokenVault";
import { getAccessTokenFromTokenVault } from "@auth0/ai/TokenVault";
import { MemoryStore } from "@auth0/ai/stores";
import {
  DEMO_REFRESH_TOKEN,
  config,
  isDemoMode,
} from "../config.js";
import type { ToolCallInput } from "./types.js";

export { getAccessTokenFromTokenVault };

class VetoTokenVaultAuthorizer extends TokenVaultAuthorizerBase<[ToolCallInput]> {}

export function createTokenVaultAuthorizer(options?: {
  refreshToken?: string;
  scopes?: string[];
}) {
  const refreshToken =
    options?.refreshToken ||
    config.refreshToken ||
    (isDemoMode ? DEMO_REFRESH_TOKEN : "");

  return new VetoTokenVaultAuthorizer(
    {
      domain: config.domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret || (isDemoMode ? "demo-client-secret" : undefined),
    },
    {
      refreshToken: async () => refreshToken,
      connection: config.connection,
      scopes: options?.scopes ?? config.googleCalendarScopes,
      store: new MemoryStore(),
    },
  );
}

export function wrapWithTokenVault<T>(
  authorizer: VetoTokenVaultAuthorizer,
  execute: (input: ToolCallInput) => Promise<T>,
) {
  return authorizer.protect((input) => ({
    threadID: input.threadID,
    toolCallID: input.toolCallID,
    toolName: input.toolName,
  }), execute);
}
