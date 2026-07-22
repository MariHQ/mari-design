import { useState } from "react";
import { Check, X, ChevronRight } from "lucide-react";
import { Spinner } from "../data-display/Spinner";
import { focusRing } from "../tokens/focusRing";
import type { ToolCallData } from "./types";

function shortArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => {
      if (typeof v === "string") {
        const s = v.length > 42 ? v.slice(0, 42) + "…" : v;
        return `${k}: ${JSON.stringify(s)}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join(", ");
}

/* ToolCall — the ⏺ idiom from Claude Code, ported to notebook paper. A
   collapsible row: status glyph (spinner → check/cross), monospace tool
   name, truncated args, and a chevron. Expands to a raw JSON detail block.
   Running rows (ok == null) show a spinner and a "Running…" summary. */
export function ToolCall({ tool }: { tool: ToolCallData }) {
  const [expanded, setExpanded] = useState(false);
  const running = tool.ok == null;
  const failed = tool.ok === false;
  const args = tool.args ?? {};

  return (
    <div
      /* 16px of padding behind a 2px rule lands the trace text on the same
         18px indent as the assistant's reply text (CHAT_INDENT). */
      className={[
        "pl-4 border-l-2",
        failed ? "border-espelette/45" : "border-ink/10",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className={`flex items-center gap-1.5 w-full min-w-0 py-0.5 text-left text-[12.5px] group ${focusRing}`}
      >
        <span
          className={[
            "inline-flex items-center justify-center w-4 h-4 shrink-0",
            failed ? "text-espelette" : "text-moss",
          ].join(" ")}
          aria-hidden="true"
        >
          {running ? (
            <Spinner size="sm" label={`Running ${tool.name}`} />
          ) : failed ? (
            <X size={13} />
          ) : (
            <Check size={13} />
          )}
        </span>
        <span className="shrink-0 font-term font-semibold text-ink group-hover:underline decoration-wavy">
          {tool.name}
        </span>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-term text-ink/65">
          ({shortArgs(args)})
        </span>
        <span
          className={`ml-auto shrink-0 inline-flex text-ink/65 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <ChevronRight size={12} />
        </span>
      </button>

      <div className="pb-0.5 pl-[22px] text-[12.5px] text-ink/70 overflow-hidden text-ellipsis whitespace-nowrap">
        {running ? "Running…" : tool.summary}
      </div>

      {expanded && (
        <pre className="ml-[22px] mb-1.5 px-2.5 py-2 rounded-[4px] border border-ink/10 bg-flysch font-term text-[11.5px] leading-relaxed text-ink/70 overflow-x-auto">
          {JSON.stringify({ args, result: tool.summary, ok: tool.ok }, null, 2)}
        </pre>
      )}
    </div>
  );
}
