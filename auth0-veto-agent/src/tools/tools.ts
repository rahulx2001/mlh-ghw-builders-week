import { createCibaAuthorizer, describeCibaError, wrapWithCiba } from "../auth0/ciba.js";
import {
  createTokenVaultAuthorizer,
  getAccessTokenFromTokenVault,
  wrapWithTokenVault,
} from "../auth0/token-vault.js";
import type { ToolCallInput } from "../auth0/types.js";
import {
  countUnreadEmails,
  createCeoMeeting,
  listCalendarEvents,
} from "../integrations/google.js";

export type ToolOutcome =
  | {
      status: "completed";
      toolName: string;
      summary: string;
      data?: unknown;
    }
  | {
      status: "pending" | "vetoed" | "expired" | "error";
      toolName: string;
      summary: string;
      authReqId?: string;
    };

function asCibaOutcome(toolName: string, result: unknown): ToolOutcome {
  if (result && typeof result === "object" && "status" in result) {
    return result as ToolOutcome;
  }
  const described = describeCibaError(result);
  return {
    status: described.status,
    toolName,
    summary: described.message,
    authReqId: described.authReqId,
  };
}

export type ToolRuntime = {
  calendarVault: ReturnType<typeof createTokenVaultAuthorizer>;
  gmailVault: ReturnType<typeof createTokenVaultAuthorizer>;
  ciba: ReturnType<typeof createCibaAuthorizer>;
};

export function buildTools(runtime: ToolRuntime) {
  const listCalendarInner = wrapWithTokenVault(
    runtime.calendarVault,
    async () => {
      const token = getAccessTokenFromTokenVault();
      const events = await listCalendarEvents(token);
      return {
        status: "completed" as const,
        toolName: "list_calendar",
        summary:
          events.length === 0
            ? "Token Vault returned a Google Calendar token. There are no upcoming events."
            : `Token Vault returned a Google Calendar token. Upcoming events: ${events
                .map((event) => event.summary ?? "(no title)")
                .join("; ")}.`,
        data: { events, tokenSource: "auth0-token-vault" },
      };
    },
  );

  const afterCibaCreateMeeting = wrapWithTokenVault(
    runtime.calendarVault,
    async () => {
      const token = getAccessTokenFromTokenVault();
      return createCeoMeeting(token);
    },
  );

  const afterCibaCountMail = wrapWithTokenVault(runtime.gmailVault, async () => {
    const token = getAccessTokenFromTokenVault();
    return countUnreadEmails(token);
  });

  const scheduleCeo = wrapWithCiba(runtime.ciba, async (input: ToolCallInput) => {
    const event = await afterCibaCreateMeeting({
      ...input,
      toolCallID: `${input.toolCallID}:vault`,
      toolName: "schedule_ceo_meeting_write",
    });
    return {
      status: "completed" as const,
      toolName: "schedule_ceo_meeting",
      summary: `Approved. Created calendar event "${event.summary ?? "Meeting with the CEO"}"${
        event.htmlLink ? ` (${event.htmlLink})` : ""
      }.`,
      data: { event },
    };
  });

  const deleteUnread = wrapWithCiba(runtime.ciba, async (input: ToolCallInput) => {
    const count = await afterCibaCountMail({
      ...input,
      toolCallID: `${input.toolCallID}:vault`,
      toolName: "delete_unread_emails_write",
    });
    return {
      status: "completed" as const,
      toolName: "delete_unread_emails",
      summary: `Approved. Would delete ${count} unread email${count === 1 ? "" : "s"} using the Gmail token from Token Vault. This demo stops short of calling messages.batchDelete.`,
      data: { unreadCount: count, deleted: false },
    };
  });

  return {
    async list_calendar(input: ToolCallInput): Promise<ToolOutcome> {
      return listCalendarInner(input);
    },
    async schedule_ceo_meeting(input: ToolCallInput): Promise<ToolOutcome> {
      try {
        return asCibaOutcome("schedule_ceo_meeting", await scheduleCeo(input));
      } catch (err) {
        return asCibaOutcome("schedule_ceo_meeting", err);
      }
    },
    async delete_unread_emails(input: ToolCallInput): Promise<ToolOutcome> {
      try {
        return asCibaOutcome("delete_unread_emails", await deleteUnread(input));
      } catch (err) {
        return asCibaOutcome("delete_unread_emails", err);
      }
    },
  };
}
