import { Sparkles, ChevronRight } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { SourceMark } from "../icons/marks";
import { focusRing } from "../tokens/focusRing";

/* Overview — Source pulse ─────────────────────────────────────────────────
   A grid of per-source activity tiles showing each connected source's 7-day
   pulse: provider mark, name, a headline stat, a mini bar chart, and an
   Active/Moderate status. Local Sparkbars (bar sparkline — catalog Sparkline
   is a line) + PulseTile sub-components.
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
    <div className="flex items-center gap-3 rounded-md border border-ink/12 p-3">
      <SourceMark provider={tile.key} size={26} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{tile.name}</div>
        <div className="font-term text-[11px] leading-tight text-ink/55">
          {tile.stat} {tile.unit}
        </div>
      </div>
      <Sparkbars values={tile.bars} tone={tile.status} />
      <span
        className={[
          "inline-flex items-center gap-1.5 font-term text-[10.5px] font-medium",
          active ? "text-moss" : "text-clay",
        ].join(" ")}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-moss" : "bg-clay"}`} />
        {active ? "Active" : "Moderate"}
      </span>
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
  className?: string;
};

export function OverviewSourcePulse({
  tiles = DEMO_TILES, loading = false, offline = false, onViewAll, className = "",
}: OverviewSourcePulseProps) {
  return (
    <Card
      className={className}
      icon={<IconRing><Sparkles size={16} /></IconRing>}
      title="Source pulse"
      hint="Last 7 days"
    >
      {loading ? (
        <div className="grid place-items-center min-h-[120px]"><Spinner size="sm" /></div>
      ) : offline ? (
        <EmptyState>API offline — source pulse unavailable.</EmptyState>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {tiles.map((t) => <PulseTile key={t.key} tile={t} />)}
        </div>
      )}
      <div className="mt-3 border-t border-ink/10 pt-3">
        <button
          type="button"
          onClick={onViewAll}
          className={`inline-flex items-center gap-1.5 text-[12.5px] text-biscay-2 hover:text-ink ${focusRing}`}
        >
          View all sources <ChevronRight size={14} />
        </button>
      </div>
    </Card>
  );
}
