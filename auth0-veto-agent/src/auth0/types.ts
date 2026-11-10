export type ToolCallInput = {
  threadID: string;
  toolCallID: string;
  toolName: string;
  userId?: string;
  bindingMessage?: string;
  payload?: Record<string, unknown>;
};
