import type {
  AuthorizationChecker,
  DocumentRecord,
  RetrievedChunk,
} from "../types.ts";
import type { DocumentStore } from "./store.ts";

import { tokenize } from "./text.ts";

function scoreDocument(query: string, document: DocumentRecord): number {
  const queryTokens = new Set(tokenize(query));
  const haystack = tokenize(`${document.title} ${document.text}`);
  let overlap = 0;
  for (const token of haystack) {
    if (queryTokens.has(token)) overlap += 1;
  }
  return overlap;
}

export interface FilterResult {
  allowedDocuments: DocumentRecord[];
  deniedDocumentIds: string[];
  allowedDocumentIds: string[];
}

/**
 * Documents are filtered through FGA BEFORE any ranking or context building.
 * Sensitive documents that fail can_view never enter the retriever corpus.
 */
export class PrivacyAwareRetriever {
  constructor(
    private readonly store: DocumentStore,
    private readonly authz: AuthorizationChecker
  ) {}

  async filterAllowedDocuments(userId: string): Promise<FilterResult> {
    const all = this.store.list();
    const user = userId.startsWith("user:") ? userId : `user:${userId}`;

    const checks = all.map((doc) => ({
      user,
      relation: "can_view",
      object: `document:${doc.id}`,
    }));

    const allowedFlags = await this.authz.batchCheck(checks);
    const allowedDocuments: DocumentRecord[] = [];
    const deniedDocumentIds: string[] = [];

    all.forEach((doc, index) => {
      if (allowedFlags[index]) {
        allowedDocuments.push(doc);
      } else {
        deniedDocumentIds.push(doc.id);
      }
    });

    return {
      allowedDocuments,
      deniedDocumentIds,
      allowedDocumentIds: allowedDocuments.map((doc) => doc.id),
    };
  }

  async retrieve(userId: string, query: string, limit = 3): Promise<{
    chunks: RetrievedChunk[];
    allowedDocumentIds: string[];
    deniedDocumentIds: string[];
  }> {
    const filtered = await this.filterAllowedDocuments(userId);

    const ranked = filtered.allowedDocuments
      .map((document) => ({
        document,
        score: scoreDocument(query, document),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        documentId: item.document.id,
        title: item.document.title,
        text: item.document.text,
        score: item.score,
      }));

    return {
      chunks: ranked,
      allowedDocumentIds: filtered.allowedDocumentIds,
      deniedDocumentIds: filtered.deniedDocumentIds,
    };
  }
}
