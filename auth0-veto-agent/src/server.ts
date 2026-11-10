import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { agentMeta, createAgent, createRuntime } from "./agent/runtime.js";
import { config, isDemoMode } from "./config.js";

const app = express();
app.use(express.json());

const runtime = createRuntime();
const agent = createAgent(runtime);
const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "public");

app.use(express.static(publicDir));

app.get("/api/meta", (_req, res) => {
  res.json({
    ...agentMeta,
    demoMode: isDemoMode,
    port: config.port,
  });
});

app.get("/api/threads/:id", (req, res) => {
  const thread = agent.store.getOrCreate(req.params.id);
  res.json({ thread, demoMode: isDemoMode });
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message ?? "");
  const threadId = req.body?.threadId ? String(req.body.threadId) : undefined;
  if (!message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }
  const result = await agent.handleMessage(threadId, message);
  res.json(result);
});

app.post("/api/threads/:id/poll", async (req, res) => {
  const result = await agent.resume(req.params.id);
  res.json(result);
});

app.post("/api/threads/:id/decide", async (req, res) => {
  const decision = req.body?.decision;
  if (decision !== "approved" && decision !== "denied") {
    res.status(400).json({ error: "decision must be approved or denied" });
    return;
  }
  try {
    agent.decide(req.params.id, decision);
    const result = await agent.resume(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "decide failed" });
  }
});

app.listen(config.port, () => {
  console.log(
    `Veto Agent listening on http://localhost:${config.port} (demoMode=${isDemoMode}, domain=${config.domain})`,
  );
});
