import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface LocalOpenFgaHandle {
  apiUrl: string;
  process: ChildProcess;
  binPath: string;
}

function findOpenFgaBinary(): string | undefined {
  const candidates = [
    process.env.OPENFGA_BIN,
    join(rootDir, "bin", "openfga"),
    "/tmp/openfga-dl/openfga",
    "openfga",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === "openfga" || existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a free port"));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForHealth(url: string, timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${url}/healthz`);
      if (response.ok) return;
      lastError = new Error(`healthz status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`OpenFGA did not become healthy at ${url}: ${String(lastError)}`);
}

export async function startLocalOpenFga(): Promise<LocalOpenFgaHandle> {
  const binPath = findOpenFgaBinary();
  if (!binPath) {
    throw new Error("OpenFGA binary not found");
  }

  const httpPort = await getFreePort();
  const grpcPort = await getFreePort();
  const playgroundPort = await getFreePort();
  const child = spawn(
    binPath,
    [
      "run",
      "--playground-enabled=true",
      `--playground-port=${playgroundPort}`,
      `--http-addr=127.0.0.1:${httpPort}`,
      `--grpc-addr=127.0.0.1:${grpcPort}`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const apiUrl = `http://127.0.0.1:${httpPort}`;
  const stderr: string[] = [];
  child.stderr?.on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  try {
    await waitForHealth(apiUrl);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${String(error)}\n${stderr.join("")}`);
  }

  return { apiUrl, process: child, binPath };
}

export function stopLocalOpenFga(handle: LocalOpenFgaHandle): void {
  if (!handle.process.killed) {
    handle.process.kill("SIGTERM");
  }
}
