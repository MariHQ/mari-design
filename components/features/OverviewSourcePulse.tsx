import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { Skeleton, SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";
import { Button } from "../actions/Button";

/* Overview — Source pulse ─────────────────────────────────────────────────
   A grid of per-source activity tiles showing each connected source's 7-day
   pulse: provider mark, name, a headline stat, an ALL-CAPS <Chip> status, and
   a mini bar chart. The chip sits to the LEFT of the chart so the status reads
   before the shape does, and it is the shared Chip (not a hand-rolled span) so
   it matches every other chip in the console (CONVENTIONS.md §4).
   Local Sparkbars (bar sparkline — catalog Sparkline is a line) + PulseTile.
   Source: web/src/pages/Overview.tsx (pulseQ, .card.pulse block). */

type PulseStatus = "active" | "moderate";

const BAR_HEX: Record<PulseStatus, string> = { active: "#2C6E49", moderate: "#A05E1C" };

/* ── Sparkbars — inline SVG bar sparkline; opacity ramps with value ── */
function Sparkbars({ values, width = 56, height = 22, tone = "active" }: {
  values: number[];
  width?: number;
  height?: number;
  tone?: PulseStatus;
}) {
  const bw = width / Math.max(values.length, 1);
  const max = Math.max(...values, 1);
  const color = BAR_HEX[tone];
  return (
    <svg width={width} height={height} aria-hidden style={{ display: "block" }}>
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * bw + 1} y={height - h} width={Math.max(1, bw - 2)} height={h} rx="1"
            fill={color} opacity={0.5 + (v / max) * 0.5}
          />
        );
      })}
    </svg>
  );
}

export type PulseTileData = {
  key: string;
  name: string;
  stat: string;
  unit: string;
  status: PulseStatus;
  bars: number[];
};

function PulseTile({ tile }: { tile: PulseTileData }) {
  const active = tile.status !== "moderate";
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-md border border-ink/12 p-3">
      <span className="shrink-0"><SourceMark provider={tile.key} size={26} /></span>
      {/* min-w-0 + truncate: a long source name or unit shortens itself rather
          than wrapping one character per line and blowing the tile's height. */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{tile.name}</div>
        <div className="truncate font-term text-[11px] leading-tight text-ink/65">
          {tile.stat} {tile.unit}
        </div>
      </div>
      {/* Status chip first, chart second. Neither may be squeezed away. */}
      <span className="shrink-0">
        <Chip label={active ? "Active" : "Moderate"} tone={active ? "ok" : "attention"} dot />
      </span>
      <span className="shrink-0"><Sparkbars values={tile.bars} tone={tile.status} /></span>
    </div>
  );
}

const DEMO_TILES: PulseTileData[] = [
  { key: "github", name: "GitHub", stat: "128", unit: "commits", status: "active", bars: [4, 7, 5, 9, 6, 11, 8] },
  { key: "slack", name: "Slack", stat: "412", unit: "messages", status: "active", bars: [30, 22, 41, 18, 35, 27, 44] },
  { key: "notion", name: "Notion", stat: "19", unit: "edits", status: "moderate", bars: [3, 1, 4, 2, 0, 5, 4] },
  { key: "gdocs", name: "Google Drive", stat: "34", unit: "files", status: "active", bars: [6, 4, 8, 5, 7, 9, 6] },
  { key: "granola", name: "Granola", stat: "7", unit: "meetings", status: "moderate", bars: [1, 2, 0, 1, 3, 1, 2] },
  { key: "linear", name: "Linear", stat: "56", unit: "issues", status: "active", bars: [8, 5, 11, 7, 9, 6, 12] },
];

export type OverviewSourcePulseProps = {
  tiles?: PulseTileData[];
  loading?: boolean;
  offline?: boolean;
  onViewAll?: () => void;
  /** Wires the error banner's Retry control. Omitted = no button. */
  onRetry?: () => void;
  /** Start with every source tile showing. */
  defaultExpanded?: boolean;
  className?: string;
};

/** Collapsed height of the grid, in tiles. */
const PREVIEW_TILES = 4;

export function OverviewSourcePulse({
  tiles = DEMO_TILES, loading = false, offline = false, onViewAll, onRetry,
  defaultExpanded = false, className = "",
}: OverviewSourcePulseProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hidden = Math.max(0, tiles.length - PREVIEW_TILES);
  const visible = expanded ? tiles : tiles.slice(0, PREVIEW_TILES);

  const viewAll = () => {
    setExpanded((v) => !v);
    onViewAll?.();
  };

  return (
    <Card
      className={className}
      icon={<IconRing><Sparkles size={16} /></IconRing>}
      title="Source pulse"
      hint="Last 7 days"
    >
      {loading ? (
        <div className="grid grid-cols-[repeat(2,minmax(250px,1fr))] gap-2.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-ink/12 p-3">
              <SkeletonCircle size={26} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonLine w="55%" h={11} />
                <SkeletonLine w="38%" h={9} />
              </div>
              <Skeleton width={56} height={22} rounded="rounded-[3px]" />
              <SkeletonLine w={48} h={9} />
            </div>
          ))}
        </div>
      ) : offline ? (
        /* §8: failure copy comes from the catalog, never a bespoke string. */
        <ErrorMessage id="server.unavailable" onAction={onRetry} />
      ) : tiles.length === 0 ? (
        <EmptyState>No sources connected yet. Connect one in Sources.</EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(2,minmax(250px,1fr))] items-stretch gap-2.5">
          {visible.map((t) => <PulseTile key={t.key} tile={t} />)}
        </div>
      )}
      {!loading && !offline && hidden > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
          <Button compact onClick={viewAll}>
            {expanded
              ? <><ChevronUp size={14} /> Show fewer sources</>
              : <><ChevronDown size={14} /> View all sources</>}
          </Button>
          <span className="font-term text-[11.5px] text-ink/65">
            {expanded ? `${tiles.length} connected` : `${hidden} more connected`}
          </span>
        </div>
      )}
    </Card>
  );
}
