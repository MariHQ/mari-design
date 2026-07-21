import type { CSSProperties } from "react";

/* Loading-placeholder block — distinct from Spinner (indeterminate) for
   content that's about to appear in its own place (a table row, a card). */
export function Skeleton({ className = "", width, height }: { className?: string; width?: CSSProperties["width"]; height?: CSSProperties["height"] }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-[4px] bg-ink/[0.07] animate-pulse ${className}`.trim()}
      style={{ width, height }}
    />
  );
}
