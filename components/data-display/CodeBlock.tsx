import type { ReactNode } from "react";
import { CopyButton } from "../actions/CopyButton";
import { Scrollable } from "./Scrollable";

/* CodeBlock — a monospace code block with an optional header (language /
   title) and a copy affordance. Wide content scrolls horizontally inside
   its own container; the page never scrolls sideways. Composes CopyButton. */

export type CodeBlockProps = {
  code: string;
  /** Language/label shown in the header. */
  language?: string;
  title?: ReactNode;
  /** Show the copy button (default true). */
  copy?: boolean;
  /** Soft-wrap long lines instead of scrolling. */
  wrap?: boolean;
  className?: string;
};

export function CodeBlock({ code, language, title, copy = true, wrap = false, className = "" }: CodeBlockProps) {
  const header = Boolean(title || language || copy);
  return (
    <div className={`rounded-md border border-ink/15 bg-ink/[0.025] overflow-hidden ${className}`.trim()}>
      {header && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-ink/10 bg-ink/[0.02]">
          <span className="flex-1 min-w-0 truncate font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/65">
            {title ?? language}
          </span>
          {copy && <CopyButton value={code} variant="link" className="text-ink/70 hover:text-ink" />}
        </div>
      )}
      <div className="relative">
        {!header && copy && (
          <div className="absolute top-2 right-2 z-10">
            <CopyButton value={code} className="bg-paper/80 backdrop-blur-sm" />
          </div>
        )}
        {/* With `wrap` there is never horizontal overflow; the indicator just stays hidden. */}
        <Scrollable>
          <pre className={`p-3.5 font-term text-[12.5px] leading-relaxed text-ink ${wrap ? "whitespace-pre-wrap break-words" : ""}`}>
            <code>{code}</code>
          </pre>
        </Scrollable>
      </div>
    </div>
  );
}
