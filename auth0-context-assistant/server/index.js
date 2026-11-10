import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authMiddleware, isDemoMode } from "./auth.js";
import { getSettings, updateSettings } from "./settingsStore.js";
import { handleUtterance } from "./agent.js";
import { isConfigured as tokenVaultConfigured } from "./tokenVault.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const port = Number(process.env.PORT || 3001);
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5174";
const allowedOrigins = new Set(
  [origin, "http://localhost:5174", "http://127.0.0.1:5174"].filter(Boolean)
);

app.use(cors({ origin: (o, cb) => cb(null, !o || allowedOrigins.has(o)), credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    demoMode: isDemoMode(),
    auth0Domain: process.env.AUTH0_DOMAIN,
    audience: process.env.AUTH0_AUDIENCE,
    tokenVaultConfigured: tokenVaultConfigured(),
  });
});

app.use("/api", authMiddleware());

app.get("/api/me", (req, res) => {
  res.json({ user: req.user, settings: getSettings(req.user.sub) });
});

app.get("/api/me/settings", (req, res) => {
  res.json(getSettings(req.user.sub));
});

app.put("/api/me/settings", (req, res) => {
  res.json(updateSettings(req.user.sub, req.body || {}));
});

app.post("/api/assistant/message", async (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const accessToken = header.startsWith("Bearer ") ? header.slice(7) : "";
    const result = await handleUtterance({
      user: req.user,
      message: req.body?.message || "",
      accessToken,
    });
    res.json({
      user: req.user,
      responder: "deterministic-local",
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Assistant failed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, "127.0.0.1", () => {
    console.log(
      `context-assistant API on http://127.0.0.1:${port} (demo=${isDemoMode()} tokenVault=${tokenVaultConfigured()})`
    );
  });
}

export default app;
