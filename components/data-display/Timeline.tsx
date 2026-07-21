import type { ReactNode } from "react";
import type { ChipTone } from "./Chip";

/* Timeline — a vertical event timeline: a hairline rail with tone-colored
   nodes, each carrying a title, optional time, description and icon. Distinct
   from Stepper (bounded, ordered process) — this is an open-ended log of
   things that happened. Prop-driven; nodes can carry a custom icon in place
   of the dot. */

const TONE_BG: Record<ChipTone, string> = {
  ok: "bg-moss",
  attention: "bg-clay",
  blocked: "bg-espelette",
  info: "bg-biscay-2",
  neutral: "bg-ink/40",
};

export type TimelineItem = {
  title: ReactNode;
  /** Timestamp / relative time, shown muted beside or under the title. */
  time?: ReactNode;
  description?: ReactNode;
  /** Custom node glyph; replaces the tone dot. */
  icon?: ReactNode;
  tone?: ChipTone;
};

export type TimelineProps = {
  items: TimelineItem[];
  className?: string;
};

export function Timeline({ items, className = "" }: TimelineProps) {
  return (
    <ol className={`relative ${className}`.trim()}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {/* rail */}
            {!last && <span className="absolute left-[8px] top-5 bottom-0 w-px bg-ink/12" aria-hidden />}
            {/* node */}
            <span className="relative z-10 shrink-0 mt-0.5 grid place-items-center w-[17px] h-[17px]">
              {it.icon ? (
                <span className="grid place-items-center w-[17px] h-[17px] rounded-full bg-paper border border-ink/20 text-ink/70">{it.icon}</span>
              ) : (
                <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-paper ${TONE_BG[it.tone ?? "neutral"]}`} />
              )}
            </span>
            <div className="min-w-0 flex-1 -mt-px">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-medium text-ink break-words">{it.title}</span>
                {it.time && <span className="shrink-0 font-term text-[11px] text-ink/50 whitespace-nowrap">{it.time}</span>}
              </div>
              {it.description && <div className="mt-0.5 text-[13px] text-ink/65 break-words">{it.description}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
