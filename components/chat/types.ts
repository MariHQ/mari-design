import type { DateInput } from "../tokens/format";

/* The three speakers in an agent transcript. `warning` is the agent's own
   out-of-band notice (rate limits, degraded mode) — rendered inline, not
   as a bubble. */
export type ChatRole = "user" | "assistant" | "warning";

/* One agent tool call / step. `ok` follows the source's three-state idiom:
     null (or undefined) — still running, shows a spinner
     true               — finished, `summary` is the result line
     false              — failed, rendered in the error tone
   `args` are shown inline (truncated) and in full when the row is expanded. */
export type ToolCallData = {
  id?: string;
  name: string;
  args?: Record<string, unknown>;
  summary?: string;
  ok?: boolean | null;
};

/* One transcript entry. Assistant messages may carry a `tools` trace that
   renders above the reply text (the ⏺ tool rows), and may be `streaming`
   while tokens are still arriving. */
export type ChatMessageData = {
  id: string;
  role: ChatRole;
  content: string;
  tools?: ToolCallData[];
  streaming?: boolean;
  at?: DateInput;
};
