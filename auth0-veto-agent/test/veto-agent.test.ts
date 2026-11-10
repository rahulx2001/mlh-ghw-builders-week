/**
 * These tests exercise the real @auth0/ai TokenVaultAuthorizerBase and
 * AsyncAuthorizerBase classes. Auth0 HTTP is mocked (see src/auth0/demo-network.ts)
 * because this environment has no tenant credentials.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgent, createRuntime } from "../src/agent/runtime.js";

describe("veto agent (Auth0 SDK + mocked network)", () => {
  let restore: (() => void) | undefined;

  beforeEach(() => {
    process.env.AUTH0_DEMO_MODE = "true";
    process.env.AUTH0_DOMAIN = "demo-tenant.example.auth0.com";
    process.env.AUTH0_CLIENT_ID = "demo-client-id";
    process.env.AUTH0_CLIENT_SECRET = "demo-client-secret";
  });

  afterEach(() => {
    restore?.();
  });

  it("fetches calendar data through Token Vault without asking for CIBA", async () => {
    const runtime = createRuntime();
    const agent = createAgent(runtime);
    const result = await agent.handleMessage(undefined, "What's on my calendar?");

    expect(result.demoMode).toBe(true);
    expect(result.classification.highImpact).toBe(false);
    expect(result.outcome?.status).toBe("completed");
    expect(result.outcome?.summary).toMatch(/Token Vault returned a Google Calendar token/);
    expect(result.outcome?.summary).toMatch(/Team standup/);
    expect(result.thread.pending).toBeNull();
  });

  it("halts a high-impact action until CIBA approval, then executes", async () => {
    const runtime = createRuntime();
    const agent = createAgent(runtime);
    const first = await agent.handleMessage(
      undefined,
      "Schedule a meeting with the CEO",
    );

    expect(first.outcome?.status).toBe("pending");
    expect(first.thread.pending?.bindingMessage).toBe(
      "AI Agent wants to schedule a meeting with the CEO",
    );
    expect(first.thread.pending?.authReqId).toMatch(/^demo-auth-req-/);
    expect(first.outcome?.summary).toMatch(/halted|Out-of-band CIBA/i);

    const stillPending = await agent.resume(first.thread.id);
    expect(stillPending.outcome?.status).toBe("pending");

    agent.decide(first.thread.id, "approved");
    const approved = await agent.resume(first.thread.id);
    expect(approved.outcome?.status).toBe("completed");
    expect(approved.outcome?.summary).toMatch(/Approved\. Created calendar event/);
    expect(approved.thread.pending).toBeNull();
  });

  it("does not execute a high-impact action when the user vetoes it", async () => {
    const runtime = createRuntime();
    const agent = createAgent(runtime);
    const first = await agent.handleMessage(undefined, "Delete all unread emails");
    expect(first.outcome?.status).toBe("pending");

    agent.decide(first.thread.id, "denied");
    const vetoed = await agent.resume(first.thread.id);
    expect(vetoed.outcome?.status).toBe("vetoed");
    expect(vetoed.outcome?.summary).toMatch(/vetoed/i);
    expect(vetoed.outcome?.summary).not.toMatch(/Would delete/);
    expect(vetoed.thread.pending).toBeNull();
  });
});
