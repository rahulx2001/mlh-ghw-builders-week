export const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "does", "for", "from",
  "how", "in", "is", "it", "many", "of", "on", "or", "the", "to", "what", "when",
  "where", "which", "who", "with",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}
