import type { ElementType, ReactNode } from "react";

/* Long text is TRUNCATED WITH AN ELLIPSIS, not wrapped.
 *
 * The console is dense and mostly tabular. Wrapping a long document title,
 * URL, API key, or email reflows the row, breaks the alignment of every
 * neighbouring column, and in the worst case crushes a column until it wraps
 * one character per line. An ellipsis keeps the row exactly one line tall and
 * keeps every border plumb; the full value stays available on hover (and to
 * screen readers, via the same title text).
 *
 * Use this for any value that can be arbitrarily long:
 *   <Truncate>{doc.title}</Truncate>
 *   <Truncate as="td" lines={2}>{claim.text}</Truncate>
 *
 * Do NOT use it for short, known-length labels; plain text is fine there.
 * See CONVENTIONS.md §12.
 */

export type TruncateProps = {
  children: ReactNode;
  /** Element to render. Defaults to a span. */
  as?: ElementType;
  /** Clamp to N lines instead of one. Beyond 1 requires a plain-string child. */
  lines?: number;
  /** Tooltip text. Defaults to the child when it is a plain string. */
  title?: string;
  className?: string;
};

export function Truncate({ children, as, lines = 1, title, className = "" }: TruncateProps) {
  const Tag = (as ?? "span") as ElementType;
  const tip = title ?? (typeof children === "string" ? children : undefined);

  // One line: `truncate` (overflow hidden + ellipsis + nowrap).
  // Multi-line: the standard line-clamp box.
  const clamp =
    lines > 1
      ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]"
      : "truncate";
  const style = lines > 1 ? { WebkitLineClamp: lines } : undefined;

  return (
    <Tag className={`block min-w-0 max-w-full ${clamp} ${className}`.trim()} title={tip} style={style}>
      {children}
    </Tag>
  );
}

/** Inline variant for use inside a flex row that must not grow. */
export function TruncateInline({ children, title, className = "" }: Omit<TruncateProps, "as" | "lines">) {
  const tip = title ?? (typeof children === "string" ? children : undefined);
  return (
    <span className={`inline-block min-w-0 max-w-full truncate align-bottom ${className}`.trim()} title={tip}>
      {children}
    </span>
  );
}
