import { type ReactNode } from "react";
import { card } from "../tokens/card";
import { SkeletonLine } from "./Skeleton";

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
const labelWidths = [70, 88, 60, 96, 76, 82];
const valueWidths = ["55%", "78%", "42%", "68%", "60%", "50%"];

export function PropertyList({
  items, layout = "rows", boxed = true, columns = 2, className = "", loading = false,
}: {
  items: PropertyItem[];
  layout?: "rows" | "grid";
  boxed?: boolean;
  /** grid layout only: number of columns on wider viewports. */
  columns?: 2 | 3;
  className?: string;
  loading?: boolean;
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
          <dt className={`${labelClass} shrink-0`}>{it.label}</dt>
          <dd className={`text-[13.5px] text-ink break-words ${it.stacked ? "" : "text-right"}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );

  if (!boxed) return <div className={className}>{body}</div>;
  return <div className={`${card} ${className}`.trim()}>{body}</div>;
}
