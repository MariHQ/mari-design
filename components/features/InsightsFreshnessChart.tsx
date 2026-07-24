import { Leaf } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { EmptyState } from "../data-display/EmptyState";
import { Skeleton, SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";

/* Insights freshness chart — a per-source stacked bar of document freshness
   (Fresh / Aging / Stale), one row per connected source with a source icon, a
   proportional bar, a doc count, and a shared legend. Zero-total sources render
   a dashed baseline. Renders standalone with baked data.

   The bar is local rather than data-display/FreshBar because colour was the
   only channel there: red, amber and green segments are one shade of grey to a
   colour-blind reader (CONVENTIONS §4/§6). Every band now carries a texture as
   well — Fresh is solid, Aging is a diagonal hatch, Stale is a dot field — the
   segments are separated by white hairlines so adjacent bands never blur into
   one, and the legend swatches carry the same three textures, so the legend can
   be matched to the bar by pattern alone. */

export type Freshness = { source: string; fresh: number; aging: number; stale: number };

const SOURCE_NAMES: Record<string, string> = {
  github: "GitHub · product-docs",
  slack: "Slack · #support",
  gdocs: "Google Drive · Handbook",
  notion: "Notion · Wiki",
  docs: "Uploaded docs",
  website: "Marketing site",
};

type BandKey = "fresh" | "aging" | "stale";

/* One band = one colour AND one texture. The texture is drawn with CSS
   gradients so it needs no asset and survives any bar height. */
const BAND: Record<BandKey, { label: string; color: string; pattern?: string; size?: string }> = {
  fresh: { label: "Fresh", color: "#2C6E49" },
  aging: {
    label: "Aging", color: "#A05E1C",
    pattern: "repeating-linear-gradient(45deg, rgba(255,255,255,0.85) 0 2px, rgba(255,255,255,0) 2px 5px)",
  },
  stale: {
    label: "Stale", color: "#B23A1E",
    pattern: "radial-gradient(rgba(255,255,255,0.9) 1.1px, rgba(255,255,255,0) 1.2px)",
    size: "5px 5px",
  },
};

const BAND_ORDER: BandKey[] = ["fresh", "aging", "stale"];

/** Swatch drawn with the same fill + texture the bar uses. */
function PatternSwatch({ band, size = 12 }: { band: BandKey; size?: number }) {
  const b = BAND[band];
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[2px] ring-1 ring-inset ring-ink/20"
      style={{
        width: size, height: size,
        backgroundColor: b.color,
        backgroundImage: b.pattern,
        backgroundSize: b.size,
      }}
    />
  );
}

function PatternLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-ink/10 pt-3">
      {BAND_ORDER.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 font-term text-[11px] text-ink/70">
          <PatternSwatch band={k} />
          {BAND[k].label}
        </span>
      ))}
      <span className="font-term text-[11px] text-ink/65">Solid, hatched, and dotted so the bands read without colour.</span>
    </div>
  );
}

/** The segmented freshness bar: colour plus texture plus white separators. */
function FreshnessBar({ row, height = 14 }: { row: Freshness; height?: number }) {
  const total = row.fresh + row.aging + row.stale;
  const parts = BAND_ORDER.map((k) => ({ key: k, value: row[k] })).filter((p) => p.value > 0);

  return (
    <span
      role="img"
      aria-label={BAND_ORDER.map((k) => `${BAND[k].label}: ${row[k]}`).join(", ")}
      className="flex w-full overflow-hidden rounded-[3px] bg-ink/[0.06] ring-1 ring-inset ring-ink/15"
      style={{ height }}
    >
      {parts.map((p, i) => {
        const b = BAND[p.key];
        return (
          <span
            key={p.key}
            title={`${b.label}: ${p.value} of ${total}`}
            className="h-full"
            style={{
              width: `${(p.value / total) * 100}%`,
              backgroundColor: b.color,
              backgroundImage: b.pattern,
              backgroundSize: b.size,
              // A white hairline keeps adjacent bands legible even in greyscale.
              boxShadow: i > 0 ? "inset 1.5px 0 0 #FFFFFF" : undefined,
            }}
          />
        );
      })}
    </span>
  );
}

export type InsightsFreshnessChartProps = {
  freshness: Freshness[];
  /** Render a content-shaped skeleton silhouette instead of the chart. */
  loading?: boolean;
  className?: string;
};

export function InsightsFreshnessChart({ freshness, loading = false, className = "" }: InsightsFreshnessChartProps) {
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
              <Skeleton height={14} rounded="rounded-[3px]" />
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
                    <FreshnessBar row={row} />
                  ) : (
                    <span aria-label="No documents" className="block h-[14px] w-full rounded-[3px] border border-dashed border-ink/25" />
                  )}
                  <span className="whitespace-nowrap font-term text-[11px] tabular-nums text-ink/70">{total.toLocaleString("en-US")} docs</span>
                </div>
              );
            })}
          </div>

          <PatternLegend />
        </>
      )}
    </Card>
  );
}
