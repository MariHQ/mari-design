import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type Block } from "./markdown";

// Blueprint prose styling: display font for headings, ink body text, a flysch
// tint behind code, biscay-2 for inline code accents. Inline HTML (**bold**,
// *italic*, `code`) is produced by the ported parser and injected verbatim —
// the parser escapes all input first, so this is safe for trusted markdown.

const INLINE = "[&_b]:font-semibold [&_b]:text-ink [&_i]:italic [&_code]:font-term [&_code]:text-[0.85em] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-[3px] [&_code]:bg-flysch [&_code]:text-biscay-2 [&_code]:border [&_code]:border-ink/10";

const HEADING: Record<"h1" | "h2" | "h3", string> = {
  h1: "font-display font-semibold text-ink text-[27px] leading-tight mt-0 mb-4",
  h2: "font-display font-semibold text-ink text-[18px] leading-snug mt-5 mb-2",
  h3: "font-display font-semibold text-ink text-[15.5px] leading-snug mt-3 mb-1.5",
};

function renderInline(html: string): ReactNode {
  return <span className={INLINE} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Group the flat block list, folding consecutive `li` blocks into one list. */
function renderBlocks(blocks: Block[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "li") {
      const items: Block[] = [];
      while (i < blocks.length && blocks[i].type === "li") { items.push(blocks[i]); i++; }
      out.push(
        <ul key={b.id} className="my-2.5 pl-5 list-disc marker:text-clay space-y-1">
          {items.map((li) => (
            <li key={li.id} className="font-term text-[14.5px] leading-[1.65] text-ink/90">
              {renderInline(li.html)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (b.type === "code") {
      out.push(
        <pre key={b.id} className="my-3 px-3 py-2.5 rounded-[6px] bg-flysch border border-ink/10 overflow-x-auto">
          <code className="font-term text-[12.5px] leading-[1.55] text-ink/90 whitespace-pre">{b.html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")}</code>
        </pre>,
      );
      i++;
      continue;
    }
    if (b.type === "p") {
      out.push(
        <p key={b.id} className="font-term text-[14.5px] leading-[1.65] text-ink/90 my-2.5 first:mt-0 last:mb-0">
          {renderInline(b.html)}
        </p>,
      );
      i++;
      continue;
    }
    const H = b.type;
    out.push(
      <Fragment key={b.id}>
        {H === "h1" ? <h1 className={HEADING.h1}>{renderInline(b.html)}</h1>
          : H === "h2" ? <h2 className={HEADING.h2}>{renderInline(b.html)}</h2>
            : <h3 className={HEADING.h3}>{renderInline(b.html)}</h3>}
      </Fragment>,
    );
    i++;
  }
  return out;
}

export type MarkdownViewProps = {
  /** Raw markdown source. */
  children: string;
  className?: string;
};

/** Render trusted markdown as styled blueprint prose (headings, lists, code, inline marks). */
export function MarkdownView({ children, className = "" }: MarkdownViewProps) {
  const blocks = parseMarkdown(children ?? "");
  return <div className={`text-ink ${className}`.trim()}>{renderBlocks(blocks)}</div>;
}
