import { ToolCall } from "./ToolCall";
import type { ChatMessageData } from "./types";

/* ChatMessage: one transcript entry, rendered in three distinct treatments
   rather than opposing bubbles:

     user      a bold line, flush with the dock's left edge
     assistant the tool trace (⏺ rows) followed by reply text, indented one
               step in, with a blinking caret while streaming
     warning   an inline clay-toned notice, on the assistant's indent

   The user line used to carry a decorative ❯ that did nothing but push the
   first line of the conversation off the dock's plumb line. It is gone: the
   user's turn is the outdented line, everything the agent says is indented
   under it, and the composer below shares the same left edge.

   Text is rendered as plain text with preserved whitespace (whitespace-
   pre-wrap); a richer markdown renderer lives in its own component. */

/** One indent step. Tool rows, reply text, and warnings all share it. */
export const CHAT_INDENT = "pl-[18px]";

export function ChatMessage({ message }: { message: ChatMessageData }) {
  if (message.role === "user") {
    return (
      /* break-words: whitespace-pre-wrap alone will not break a pasted token
         with no spaces, so it used to run out of the dock. */
      <div className="pt-1.5 pb-0.5 font-semibold text-ink whitespace-pre-wrap break-words">
        {message.content}
      </div>
    );
  }

  if (message.role === "warning") {
    return (
      <div className="ml-[18px] px-2.5 py-1.5 rounded-[4px] border border-clay/35 bg-clay/[0.07] text-[12.5px] text-clay break-words">
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
        <div className={`${CHAT_INDENT} pt-0.5 pb-1 text-ink whitespace-pre-wrap break-words`}>
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
