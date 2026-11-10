import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { _resetStore } from "../server/settingsStore.js";

process.env.AUTH_DEMO = "1";
process.env.AUTH0_DOMAIN = "dev-6eodd480pubdklld.us.auth0.com";
process.env.AUTH0_AUDIENCE = "https://mlh-ghw-context-assistant-api";
process.env.PORT = "0";
process.env.NODE_ENV = "test";

const { default: app } = await import("../server/index.js");

function listen() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function request(server, { method = "GET", path, body, token }) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json;
          try { json = JSON.parse(raw); } catch { json = raw; }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

beforeEach(() => _resetStore());

test("health is public and reports demo mode", async () => {
  const server = await listen();
  const res = await request(server, { path: "/api/health" });
  server.close();
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json.demoMode, true);
  assert.equal(res.json.tokenVaultConfigured, false);
});

test("settings require authentication when demo mode is off", async () => {
  const prev = process.env.AUTH_DEMO;
  process.env.AUTH_DEMO = "0";
  const server = await listen();
  const res = await request(server, { path: "/api/me/settings" });
  server.close();
  process.env.AUTH_DEMO = prev;
  assert.equal(res.status, 401);
});

test("demo bearer can read settings and complete a weather conversation", async () => {
  const server = await listen();
  const settings = await request(server, { path: "/api/me/settings", token: "demo-token" });
  assert.equal(settings.status, 200);
  assert.equal(settings.json.homeCity, "Bengaluru");

  const turn = await request(server, {
    method: "POST",
    path: "/api/assistant/message",
    token: "demo-token",
    body: { message: "What's the weather like for my usual city?" },
  });
  server.close();
  assert.equal(turn.status, 200);
  assert.equal(turn.json.responder, "deterministic-local");
  assert.match(turn.json.reply, /Bengaluru/);
  assert.match(turn.json.reply, /Open-Meteo third-party API/);
  const names = turn.json.tools.map((t) => t.name);
  assert.ok(names.includes("first_party_settings"));
  assert.ok(names.includes("third_party_weather"));
  assert.equal(typeof turn.json.weather.temperature, "number");
});
