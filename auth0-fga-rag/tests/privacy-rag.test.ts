import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { OpenFgaClient } from "@openfga/sdk";
import { InMemoryAuthorizationChecker } from "../src/fga/in-memory.ts";
import {
  OpenFgaSdkAuthorizationChecker,
  seedOpenFgaStore,
} from "../src/fga/openfga-sdk-client.ts";
import { startLocalOpenFga, stopLocalOpenFga, type LocalOpenFgaHandle } from "../src/openfga-process.ts";
import { PrivacyAwareAssistant } from "../src/rag/assistant.ts";
import { PrivacyAwareRetriever } from "../src/rag/retriever.ts";
import { DeterministicLocalResponder } from "../src/rag/responder.ts";
import { DocumentStore } from "../src/rag/store.ts";
import type { AuthorizationChecker, FgaTuple } from "../src/types.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const tuples: FgaTuple[] = JSON.parse(
  readFileSync(join(rootDir, "fga", "tuples.json"), "utf8")
);
const model = JSON.parse(readFileSync(join(rootDir, "fga", "model.json"), "utf8"));

let handle: LocalOpenFgaHandle | undefined;
let authz: AuthorizationChecker;
let backendUsed = "unset";

before(async () => {
  try {
    handle = await startLocalOpenFga();
    const seeded = await seedOpenFgaStore(handle.apiUrl, model, tuples);
    authz = new OpenFgaSdkAuthorizationChecker(
      seeded.client,
      `openfga-sdk (@openfga/sdk) -> local OpenFGA ${handle.apiUrl}`
    );
    backendUsed = authz.backendName;
    console.log(`TEST_AUTHZ_BACKEND=${backendUsed}`);
  } catch (error) {
    console.warn("Falling back to in-memory authorization checker:", error);
    authz = new InMemoryAuthorizationChecker(tuples);
    backendUsed = authz.backendName;
    console.log(`TEST_AUTHZ_BACKEND=${backendUsed}`);
  }
});

after(() => {
  if (handle) stopLocalOpenFga(handle);
});

describe("OpenFGA SDK is installed and importable", () => {
  it("exports OpenFgaClient", () => {
    assert.equal(typeof OpenFgaClient, "function");
  });
});

describe("document-level FGA checks", () => {
  it("allows a manager to view salary documents", async () => {
    assert.equal(
      await authz.check("user:alice", "can_view", "document:salary_band_2026"),
      true
    );
  });

  it("denies a general employee access to salary documents", async () => {
    assert.equal(
      await authz.check("user:bob", "can_view", "document:salary_band_2026"),
      false
    );
  });

  it("allows every employee to view the handbook", async () => {
    assert.equal(await authz.check("user:alice", "can_view", "document:employee_handbook"), true);
    assert.equal(await authz.check("user:bob", "can_view", "document:employee_handbook"), true);
    assert.equal(await authz.check("user:carol", "can_view", "document:employee_handbook"), true);
  });

  it("allows legal staff to view retention policy and denies engineering", async () => {
    assert.equal(
      await authz.check("user:carol", "can_view", "document:legal_retention_policy"),
      true
    );
    assert.equal(
      await authz.check("user:bob", "can_view", "document:legal_retention_policy"),
      false
    );
  });

  it("lists only permitted document objects for bob", async () => {
    const objects = await authz.listObjects("user:bob", "can_view", "document");
    const ids = objects.map((value) => value.replace(/^document:/, ""));
    assert.deepEqual(ids.sort(), ["employee_handbook"]);
  });
});

describe("privacy-aware retrieval happens before context building", () => {
  it("never ranks salary documents for bob even when the query names them", async () => {
    const retriever = new PrivacyAwareRetriever(new DocumentStore(), authz);
    const result = await retriever.retrieve("bob", "What is the L5 salary band?");
    assert.ok(!result.allowedDocumentIds.includes("salary_band_2026"));
    assert.ok(result.deniedDocumentIds.includes("salary_band_2026"));
    assert.ok(result.chunks.every((chunk) => chunk.documentId !== "salary_band_2026"));
    assert.ok(result.chunks.every((chunk) => !chunk.text.includes("150000")));
  });

  it("includes salary documents for alice before answering", async () => {
    const retriever = new PrivacyAwareRetriever(new DocumentStore(), authz);
    const result = await retriever.retrieve("alice", "What is the L5 salary band?");
    assert.ok(result.allowedDocumentIds.includes("salary_band_2026"));
    assert.ok(result.chunks.some((chunk) => chunk.documentId === "salary_band_2026"));
  });

  it("does not put denied documents into the responder context", async () => {
    const assistant = PrivacyAwareAssistant.create(authz);
    const bob = await assistant.ask("bob", "What is the L5 salary band?");
    const alice = await assistant.ask("alice", "What is the L5 salary band?");

    assert.equal(bob.responder, "deterministic-local");
    assert.ok(!bob.answer.includes("150000"));
    assert.ok(!bob.answer.includes("190000"));
    assert.ok(bob.retrievedChunks.length === 0 || bob.retrievedChunks.every((c) => c.documentId === "employee_handbook"));
    assert.match(bob.answer, /not in your permitted set|Sources:/);

    assert.ok(alice.answer.includes("150000"));
    assert.ok(alice.answer.includes("190000"));
    assert.ok(alice.retrievedChunks.some((chunk) => chunk.documentId === "salary_band_2026"));
  });

  it("lets both users read the public handbook policy", async () => {
    const assistant = PrivacyAwareAssistant.create(authz);
    const bob = await assistant.ask("bob", "How many PTO days do employees get?");
    const alice = await assistant.ask("alice", "How many PTO days do employees get?");
    assert.ok(bob.answer.includes("22"));
    assert.ok(alice.answer.includes("22"));
  });

  it("keeps legal retention details away from bob", async () => {
    const assistant = PrivacyAwareAssistant.create(authz);
    const bob = await assistant.ask("bob", "How long are customer contracts retained?");
    const carol = await assistant.ask("carol", "How long are customer contracts retained?");
    assert.ok(!bob.answer.includes("seven years"));
    assert.ok(carol.answer.includes("seven years"));
  });
});

describe("deterministic local responder", () => {
  it("is labelled as deterministic-local and not an LLM", async () => {
    const responder = new DeterministicLocalResponder();
    assert.equal(responder.kind, "deterministic-local");
    const empty = await responder.generate("secret salary", []);
    assert.match(empty, /not in your permitted set/);
  });
});
