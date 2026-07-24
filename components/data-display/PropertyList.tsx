import { type ReactNode } from "react";
import { card } from "../tokens/card";
import { SkeletonLine } from "./Skeleton";
import { Scrollable } from "./Scrollable";

/* text-ink/65 is the meta/label contrast floor (CONVENTIONS.md §6). */
const labelClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/65";

export type PropertyItem = {
  label: ReactNode;
  value: ReactNode;
  /** Force the value onto its own line under the label (for long content). */
  stacked?: boolean;
};

/* ── PropertyList: key–value rows for a detail / inspector panel ─────────
   Two layouts: "rows" (label left, value right, hairline between — the
   Inspector pattern) and "grid" (label above value in responsive columns).
   Boxed in a card by default; pass boxed={false} to drop it into an
   existing panel. */
const labelWidths = [70, 88, 60, 96, 76, 82];
const valueWidths = ["55%", "78%", "42%", "68%", "60%", "50%"];

/** Rows past which the list scrolls inside a bounded region. */
const BOUND_AT = 16;

export function PropertyList({
  items, layout = "rows", boxed = true, columns = 2, className = "", loading = false, maxHeight = 460,
}: {
  items: PropertyItem[];
  layout?: "rows" | "grid";
  boxed?: boolean;
  /** grid layout only: number of columns on wider viewports. */
  columns?: 2 | 3;
  className?: string;
  loading?: boolean;
  /** Height cap, in px, once the list is long enough to scroll. */
  maxHeight?: number;
}) {
  if (loading) {
    const rows = 6;
    const skeleton = layout === "grid" ? (
      <dl className={`grid gap-x-6 gap-y-4 grid-cols-1 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${boxed ? "p-4" : ""}`} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="min-w-0 space-y-2">
            <SkeletonLine w={labelWidths[i % labelWidths.length]} h={9} />
            <SkeletonLine w={valueWidths[i % valueWidths.length]} h={12} />
          </div>
        ))}
      </dl>
    ) : (
      <dl className={boxed ? "px-4" : ""} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-ink/10 last:border-0">
            <SkeletonLine w={labelWidths[i % labelWidths.length]} h={9} />
            <SkeletonLine w={valueWidths[i % valueWidths.length]} h={12} />
          </div>
        ))}
      </dl>
    );
    if (!boxed) return <div className={className}>{skeleton}</div>;
    return <div className={`${card} ${className}`.trim()}>{skeleton}</div>;
  }

  const body = layout === "grid" ? (
    <dl className={`grid gap-x-6 gap-y-4 grid-cols-1 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} ${boxed ? "p-4" : ""}`}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className={labelClass}>{it.label}</dt>
          <dd className="mt-1 text-[13.5px] text-ink break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <dl className={boxed ? "px-4" : ""}>
      {items.map((it, i) => (
        <div
          key={i}
          className={`flex gap-4 py-2.5 border-b border-ink/10 last:border-0 ${it.stacked ? "flex-col gap-1" : "items-baseline justify-between"}`}
        >
          {/* The label used to be shrink-0, so a long one pushed the value off
              the card. It now shares the row, with a floor so it can never
              collapse into a one-letter-per-line column. */}
          <dt className={`${labelClass} min-w-[88px] max-w-[55%] break-words ${it.stacked ? "" : "flex-1"}`.trim()}>{it.label}</dt>
          <dd className={`min-w-0 flex-1 text-[13.5px] text-ink break-words ${it.stacked ? "" : "text-right"}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );

  /* Volume: an inspector fed a couple of hundred properties used to run past
     the fold. Past BOUND_AT rows the list scrolls in place, with the visible
     scrollbar the one scroll container renders (§20). */
  const bounded = items.length > BOUND_AT
    ? <Scrollable axis="y" style={{ maxHeight }} scrollerClassName={boxed ? "" : "pr-1"}>{body}</Scrollable>
    : body;

  if (!boxed) return <div className={`min-w-0 ${className}`.trim()}>{bounded}</div>;
  return <div className={`${card} min-w-0 ${className}`.trim()}>{bounded}</div>;
}
