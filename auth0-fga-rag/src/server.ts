import "dotenv/config";
import express from "express";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthorizationCheckerFromEnv, loadTuples } from "./fga/factory.ts";
import {
  OpenFgaSdkAuthorizationChecker,
  seedOpenFgaStore,
} from "./fga/openfga-sdk-client.ts";
import { startLocalOpenFga } from "./openfga-process.ts";
import { PrivacyAwareAssistant } from "./rag/assistant.ts";
import { loadDocuments, loadUsers } from "./rag/store.ts";
import type { AuthorizationChecker } from "./types.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3456);

async function resolveAuthorization(): Promise<{
  authz: AuthorizationChecker;
  cleanup?: () => void;
}> {
  if (process.env.FGA_API_URL && process.env.FGA_STORE_ID) {
    return { authz: createAuthorizationCheckerFromEnv() };
  }

  try {
    const handle = await startLocalOpenFga();
    const model = JSON.parse(readFileSync(join(rootDir, "fga", "model.json"), "utf8"));
    const seeded = await seedOpenFgaStore(handle.apiUrl, model, loadTuples());
    const authz = new OpenFgaSdkAuthorizationChecker(
      seeded.client,
      `openfga-sdk (@openfga/sdk) -> local OpenFGA ${handle.apiUrl}`
    );
    return {
      authz,
      cleanup: () => handle.process.kill("SIGTERM"),
    };
  } catch (error) {
    console.warn("Local OpenFGA was not started; using in-memory fallback.");
    console.warn(error);
    return { authz: createAuthorizationCheckerFromEnv() };
  }
}

const { authz, cleanup } = await resolveAuthorization();
const assistant = PrivacyAwareAssistant.create(authz);

const app = express();
app.use(express.json());
app.use(express.static(join(rootDir, "public")));

app.get("/api/meta", (_req, res) => {
  res.json({
    title: "Privacy-Aware RAG Bot",
    authorizationBackend: authz.backendName,
    responder: "deterministic-local",
    users: loadUsers(),
    documents: loadDocuments().map((doc) => ({
      id: doc.id,
      title: doc.title,
      department: doc.department,
      sensitivity: doc.sensitivity,
    })),
    sampleQueries: [
      "What is the L5 salary band?",
      "What is the Q4 engineering budget?",
      "How many PTO days do employees get?",
      "How long are customer contracts retained?",
      "What is the CEO target cash compensation?",
    ],
  });
});

app.post("/api/ask", async (req, res) => {
  const userId = String(req.body?.userId || "");
  const query = String(req.body?.query || "");
  if (!userId || !query) {
    res.status(400).json({ error: "userId and query are required" });
    return;
  }
  try {
    const result = await assistant.ask(userId, query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/compare", async (req, res) => {
  const query = String(req.query.query || "What is the L5 salary band?");
  const left = String(req.query.left || "alice");
  const right = String(req.query.right || "bob");
  const [leftResult, rightResult] = await Promise.all([
    assistant.ask(left, query),
    assistant.ask(right, query),
  ]);
  res.json({ query, left: leftResult, right: rightResult });
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Privacy-Aware RAG Bot listening on http://127.0.0.1:${port}`);
  console.log(`Authorization backend: ${authz.backendName}`);
  console.log("Responder: deterministic-local (not an LLM)");
});

function shutdown() {
  server.close();
  cleanup?.();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
