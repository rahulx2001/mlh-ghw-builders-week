import { AsyncAuthorizerBase } from "@auth0/ai/AsyncAuthorization";
import {
  AccessDeniedInterrupt,
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  AuthorizationRequestExpiredInterrupt,
} from "@auth0/ai/interrupts";
import { MemoryStore } from "@auth0/ai/stores";
import { config, isDemoMode } from "../config.js";
import type { ToolCallInput } from "./types.js";

export {
  AccessDeniedInterrupt,
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  AuthorizationRequestExpiredInterrupt,
};

class VetoAsyncAuthorizer extends AsyncAuthorizerBase<[ToolCallInput]> {}

export function createCibaAuthorizer(options?: { userId?: string }) {
  return new VetoAsyncAuthorizer(
    {
      domain: config.domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret || (isDemoMode ? "demo-client-secret" : undefined),
    },
    {
      userID: async (input) => input.userId ?? options?.userId ?? config.userId,
      bindingMessage: async (input) => input.bindingMessage ?? "Approve this agent action",
      scopes: config.cibaScopes,
      audience: config.audience,
      requestedExpiry: 300,
      onAuthorizationRequest: "interrupt",
      store: new MemoryStore(),
    },
  );
}

export function wrapWithCiba<T>(
  authorizer: VetoAsyncAuthorizer,
  execute: (input: ToolCallInput) => Promise<T>,
) {
  return authorizer.protect((input) => ({
    threadID: input.threadID,
    toolCallID: input.toolCallID,
    toolName: input.toolName,
  }), execute);
}

export function describeCibaError(err: unknown): {
  status: "pending" | "vetoed" | "expired" | "error";
  message: string;
  authReqId?: string;
} {
  if (err instanceof AuthorizationPendingInterrupt || err instanceof AuthorizationPollingInterrupt) {
    return {
      status: "pending",
      message:
        "Out-of-band CIBA request sent. Execution is halted until you approve or veto it on your enrolled device.",
      authReqId: err.request?.id,
    };
  }
  if (err instanceof AccessDeniedInterrupt) {
    return {
      status: "vetoed",
      message: "You vetoed this action. Nothing was changed.",
      authReqId: err.request?.id,
    };
  }
  if (err instanceof AuthorizationRequestExpiredInterrupt) {
    return {
      status: "expired",
      message: "The CIBA approval request expired before a decision was received.",
      authReqId: err.request?.id,
    };
  }
  if (err instanceof Error) {
    return { status: "error", message: err.message };
  }
  return { status: "error", message: "Unknown authorization error" };
}
