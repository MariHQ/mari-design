import { ToolCall } from "./ToolCall";
import type { ChatMessageData } from "./types";

/* ChatMessage — one transcript entry, rendered in the source's three
   distinct treatments rather than opposing bubbles:

     user      — a bold line prefixed with a terracotta ❯ prompt
     assistant — the tool trace (⏺ rows) followed by indented reply text,
                 with a blinking caret while streaming
     warning   — an inline clay-toned notice

   Text is rendered as plain text with preserved whitespace (whitespace-
   pre-wrap); a richer markdown renderer lives in its own component. */
export function ChatMessage({ message }: { message: ChatMessageData }) {
  if (message.role === "user") {
    return (
      <div className="flex gap-2 items-baseline pt-1.5 pb-0.5 font-semibold text-ink">
        <span className="font-term text-[12px] text-espelette shrink-0">❯</span>
        <span className="whitespace-pre-wrap min-w-0">{message.content}</span>
      </div>
    );
  }

  if (message.role === "warning") {
    return (
      <div className="ml-[18px] px-2.5 py-1.5 rounded-[4px] border border-clay/35 bg-clay/[0.07] text-[12.5px] text-clay">
        {message.content}
      </div>
    );
  }

  // assistant
  return (
    <div className="flex flex-col gap-1">
      {message.tools?.map((t, i) => (
        <ToolCall key={t.id ?? i} tool={t} />
      ))}
      {(message.content || message.streaming) && (
        <div className="pl-[18px] pt-0.5 pb-1 text-ink whitespace-pre-wrap">
          {message.content}
          {message.streaming && (
            <span
              aria-hidden="true"
              className="inline-block w-[7px] h-[14px] ml-0.5 -mb-0.5 align-text-bottom bg-espelette animate-pulse"
            />
          )}
        </div>
      )}
    </div>
  );
}
