import { type ReactNode } from "react";
import { card } from "../tokens/card";

const labelClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

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
export function PropertyList({
  items, layout = "rows", boxed = true, columns = 2, className = "",
}: {
  items: PropertyItem[];
  layout?: "rows" | "grid";
  boxed?: boolean;
  /** grid layout only: number of columns on wider viewports. */
  columns?: 2 | 3;
  className?: string;
}) {
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
          <dt className={`${labelClass} shrink-0`}>{it.label}</dt>
          <dd className={`text-[13.5px] text-ink break-words ${it.stacked ? "" : "text-right"}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );

  if (!boxed) return <div className={className}>{body}</div>;
  return <div className={`${card} ${className}`.trim()}>{body}</div>;
}
