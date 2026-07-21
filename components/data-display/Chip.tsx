import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";
import { resolveTone, resolveToneKey } from "./Badge";
import { focusRing } from "../tokens/focusRing";

export type ChipTone = "ok" | "attention" | "blocked" | "info" | "neutral";

const DOT: Record<ChipTone, string> = {
  ok: "bg-moss",
  attention: "bg-clay",
  blocked: "bg-espelette",
  info: "bg-biscay-2",
  neutral: "bg-ink/50",
};

export type ChipProps = {
  label: ReactNode;
  tone?: string;
  dot?: boolean;
  pulse?: boolean;
  caps?: boolean;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

/* Chip: Badge's interactive sibling — same 5-tone scale (see Badge.tsx),
   plus a dot/pulse indicator, an icon slot, click-to-select, and a
   remove (×) affordance. Renders a <button> when onClick is given, a
   <span> otherwise. */
export function Chip({
  label, tone = "neutral", dot = false, pulse = false, caps = false, icon,
  selected = false, onClick, onRemove, removeLabel = "Remove", className = "",
}: ChipProps) {
  const toneKey = resolveToneKey(tone) as ChipTone;
  const toneClasses = resolveTone(tone);
  const dotColor = DOT[toneKey];

  const shared = [
    "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] font-term text-[11px] font-medium whitespace-nowrap transition-colors",
    caps && "uppercase tracking-[0.04em]",
    toneClasses,
    selected && "ring-1 ring-biscay-2/60",
    className,
  ].filter(Boolean).join(" ");

  const body = (
    <>
      {dot && (
        <span className="relative inline-flex w-1.5 h-1.5 shrink-0">
          {pulse && <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${dotColor}`} />}
          <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${dotColor}`} />
        </span>
      )}
      {icon}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e: MouseEvent) => { e.stopPropagation(); onRemove(); }}
          aria-label={removeLabel}
          className={`grid place-items-center -mr-0.5 w-3.5 h-3.5 rounded-full hover:bg-ink/10 ${focusRing}`}
        >
          <X size={10} />
        </button>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${shared} hover:border-ink/40 ${focusRing}`}>
        {body}
      </button>
    );
  }
  return <span className={shared}>{body}</span>;
}

/* ── StatusChip: named lifecycle states, mapped onto the 5-tone scale ──── */
export type ChipStatus = "verified" | "canonical" | "approved" | "stale" | "draft" | "retired" | "running" | "failed" | "needs-review";

const STATUS: Record<ChipStatus, { tone: ChipTone; label: string; dot?: boolean; pulse?: boolean }> = {
  verified: { tone: "info", label: "Verified", dot: true },
  canonical: { tone: "ok", label: "Canonical", dot: true },
  approved: { tone: "ok", label: "Approved", dot: true },
  stale: { tone: "attention", label: "Stale", dot: true },
  draft: { tone: "neutral", label: "Draft" },
  retired: { tone: "neutral", label: "Retired" },
  running: { tone: "ok", label: "Running", dot: true, pulse: true },
  failed: { tone: "blocked", label: "Failed", dot: true },
  "needs-review": { tone: "attention", label: "Needs review", dot: true },
};

export function StatusChip({ status, className }: { status: ChipStatus; className?: string }) {
  const s = STATUS[status];
  return <Chip label={s.label} tone={s.tone} dot={s.dot} pulse={s.pulse} className={className} />;
}

/* ── SeverityChip ────────────────────────────────────────────────────── */
export type ChipSeverity = "high" | "med" | "low";

const SEVERITY: Record<ChipSeverity, { tone: ChipTone; label: string }> = {
  high: { tone: "blocked", label: "High" },
  med: { tone: "attention", label: "Med" },
  low: { tone: "neutral", label: "Low" },
};

export function SeverityChip({ severity, className }: { severity: ChipSeverity; className?: string }) {
  const s = SEVERITY[severity];
  return <Chip label={s.label} tone={s.tone} caps className={className} />;
}

/* ── CountChip: numeric bubble ──────────────────────────────────────── */
export function CountChip({ count, tone = "neutral", className = "" }: { count: number; tone?: string; className?: string }) {
  const toneClasses = resolveTone(tone);
  return (
    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full border font-term text-[10.5px] font-medium ${toneClasses} ${className}`}>
      {count}
    </span>
  );
}
