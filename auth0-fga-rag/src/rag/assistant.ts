import type { AskResult, AuthorizationChecker } from "../types.ts";
import { PrivacyAwareRetriever } from "./retriever.ts";
import { DeterministicLocalResponder, type Responder } from "./responder.ts";
import { DocumentStore } from "./store.ts";

export class PrivacyAwareAssistant {
  constructor(
    private readonly retriever: PrivacyAwareRetriever,
    private readonly responder: Responder,
    private readonly authz: AuthorizationChecker
  ) {}

  static create(authz: AuthorizationChecker, store = new DocumentStore()): PrivacyAwareAssistant {
    return new PrivacyAwareAssistant(
      new PrivacyAwareRetriever(store, authz),
      new DeterministicLocalResponder(),
      authz
    );
  }

  async ask(userId: string, query: string): Promise<AskResult> {
    const retrieval = await this.retriever.retrieve(userId, query);
    const answer = await this.responder.generate(query, retrieval.chunks);

    return {
      user: userId,
      query,
      responder: "deterministic-local",
      authorizationBackend: this.authz.backendName,
      allowedDocumentIds: retrieval.allowedDocumentIds,
      deniedDocumentIds: retrieval.deniedDocumentIds,
      retrievedChunks: retrieval.chunks,
      answer,
      note:
        "Documents were filtered with FGA can_view checks before retrieval and context building. " +
        "The answer comes from a deterministic local responder, not an LLM.",
    };
  }
}
