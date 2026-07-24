import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Clipboard, CheckCircle2, Play } from "lucide-react";
import { Stat, type StatTone } from "../data-display/Stat";
import { IconRing, type IconRingTone } from "../data-display/IconRing";
import { SkeletonStat } from "../data-display/Skeleton";

/* Overview — Headline stat tiles ─────────────────────────────────────────
   Three big-number tiles summarizing the week: changes, facts to review,
   flows running. Each is click-navigable to its owning area. Composes the
   catalog <Stat> (with an IconRing icon) plus a SOLID brand-colored accent
   line on the tile's left edge (moss / espelette / biscay-2). The old
   pencil-hatch swatch read as a texture, not as a category marker.
   Source: web/src/pages/Overview.tsx (statsQ, STAT_* maps, .ov-row1). */

type Tone = "green" | "red" | "blue";

/* Solid accent line color, one per tone. Brand tokens only, no gradients. */
const ACCENT: Record<Tone, string> = { green: "bg-moss", red: "bg-espelette", blue: "bg-biscay-2" };
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
  /** Show the solid accent line on the tile's left edge. */
  swatch?: boolean;
  onNavigate?: (area: string) => void;
  className?: string;
};

const DEMO: OverviewStats = { changes: 47, factsReview: 6, flowsRunning: 3 };

type Tile = { key: StatIconKey; label: string; tone: Tone; num: number | null; sub: string | null };

export function OverviewStatTiles({
  stats = DEMO, loading = false, offline = false, swatch = true, onNavigate, className = "",
}: OverviewStatTilesProps) {
  const [area, setArea] = useState<string | null>(null);
  const go = (a: string) => { setArea(a); onNavigate?.(a); };

  if (loading) {
    return (
      /* Three-up on the console via intrinsic track sizing, not a breakpoint
         (CONVENTIONS.md §10). A Stat cannot render below ~200px: at
         grid-cols-3 on a 390px phone each tile got 103px and the number,
         label and icon ran 97px past the tile. auto-fit collapses the empty
         tracks, so three tiles still fill the row exactly on desktop. */
      <div className={`grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 ${className}`.trim()} aria-hidden="true">
        <SkeletonStat /><SkeletonStat /><SkeletonStat />
      </div>
    );
  }

  const live = !loading && !offline && stats;
  const tiles: Tile[] = [
    { key: "clipboard", label: "Changes", tone: "green", num: live ? stats!.changes : null, sub: live ? "This week" : null },
    { key: "check", label: "Facts to review", tone: "red", num: live ? stats!.factsReview : null, sub: live ? (stats!.factsReview > 0 ? "Awaiting verification" : "All verified") : null },
    { key: "play", label: "Flows running", tone: "blue", num: live ? stats!.flowsRunning : null, sub: live ? (stats!.flowsRunning > 0 ? "All healthy" : "Idle") : null },
  ];

  return (
    <div className={`grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 ${className}`.trim()}>
      {tiles.map((t) => {
        /* Six- and seven-figure counts need thousands separators to stay
           readable at 24px: 1284905 reads as noise, 1,284,905 reads as a number. */
        const value = t.num == null ? "n/a" : t.num.toLocaleString("en-US");
        const sub = t.sub ?? "Unavailable";
        const accentStyle: CSSProperties = { position: "absolute", inset: "0 auto 0 0", width: 4, borderRadius: "6px 0 0 6px" };
        return (
          <div key={t.key} className="relative">
            {swatch && <span style={accentStyle} className={ACCENT[t.tone]} aria-hidden />}
            <Stat
              value={value}
              label={t.label}
              sub={sub}
              tone={STAT_TONE[t.tone]}
              icon={<IconRing tone={RING_TONE[t.tone]} size={31}>{STAT_ICONS[t.key]}</IconRing>}
              onClick={() => go(STAT_AREA[t.key])}
              className={swatch ? "pl-4" : ""}
            />
          </div>
        );
      })}
      {area && <span className="sr-only" role="status">navigating to {area}</span>}
    </div>
  );
}
