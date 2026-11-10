import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));

function readSiblingSpaDomain(): string | undefined {
  const examplePath = resolve(here, "../../auth0-login-flow/.env.example");
  try {
    const text = readFileSync(examplePath, "utf8");
    const match = text.match(/^VITE_AUTH0_DOMAIN=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const siblingDomain = readSiblingSpaDomain();
const placeholderDomain = "YOUR_AUTH0_APP_DOMAIN";

export const config = {
  port: Number(process.env.PORT ?? 3847),
  domain: process.env.AUTH0_DOMAIN || siblingDomain || placeholderDomain,
  clientId: process.env.AUTH0_CLIENT_ID || "YOUR_AUTH0_APP_CLIENT_ID",
  clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
  audience: process.env.AUTH0_AUDIENCE || "https://veto-agent.example.com",
  userId: process.env.AUTH0_USER_ID || "auth0|demo-user",
  refreshToken: process.env.AUTH0_REFRESH_TOKEN || "",
  connection: process.env.AUTH0_CONNECTION || "google-oauth2",
  googleCalendarScopes: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  gmailScopes: ["https://www.googleapis.com/auth/gmail.modify"],
  cibaScopes: ["openid", "calendar:write", "mail:delete"],
};

const explicitDemo = process.env.AUTH0_DEMO_MODE === "true";
const missingCredentials =
  !process.env.AUTH0_CLIENT_SECRET ||
  process.env.AUTH0_DOMAIN === placeholderDomain ||
  !process.env.AUTH0_DOMAIN ||
  process.env.AUTH0_DOMAIN === siblingDomain && siblingDomain === placeholderDomain;

export const isDemoMode = explicitDemo || missingCredentials;

export const DEMO_REFRESH_TOKEN = "demo-refresh-token";
export const DEMO_GOOGLE_ACCESS_TOKEN = "demo-google-access-token";
export const DEMO_CIBA_ACCESS_TOKEN = "demo-ciba-access-token";
export const DEMO_LABEL =
  "DETERMINISTIC LOCAL RESPONDER — no LLM is used. AUTH0_DEMO_MODE mocks Auth0 network calls.";
