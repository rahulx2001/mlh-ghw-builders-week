import { describe, expect, it } from "vitest";
import { classifyRequest } from "../src/agent/local-responder.js";

describe("deterministic local responder", () => {
  it("maps calendar questions to the safe Token Vault tool", () => {
    const result = classifyRequest("What's on my calendar?");
    expect(result.intent).toBe("list_calendar");
    expect(result.highImpact).toBe(false);
    expect(result.toolName).toBe("list_calendar");
  });

  it("treats scheduling a CEO meeting as high-impact", () => {
    const result = classifyRequest("Please schedule a meeting with the CEO tomorrow");
    expect(result.intent).toBe("schedule_ceo_meeting");
    expect(result.highImpact).toBe(true);
    expect(result.bindingMessage).toBe(
      "AI Agent wants to schedule a meeting with the CEO",
    );
  });

  it("treats deleting unread email as high-impact", () => {
    const result = classifyRequest("Delete all unread emails");
    expect(result.intent).toBe("delete_unread_emails");
    expect(result.highImpact).toBe(true);
    expect(result.bindingMessage).toBe(
      "AI Agent wants to delete all unread emails",
    );
  });

  it("does not invent an intent for unrelated text", () => {
    const result = classifyRequest("Write a poem about coffee");
    expect(result.intent).toBe("unknown");
    expect(result.toolName).toBeNull();
  });
});
