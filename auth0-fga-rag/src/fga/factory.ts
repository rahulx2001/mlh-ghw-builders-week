import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AuthorizationChecker, FgaTuple } from "../types.ts";
import { InMemoryAuthorizationChecker } from "./in-memory.ts";
import {
  createOpenFgaSdkClient,
  OpenFgaSdkAuthorizationChecker,
} from "./openfga-sdk-client.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadTuples(): FgaTuple[] {
  return JSON.parse(readFileSync(join(rootDir, "fga", "tuples.json"), "utf8"));
}

export function createAuthorizationCheckerFromEnv(
  env: NodeJS.ProcessEnv = process.env
): AuthorizationChecker {
  const apiUrl = env.FGA_API_URL;
  const storeId = env.FGA_STORE_ID;
  if (apiUrl && storeId) {
    const client = createOpenFgaSdkClient({
      apiUrl,
      storeId,
      authorizationModelId: env.FGA_MODEL_ID || undefined,
      authMode: (env.FGA_AUTH_MODE as "none" | "client_credentials") || "none",
      apiTokenIssuer: env.FGA_API_TOKEN_ISSUER,
      apiAudience: env.FGA_API_AUDIENCE,
      clientId: env.FGA_CLIENT_ID,
      clientSecret: env.FGA_CLIENT_SECRET,
    });
    return new OpenFgaSdkAuthorizationChecker(
      client,
      `openfga-sdk (@openfga/sdk) -> ${apiUrl}`
    );
  }

  return new InMemoryAuthorizationChecker(loadTuples());
}
