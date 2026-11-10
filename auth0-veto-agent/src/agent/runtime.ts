import { randomUUID } from "node:crypto";
import { createCibaAuthorizer } from "../auth0/ciba.js";
import {
  DEMO_LABEL,
  config,
  isDemoMode,
} from "../config.js";
import {
  createDemoNetworkState,
  decideDemoRequest,
  installDemoAuth0Network,
  type DemoNetworkState,
} from "../auth0/demo-network.js";
import { createTokenVaultAuthorizer } from "../auth0/token-vault.js";
import { HELP_TEXT, classifyRequest, type ClassifiedRequest } from "./local-responder.js";
import { buildTools, type ToolOutcome } from "../tools/tools.js";

export type ChatMessage = {
  role: "user" | "agent" | "system";
  text: string;
  at: string;
};

export type PendingApproval = {
  toolCallID: string;
  toolName: string;
  bindingMessage: string;
  authReqId?: string;
  status: "pending";
};

export type ThreadState = {
  id: string;
  messages: ChatMessage[];
  pending: PendingApproval | null;
};

export type VetoRuntime = {
  demo: DemoNetworkState | null;
  calendarVault: ReturnType<typeof createTokenVaultAuthorizer>;
  gmailVault: ReturnType<typeof createTokenVaultAuthorizer>;
  ciba: ReturnType<typeof createCibaAuthorizer>;
};

export function createRuntime(): VetoRuntime {
  let demo: DemoNetworkState | null = null;
  if (isDemoMode) {
    demo = createDemoNetworkState();
    installDemoAuth0Network(demo);
  }

  return {
    demo,
    calendarVault: createTokenVaultAuthorizer({
      scopes: config.googleCalendarScopes,
    }),
    gmailVault: createTokenVaultAuthorizer({
      scopes: config.gmailScopes,
    }),
    ciba: createCibaAuthorizer(),
  };
}

export type HandleResult = {
  thread: ThreadState;
  classification: ClassifiedRequest;
  outcome: ToolOutcome | null;
  demoMode: boolean;
  responder: string;
};

export function createThreadStore() {
  const threads = new Map<string, ThreadState>();

  function getOrCreate(id?: string): ThreadState {
    const threadId = id || randomUUID();
    const existing = threads.get(threadId);
    if (existing) return existing;
    const created: ThreadState = { id: threadId, messages: [], pending: null };
    threads.set(threadId, created);
    return created;
  }

  return { getOrCreate, threads };
}

export function createAgent(runtime: VetoRuntime) {
  const store = createThreadStore();
  const tools = buildTools(runtime);

  async function runTool(
    thread: ThreadState,
    classification: ClassifiedRequest,
    toolCallID: string,
  ): Promise<ToolOutcome> {
    const input = {
      threadID: thread.id,
      toolCallID,
      toolName: classification.toolName ?? "unknown",
      bindingMessage: classification.bindingMessage ?? undefined,
    };

    if (classification.intent === "list_calendar") {
      return tools.list_calendar(input);
    }
    if (classification.intent === "schedule_ceo_meeting") {
      return tools.schedule_ceo_meeting(input);
    }
    if (classification.intent === "delete_unread_emails") {
      return tools.delete_unread_emails(input);
    }
    throw new Error("No tool for this intent");
  }

  function push(thread: ThreadState, role: ChatMessage["role"], text: string) {
    thread.messages.push({ role, text, at: new Date().toISOString() });
  }

  async function handleMessage(threadId: string | undefined, message: string): Promise<HandleResult> {
    const thread = store.getOrCreate(threadId);
    const classification = classifyRequest(message);
    push(thread, "user", message);

    if (classification.intent === "help") {
      push(thread, "agent", HELP_TEXT);
      return {
        thread,
        classification,
        outcome: null,
        demoMode: isDemoMode,
        responder: DEMO_LABEL,
      };
    }

    if (classification.intent === "unknown" || !classification.toolName) {
      push(thread, "agent", `${classification.reason} ${HELP_TEXT}`);
      return {
        thread,
        classification,
        outcome: null,
        demoMode: isDemoMode,
        responder: DEMO_LABEL,
      };
    }

    const toolCallID = randomUUID();
    const outcome = await runTool(thread, classification, toolCallID);

    if (outcome.status === "pending") {
      thread.pending = {
        toolCallID,
        toolName: outcome.toolName,
        bindingMessage: classification.bindingMessage ?? outcome.summary,
        authReqId: outcome.authReqId,
        status: "pending",
      };
      push(
        thread,
        "agent",
        `${outcome.summary} Binding message: “${classification.bindingMessage}”.${
          isDemoMode
            ? " Demo mode: use Approve or Veto in this window (stand-in for Guardian push)."
            : " Check the Guardian app or the CIBA email on your enrolled device."
        }`,
      );
    } else {
      thread.pending = null;
      push(thread, "agent", outcome.summary);
    }

    return {
      thread,
      classification,
      outcome,
      demoMode: isDemoMode,
      responder: DEMO_LABEL,
    };
  }

  async function resume(threadId: string): Promise<HandleResult> {
    const thread = store.getOrCreate(threadId);
    if (!thread.pending) {
      return {
        thread,
        classification: classifyRequest("help"),
        outcome: null,
        demoMode: isDemoMode,
        responder: DEMO_LABEL,
      };
    }

    const classification = classifyRequest(thread.pending.bindingMessage);
    const outcome = await runTool(thread, classification, thread.pending.toolCallID);

    if (outcome.status !== "pending") {
      thread.pending = null;
      push(thread, "agent", outcome.summary);
    }

    return {
      thread,
      classification,
      outcome,
      demoMode: isDemoMode,
      responder: DEMO_LABEL,
    };
  }

  function decide(threadId: string, decision: "approved" | "denied") {
    const thread = store.getOrCreate(threadId);
    if (!runtime.demo) {
      throw new Error(
        "Approve/Veto buttons are a demo-mode stand-in for Guardian. With a live tenant, decide on the enrolled device.",
      );
    }
    if (!thread.pending?.authReqId) {
      throw new Error("There is no pending CIBA request to decide.");
    }
    decideDemoRequest(runtime.demo, thread.pending.authReqId, decision);
    return thread;
  }

  return { handleMessage, resume, decide, store };
}

export const agentMeta = {
  name: "The Veto Agent",
  responder: DEMO_LABEL,
  demoMode: isDemoMode,
  tenantDomain: config.domain,
  connection: config.connection,
  audience: config.audience,
};
