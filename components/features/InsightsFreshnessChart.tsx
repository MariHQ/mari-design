import { Leaf } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { FreshBar, LegendSwatch } from "../data-display/FreshBar";
import { EmptyState } from "../data-display/EmptyState";
import { Skeleton, SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";

/* Insights freshness chart — a per-source stacked bar of document freshness
   (Fresh / Aging / Stale), one row per connected source with a source icon, a
   proportional bar, a doc count, and a shared legend. Composes Card + IconRing
   + FreshBar (the blueprint stacked-bar primitive). Zero-total sources render a
   dashed baseline. Renders standalone with baked data. */

export type Freshness = { source: string; fresh: number; aging: number; stale: number };

const SOURCE_NAMES: Record<string, string> = {
  github: "GitHub · product-docs",
  slack: "Slack · #support",
  gdocs: "Google Drive · Handbook",
  notion: "Notion · Wiki",
  docs: "Uploaded docs",
  website: "Marketing site",
};

const DEMO_FRESHNESS: Freshness[] = [
  { source: "github", fresh: 128, aging: 34, stale: 12 },
  { source: "gdocs", fresh: 62, aging: 41, stale: 27 },
  { source: "slack", fresh: 210, aging: 18, stale: 4 },
  { source: "notion", fresh: 44, aging: 22, stale: 31 },
  { source: "docs", fresh: 0, aging: 0, stale: 0 },
];

export type InsightsFreshnessChartProps = {
  freshness?: Freshness[];
  /** Render a content-shaped skeleton silhouette instead of the chart. */
  loading?: boolean;
  className?: string;
};

export function InsightsFreshnessChart({ freshness = DEMO_FRESHNESS, loading = false, className = "" }: InsightsFreshnessChartProps) {
  const grandTotal = freshness.reduce((n, r) => n + r.fresh + r.aging + r.stale, 0);

  if (loading) {
    return (
      <Card
        className={className}
        icon={<SkeletonCircle size={30} />}
        title={<SkeletonLine w={180} h={13} />}
        hint={<SkeletonLine w={54} h={10} />}
      >
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[minmax(120px,180px)_minmax(0,1fr)_auto] items-center gap-3">
              <span className="flex min-w-0 items-center gap-2"><SkeletonCircle size={16} /><SkeletonLine w="70%" h={11} /></span>
              <Skeleton height={12} rounded="rounded-full" />
              <SkeletonLine w={48} h={10} />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={className}
      icon={<IconRing tone="ok"><Leaf size={15} /></IconRing>}
      title="Freshness by source"
      hint={grandTotal > 0 ? `${grandTotal.toLocaleString("en-US")} docs` : undefined}
    >
      {freshness.length === 0 ? (
        <EmptyState icon={<Leaf size={24} />} title="No sources yet">Connect a source to see freshness here.</EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-3.5">
            {freshness.map((row) => {
              const total = row.fresh + row.aging + row.stale;
              return (
                <div key={row.source} className="grid grid-cols-[minmax(120px,180px)_minmax(0,1fr)_auto] items-center gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <SourceMark provider={row.source} size={16} />
                    <span className="truncate text-[12.5px] text-ink/75">{SOURCE_NAMES[row.source] ?? row.source}</span>
                  </span>
                  {total > 0 ? (
                    <FreshBar
                      legend={false}
                      height={12}
                      segments={[
                        { label: "Fresh", value: row.fresh, tone: "ok" },
                        { label: "Aging", value: row.aging, tone: "attention" },
                        { label: "Stale", value: row.stale, tone: "blocked" },
                      ]}
                    />
                  ) : (
                    <span aria-label="No documents" className="block h-[12px] w-full rounded-full border border-dashed border-ink/25" />
                  )}
                  <span className="font-term text-[11px] tabular-nums text-ink/50">{total} docs</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 pt-3">
            <LegendSwatch tone="ok" label="Fresh" />
            <LegendSwatch tone="attention" label="Aging" />
            <LegendSwatch tone="blocked" label="Stale" />
          </div>
        </>
      )}
    </Card>
  );
}
