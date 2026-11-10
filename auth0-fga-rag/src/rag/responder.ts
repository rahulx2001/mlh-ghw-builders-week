import type { RetrievedChunk } from "../types.ts";
import { tokenize } from "./text.ts";

export interface Responder {
  readonly kind: "deterministic-local" | "llm";
  generate(query: string, chunks: RetrievedChunk[]): Promise<string>;
}

/**
 * DETERMINISTIC LOCAL RESPONDER — not an LLM.
 *
 * Builds an extractive answer from the already-authorized retrieved chunks:
 * it selects sentences with the highest query-term overlap. A real LLM could
 * replace this class behind the same Responder interface without changing
 * the authorization or retrieval path.
 */
export class DeterministicLocalResponder implements Responder {
  readonly kind = "deterministic-local" as const;

  async generate(query: string, chunks: RetrievedChunk[]): Promise<string> {
    if (chunks.length === 0) {
      return (
        "I could not find an answer in the documents you are allowed to view. " +
        "If this topic exists in the company index, it is not in your permitted set."
      );
    }

    const queryTerms = new Set(tokenize(query));

    const sentences: Array<{ text: string; score: number; title: string }> = [];
    for (const chunk of chunks) {
      for (const raw of chunk.text.split(/(?<=[.!?])\s+/)) {
        const sentence = raw.trim();
        if (!sentence) continue;
        const tokens = tokenize(sentence);
        const score = tokens.reduce(
          (sum, token) => sum + (queryTerms.has(token) ? 1 : 0),
          0
        );
        sentences.push({ text: sentence, score, title: chunk.title });
      }
    }

    sentences.sort((a, b) => b.score - a.score);
    const top = sentences.filter((s) => s.score > 0).slice(0, 3);
    const picked = top.length > 0 ? top : sentences.slice(0, 2);
    const sources = [...new Set(picked.map((item) => item.title))];
    const body = picked.map((item) => item.text).join(" ");
    return `${body} (Sources: ${sources.join("; ")})`;
  }
}
