/**
 * DETERMINISTIC LOCAL RESPONDER
 *
 * This replaces an LLM. It maps user text to a fixed set of tools with
 * regular expressions. No model API key is used or required.
 */

export type AgentIntent =
  | "list_calendar"
  | "schedule_ceo_meeting"
  | "delete_unread_emails"
  | "help"
  | "unknown";

export type ClassifiedRequest = {
  intent: AgentIntent;
  highImpact: boolean;
  toolName: string | null;
  bindingMessage: string | null;
  reason: string;
};

const PATTERNS: Array<{
  intent: Exclude<AgentIntent, "unknown">;
  highImpact: boolean;
  toolName: string | null;
  bindingMessage: string | null;
  reason: string;
  tests: RegExp[];
}> = [
  {
    intent: "list_calendar",
    highImpact: false,
    toolName: "list_calendar",
    bindingMessage: null,
    reason: "Read-only calendar lookup. Token Vault supplies the Google token; no CIBA veto is required.",
    tests: [
      /\b(calendar|agenda|schedule|events?)\b/i,
      /\bwhat('?s| is) on my (calendar|day|agenda)\b/i,
      /\b(show|list|fetch|check).*(events?|calendar|meetings?)\b/i,
    ],
  },
  {
    intent: "schedule_ceo_meeting",
    highImpact: true,
    toolName: "schedule_ceo_meeting",
    bindingMessage: "AI Agent wants to schedule a meeting with the CEO",
    reason: "Creating a meeting with the CEO is high-impact. Execution pauses for CIBA approval.",
    tests: [
      /\b(schedule|book|set up|create)\b.*\b(meeting|call|sync)\b.*\bceo\b/i,
      /\bmeeting with the ceo\b/i,
      /\bceo\b.*\b(meeting|call)\b/i,
    ],
  },
  {
    intent: "delete_unread_emails",
    highImpact: true,
    toolName: "delete_unread_emails",
    bindingMessage: "AI Agent wants to delete all unread emails",
    reason: "Bulk-deleting unread mail is high-impact. Execution pauses for CIBA approval.",
    tests: [
      /\bdelete all unread (emails|mail|messages)\b/i,
      /\b(wipe|clear|remove)\b.*\bunread\b/i,
      /\bdelete\b.*\bunread\b/i,
    ],
  },
  {
    intent: "help",
    highImpact: false,
    toolName: null,
    bindingMessage: null,
    reason: "The user asked what this agent can do.",
    tests: [/^\s*(help|hi|hello|\?)\s*$/i, /\bwhat can you (do|handle)\b/i],
  },
];

export function classifyRequest(message: string): ClassifiedRequest {
  const text = message.trim();
  const ordered = [...PATTERNS].sort((a, b) => Number(b.highImpact) - Number(a.highImpact));
  for (const pattern of ordered) {
    if (pattern.tests.some((re) => re.test(text))) {
      return {
        intent: pattern.intent,
        highImpact: pattern.highImpact,
        toolName: pattern.toolName,
        bindingMessage: pattern.bindingMessage,
        reason: pattern.reason,
      };
    }
  }
  return {
    intent: "unknown",
    highImpact: false,
    toolName: null,
    bindingMessage: null,
    reason: "No matching tool. Try a calendar lookup or a high-impact command.",
  };
}

export const HELP_TEXT = [
  "I am the Veto Agent. A deterministic local responder (not an LLM) maps your words to tools.",
  "Safe: “What’s on my calendar?” — Token Vault exchanges an Auth0 token for a Google Calendar token and lists events.",
  "High-impact: “Schedule a meeting with the CEO” or “Delete all unread emails” — CIBA asks you to approve or veto out-of-band before anything runs.",
].join(" ");
