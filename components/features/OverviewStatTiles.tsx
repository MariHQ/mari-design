import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Clipboard, CheckCircle2, Play } from "lucide-react";
import { Stat, type StatTone } from "../data-display/Stat";
import { IconRing, type IconRingTone } from "../data-display/IconRing";
import { SkeletonStat } from "../data-display/Skeleton";

/* Overview — Headline stat tiles ─────────────────────────────────────────
   Three big-number tiles summarizing the week: changes, facts to review,
   flows running. Each is click-navigable to its owning area. Composes the
   catalog <Stat> (with an IconRing icon) and reproduces the notebook look
   with a local <HatchSwatch> pencil-hatch left-edge texture.
   Source: web/src/pages/Overview.tsx (statsQ, STAT_* maps, .ov-row1). */

type Tone = "green" | "red" | "blue";

const TONE_HEX: Record<Tone, string> = { green: "#2C6E49", red: "#B23A1E", blue: "#1E6FA8" };
const STAT_TONE: Record<Tone, StatTone> = { green: "ok", red: "blocked", blue: "info" };
const RING_TONE: Record<Tone, IconRingTone> = { green: "ok", red: "blocked", blue: "info" };

type StatIconKey = "clipboard" | "check" | "play";
const STAT_ICONS: Record<StatIconKey, ReactNode> = {
  clipboard: <Clipboard size={17} />,
  check: <CheckCircle2 size={17} />,
  play: <Play size={17} />,
};
const STAT_AREA: Record<StatIconKey, string> = { clipboard: "knowledge", check: "facts", play: "flows" };

export type OverviewStats = {
  changes: number;
  factsReview: number;
  flowsRunning: number;
};

export type OverviewStatTilesProps = {
  /** Live counts. Omit to use the baked-in demo numbers. */
  stats?: OverviewStats | null;
  /** Force the loading (spinner) state. */
  loading?: boolean;
  /** No data + not loading → "API offline" placeholders. */
  offline?: boolean;
  /** Show the pencil-hatch swatch on the tile's left edge. */
  swatch?: boolean;
  onNavigate?: (area: string) => void;
  className?: string;
};

const DEMO: OverviewStats = { changes: 47, factsReview: 6, flowsRunning: 3 };

/* ── HatchSwatch — dry colored-pencil hatching for the tile's left edge ── */
function HatchSwatch({ color, height = 96 }: { color: string; height?: number }) {
  const lines: ReactNode[] = [];
  for (let i = -6; i < 26; i++) {
    const x = i * 7 + ((i * 13) % 4) - 2;
    const w = 3.4 + ((i * 7) % 3) * 0.5;
    lines.push(
      <line
        key={i}
        x1={x} y1={-8} x2={x - height * 0.55} y2={height + 8}
        stroke={color} strokeWidth={w} strokeLinecap="round"
        opacity={0.55 + ((i * 11) % 4) * 0.11}
      />,
    );
  }
  return (
    <svg width="100%" height="100%" viewBox={`0 0 46 ${height}`} preserveAspectRatio="none" aria-hidden>
      <rect width="46" height={height} fill={color} opacity="0.08" />
      <g>{lines}</g>
      <g stroke={color} strokeWidth="1.25" strokeLinecap="round" opacity="0.32">
        {[...Array(18)].map((_, i) => (
          <line key={i} x1={-18 + i * 8} y1={height + 4} x2={26 + i * 8} y2={-4} />
        ))}
      </g>
      <rect x="1" y="1" width="44" height={height - 2} rx="4" fill="none" stroke={color} strokeWidth="1" opacity="0.22" />
    </svg>
  );
}

type Tile = { key: StatIconKey; label: string; tone: Tone; num: number | null; sub: string | null };

export function OverviewStatTiles({
  stats = DEMO, loading = false, offline = false, swatch = true, onNavigate, className = "",
}: OverviewStatTilesProps) {
  const [area, setArea] = useState<string | null>(null);
  const go = (a: string) => { setArea(a); onNavigate?.(a); };

  if (loading) {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()} aria-hidden="true">
        <SkeletonStat /><SkeletonStat /><SkeletonStat />
      </div>
    );
  }

  const live = !loading && !offline && stats;
  const tiles: Tile[] = [
    { key: "clipboard", label: "changes", tone: "green", num: live ? stats!.changes : null, sub: live ? "this week" : null },
    { key: "check", label: "facts to review", tone: "red", num: live ? stats!.factsReview : null, sub: live ? (stats!.factsReview > 0 ? "awaiting verification" : "all verified") : null },
    { key: "play", label: "flows running", tone: "blue", num: live ? stats!.flowsRunning : null, sub: live ? (stats!.flowsRunning > 0 ? "All healthy" : "Idle") : null },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}>
      {tiles.map((t) => {
        const value = t.num ?? "—";
        const sub = t.sub ?? "API offline";
        const swatchStyle: CSSProperties = { position: "absolute", inset: "0 auto 0 0", width: 8, borderRadius: "6px 0 0 6px", overflow: "hidden" };
        return (
          <div key={t.key} className="relative">
            {swatch && <span style={swatchStyle} aria-hidden><HatchSwatch color={TONE_HEX[t.tone]} /></span>}
            <Stat
              value={value}
              label={t.label}
              sub={sub}
              tone={STAT_TONE[t.tone]}
              icon={<IconRing tone={RING_TONE[t.tone]} size={31}>{STAT_ICONS[t.key]}</IconRing>}
              onClick={() => go(STAT_AREA[t.key])}
              className={swatch ? "pl-5" : ""}
            />
          </div>
        );
      })}
      {area && <span className="sr-only" role="status">navigating to {area}</span>}
    </div>
  );
}
