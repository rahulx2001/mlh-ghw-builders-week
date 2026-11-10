import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";
import type { AuthorizationChecker, FgaTuple } from "../types.ts";

export interface OpenFgaConfig {
  apiUrl: string;
  storeId: string;
  authorizationModelId?: string;
  authMode?: "none" | "client_credentials";
  apiTokenIssuer?: string;
  apiAudience?: string;
  clientId?: string;
  clientSecret?: string;
}

export function createOpenFgaSdkClient(config: OpenFgaConfig): OpenFgaClient {
  const authMode = config.authMode ?? "none";
  if (authMode === "client_credentials") {
    return new OpenFgaClient({
      apiUrl: config.apiUrl,
      storeId: config.storeId,
      authorizationModelId: config.authorizationModelId,
      credentials: {
        method: CredentialsMethod.ClientCredentials,
        config: {
          apiTokenIssuer: config.apiTokenIssuer ?? "auth.fga.dev",
          apiAudience: config.apiAudience ?? "https://api.us1.fga.dev/",
          clientId: config.clientId ?? "",
          clientSecret: config.clientSecret ?? "",
        },
      },
    });
  }

  return new OpenFgaClient({
    apiUrl: config.apiUrl,
    storeId: config.storeId,
    authorizationModelId: config.authorizationModelId,
  });
}

/**
 * Production path: every check / list-objects / batch-check call goes through
 * the official @openfga/sdk client (works with local OpenFGA and Auth0 FGA).
 */
export class OpenFgaSdkAuthorizationChecker implements AuthorizationChecker {
  readonly backendName: string;
  private readonly client: OpenFgaClient;

  constructor(client: OpenFgaClient, label?: string) {
    this.client = client;
    this.backendName = label ?? "openfga-sdk (@openfga/sdk)";
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    const { allowed } = await this.client.check({
      user,
      relation,
      object,
    });
    return Boolean(allowed);
  }

  async batchCheck(
    checks: Array<{ user: string; relation: string; object: string }>
  ): Promise<boolean[]> {
    const withIds = checks.map((item, index) => ({
      ...item,
      // OpenFGA requires ^[\\w\\d-]{1,36}$
      correlationId: `chk${String(index).padStart(2, "0")}-${item.object.replace(/[^a-zA-Z0-9-]/g, "-").slice(-20)}`.slice(0, 36),
    }));

    const response = await this.client.batchCheck({
      checks: withIds.map((item) => ({
        user: item.user,
        relation: item.relation,
        object: item.object,
        correlationId: item.correlationId,
      })),
    });

    const byId = new Map<string, boolean>();
    for (const result of response.result ?? []) {
      if (result.correlationId) {
        byId.set(result.correlationId, Boolean(result.allowed));
      }
    }
    return withIds.map((item) => Boolean(byId.get(item.correlationId)));
  }

  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    const { objects } = await this.client.listObjects({
      user,
      relation,
      type,
    });
    return objects ?? [];
  }
}

export async function seedOpenFgaStore(
  apiUrl: string,
  model: { schema_version: string; type_definitions: unknown[] },
  tuples: FgaTuple[]
): Promise<{ storeId: string; modelId: string; client: OpenFgaClient }> {
  const bootstrap = new OpenFgaClient({ apiUrl });
  const store = await bootstrap.createStore({ name: `privacy-rag-${Date.now()}` });
  if (!store.id) {
    throw new Error("OpenFGA createStore did not return an id");
  }

  const client = new OpenFgaClient({ apiUrl, storeId: store.id });
  const written = await client.writeAuthorizationModel({
    schema_version: model.schema_version,
    type_definitions: model.type_definitions as never,
  });
  if (!written.authorization_model_id) {
    throw new Error("OpenFGA writeAuthorizationModel did not return a model id");
  }

  client.authorizationModelId = written.authorization_model_id;
  if (tuples.length > 0) {
    await client.write({
      writes: tuples.map((tuple) => ({
        user: tuple.user,
        relation: tuple.relation,
        object: tuple.object,
      })),
    });
  }

  return {
    storeId: store.id,
    modelId: written.authorization_model_id,
    client,
  };
}
