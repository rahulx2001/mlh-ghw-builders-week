/**
 * AUTH0_DEMO_MODE: intercepts Auth0 (and Google) HTTP calls so the app and
 * tests can run without tenant credentials. This is an explicit mock — not a
 * live Auth0 response.
 */
import {
  DEMO_CIBA_ACCESS_TOKEN,
  DEMO_GOOGLE_ACCESS_TOKEN,
  config,
} from "../config.js";

export type DemoDecision = "pending" | "approved" | "denied";

export type DemoNetworkState = {
  decisions: Map<string, DemoDecision>;
  authReqSeq: number;
};

export function createDemoNetworkState(): DemoNetworkState {
  return { decisions: new Map(), authReqSeq: 0 };
}

function parseBody(init?: RequestInit): Record<string, string> {
  const raw = init?.body;
  if (!raw) return {};
  const text = typeof raw === "string" ? raw : raw.toString();
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(json)) {
      if (value !== undefined && value !== null) out[key] = String(value);
    }
    return out;
  } catch {
    const params = new URLSearchParams(text);
    return Object.fromEntries(params.entries());
  }
}

function jsonResponse(status: number, body: unknown, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...extraHeaders,
    },
  });
}

export function installDemoAuth0Network(state: DemoNetworkState): () => void {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url.includes("/bc-authorize")) {
      state.authReqSeq += 1;
      const authReqId = `demo-auth-req-${state.authReqSeq}`;
      state.decisions.set(authReqId, "pending");
      return jsonResponse(200, {
        auth_req_id: authReqId,
        expires_in: 300,
        interval: 1,
      });
    }

    if (url.includes("/oauth/token") || url.includes("/oauth/token/")) {
      const body = parseBody(init);
      const grant = body.grant_type ?? "";

      if (
        grant ===
        "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token"
      ) {
        const scopes =
          body.connection === config.connection
            ? [
                ...config.googleCalendarScopes,
                ...config.gmailScopes,
              ].join(" ")
            : "openid";
        return jsonResponse(200, {
          access_token: DEMO_GOOGLE_ACCESS_TOKEN,
          token_type: "Bearer",
          expires_in: 3600,
          scope: scopes,
        });
      }

      if (
        grant === "urn:openid:params:grant-type:ciba" ||
        body.auth_req_id
      ) {
        const id = body.auth_req_id;
        const decision = state.decisions.get(id) ?? "pending";
        if (decision === "pending") {
          return jsonResponse(400, {
            error: "authorization_pending",
            error_description: "The user has not yet approved or vetoed this request.",
          });
        }
        if (decision === "denied") {
          return jsonResponse(400, {
            error: "access_denied",
            error_description: "The user vetoed this action.",
          });
        }
        return jsonResponse(200, {
          access_token: DEMO_CIBA_ACCESS_TOKEN,
          id_token: "demo-id-token",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "openid calendar:write mail:delete",
        });
      }
    }

    if (url.includes("googleapis.com/calendar")) {
      if (init?.method === "POST") {
        return jsonResponse(200, {
          id: "demo-event-1",
          summary: "Meeting with the CEO",
          htmlLink: "https://calendar.google.com/calendar/event?eid=demo",
          status: "confirmed",
        });
      }
      return jsonResponse(200, {
        items: [
          {
            id: "evt-standup",
            summary: "Team standup",
            start: { dateTime: "2026-11-11T09:30:00+05:30" },
            end: { dateTime: "2026-11-11T09:45:00+05:30" },
          },
          {
            id: "evt-design",
            summary: "Design review",
            start: { dateTime: "2026-11-11T14:00:00+05:30" },
            end: { dateTime: "2026-11-11T15:00:00+05:30" },
          },
        ],
      });
    }

    if (url.includes("googleapis.com/gmail")) {
      return jsonResponse(200, { resultSizeEstimate: 12, messages: [] });
    }

    return originalFetch(input as RequestInfo, init);
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

export function decideDemoRequest(
  state: DemoNetworkState,
  authReqId: string,
  decision: Exclude<DemoDecision, "pending">,
) {
  state.decisions.set(authReqId, decision);
}
