import type { ReactNode } from "react";
import { CheckCircle2, Play, XCircle, Clock, RefreshCw, Sparkles, MoreVertical } from "lucide-react";
import { card } from "../tokens/card";
import { Chip } from "./Chip";
import { Sparkline } from "./Sparkline";
import { Button } from "../actions/Button";
import { Menu, MenuItem } from "../navigation/Menu";

/* ConnectorCard — one connected-source pulse card: provider mark, name, a
   health chip, document counts, a live sync line, and a mini activity
   sparkline. Ported from pages/sources/ConnectorCard.tsx; the sync-status
   query + gql mutations are lifted out — state comes in as props, and each
   action is a callback. */

export type ConnectorHealth = "Healthy" | "Syncing" | "Error" | "Paused" | "Backfilling";

const HEALTH: Record<ConnectorHealth, { tone: string; icon: ReactNode }> = {
  Healthy: { tone: "ok", icon: <CheckCircle2 size={12} /> },
  Syncing: { tone: "attention", icon: <Play size={12} /> },
  Backfilling: { tone: "attention", icon: <Play size={12} /> },
  Error: { tone: "blocked", icon: <XCircle size={12} /> },
  Paused: { tone: "neutral", icon: <Clock size={12} /> },
};

const SPARK_TONE: Record<ConnectorHealth, "ok" | "attention" | "blocked" | "neutral"> = {
  Healthy: "ok", Syncing: "attention", Backfilling: "attention", Error: "blocked", Paused: "neutral",
};

export type ConnectorCardProps = {
  name: string;
  /** Provider logo/mark (e.g. an <img> or brand glyph). */
  mark?: ReactNode;
  health?: ConnectorHealth;
  /** Document/chunk counts line. */
  counts?: ReactNode;
  /** Sync-status line — "Last sync: …", a running phase, or an error. */
  sync?: ReactNode;
  /** Recent activity, rendered as a sparkline. */
  bars?: number[];
  busy?: boolean;
  running?: boolean;
  paused?: boolean;
  /** Show the "Full resync" action (connector-framework / GitHub sources). */
  canResync?: boolean;
  onSyncNow?: () => void;
  onFullResync?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
};

export function ConnectorCard({
  name, mark, health = "Healthy", counts, sync, bars,
  busy = false, running = false, paused = false, canResync = false,
  onSyncNow, onFullResync, onPause, onResume, className = "",
}: ConnectorCardProps) {
  const h = HEALTH[health];
  const hasMenu = Boolean(onSyncNow || onFullResync || onPause || onResume);
  return (
    <div className={`${card} p-4 ${paused ? "opacity-70" : ""} ${className}`.trim()}>
      <div className="flex items-center gap-3">
        {mark && <span className="grid place-items-center shrink-0 w-[26px] h-[26px]">{mark}</span>}
        <span className="min-w-0 flex-1 flex flex-col gap-1">
          <b className="text-[14px] font-semibold text-ink truncate">{name}</b>
          <Chip label={health} tone={h.tone} icon={h.icon} className="self-start" />
        </span>
        {hasMenu && (
          <Menu trigger={<Button icon aria-label={`Actions for ${name}`}><MoreVertical size={15} /></Button>}>
            {onSyncNow && (
              <MenuItem icon={<RefreshCw size={13} />} disabled={busy || running || paused} onSelect={onSyncNow}>
                {running ? "Sync running…" : "Sync now"}
              </MenuItem>
            )}
            {canResync && onFullResync && (
              <MenuItem icon={<Sparkles size={13} />} disabled={busy || running} onSelect={onFullResync}>Full resync</MenuItem>
            )}
            {paused
              ? onResume && <MenuItem icon={<Play size={13} />} disabled={busy} onSelect={onResume}>Resume</MenuItem>
              : onPause && <MenuItem icon={<Clock size={13} />} disabled={busy} onSelect={onPause}>Pause</MenuItem>}
          </Menu>
        )}
      </div>
      {counts && <div className="mt-3 font-term text-[11.5px] text-ink/60">{counts}</div>}
      {sync && <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink/70">{sync}</div>}
      {bars && bars.length > 1 && (
        <div className="mt-3">
          <Sparkline values={bars} width={150} height={20} tone={SPARK_TONE[health]} />
        </div>
      )}
    </div>
  );
}
