export interface DocumentRecord {
  id: string;
  title: string;
  department: string;
  sensitivity: string;
  text: string;
}

export interface UserRecord {
  id: string;
  name: string;
  title: string;
  role: string;
  department: string;
}

export interface RetrievedChunk {
  documentId: string;
  title: string;
  text: string;
  score: number;
}

export interface AskResult {
  user: string;
  query: string;
  responder: "deterministic-local";
  authorizationBackend: string;
  allowedDocumentIds: string[];
  deniedDocumentIds: string[];
  retrievedChunks: RetrievedChunk[];
  answer: string;
  note: string;
}

export interface FgaTuple {
  user: string;
  relation: string;
  object: string;
}

export interface AuthorizationChecker {
  readonly backendName: string;
  check(user: string, relation: string, object: string): Promise<boolean>;
  batchCheck(
    checks: Array<{ user: string; relation: string; object: string }>
  ): Promise<boolean[]>;
  listObjects(user: string, relation: string, type: string): Promise<string[]>;
}
