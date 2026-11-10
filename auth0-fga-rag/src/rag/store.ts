import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentRecord, UserRecord } from "../types.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadDocuments(): DocumentRecord[] {
  return JSON.parse(readFileSync(join(rootDir, "data", "documents.json"), "utf8"));
}

export function loadUsers(): UserRecord[] {
  return JSON.parse(readFileSync(join(rootDir, "data", "users.json"), "utf8"));
}

export class DocumentStore {
  constructor(private readonly documents: DocumentRecord[] = loadDocuments()) {}

  list(): DocumentRecord[] {
    return [...this.documents];
  }

  get(id: string): DocumentRecord | undefined {
    return this.documents.find((doc) => doc.id === id);
  }
}
