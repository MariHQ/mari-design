import type { ReactNode } from "react";
import { CheckCircle2, Play, XCircle, Clock, RefreshCw, Sparkles, MoreVertical, Unplug } from "lucide-react";
import { card } from "../tokens/card";
import { Chip } from "./Chip";
import { Sparkline } from "./Sparkline";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Menu, MenuItem } from "../navigation/Menu";
import { Skeleton, SkeletonLine, SkeletonCircle, SkeletonChip } from "./Skeleton";

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
  /** Destructive: drops the connection. Rendered as a two-step
      <ConfirmButton> at the card's bottom left (CONVENTIONS.md §2), not as a
      menu item, because a kebab entry fires on first click. */
  onDisconnect?: () => void;
  /** A write this card attempted that the server refused, verbatim. */
  actionError?: string | null;
  /** Render a content-shaped skeleton placeholder instead of the card. */
  loading?: boolean;
  className?: string;
};

export function ConnectorCard({
  name, mark, health = "Healthy", counts, sync, bars,
  busy = false, running = false, paused = false, canResync = false,
  onSyncNow, onFullResync, onPause, onResume, onDisconnect, actionError = null,
  loading = false, className = "",
}: ConnectorCardProps) {
  if (loading) {
    return (
      <div className={`${card} p-4 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={26} />
          <span className="min-w-0 flex-1 flex flex-col gap-1.5">
            <SkeletonLine w="55%" h={13} />
            <SkeletonChip w={72} />
          </span>
          <SkeletonCircle size={28} />
        </div>
        <SkeletonLine w="42%" h={10} className="mt-3" />
        <SkeletonLine w="60%" h={11} className="mt-2" />
        <Skeleton width={150} height={20} className="mt-3" />
      </div>
    );
  }
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
      {/* text-ink/65 is the meta floor (§6); break-words keeps a long count or
          error line inside the card instead of past its right edge. */}
      {counts && <div className="mt-3 font-term text-[11.5px] text-ink/65 break-words">{counts}</div>}
      {sync && <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink/70 break-words">{sync}</div>}
      {bars && bars.length > 1 && (
        <div className="mt-3">
          <Sparkline values={bars} width={150} height={20} tone={SPARK_TONE[health]} />
        </div>
      )}
      {/* The server's own words, not a generic apology: "bad credentials" and
          "repository not found" are the two things a connector fails on, and
          both tell the user exactly what to change. */}
      {actionError && (
        <p role="alert" className="mt-3 flex min-w-0 items-start gap-1.5 text-[12px] font-medium text-espelette">
          <XCircle size={13} aria-hidden className="mt-[2px] shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{actionError}</span>
        </p>
      )}
      {onDisconnect && (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <ConfirmButton compact disabled={busy} confirmLabel="Disconnect this source?" onConfirm={onDisconnect}>
            <Unplug size={13} /> Disconnect
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
