import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { fmtDate, type DateInput } from "../tokens/format";

/* Scrubber — an "as-of" timeline scrubber that snaps to real event dates and
   shows activity density beneath the track (Wayback-style). Ported from the
   console's lineage Scrubber, made fully controlled and router-free.

   `value` is the selected index into `dates`, or null for "all time" (the
   rightmost position). `onChange` emits the new index, or null when the
   scrubber lands on the latest date. */

export type ScrubberActivity = { date: string; count: number };

export type ScrubberProps = {
  /** Ordered event dates (ISO or Date-parseable), oldest first. */
  dates: DateInput[];
  /** Per-date activity counts, drawn as density bars under the track. */
  activity?: ScrubberActivity[];
  /** Selected index into `dates`, or null = "all time". */
  value: number | null;
  onChange: (index: number | null) => void;
  /** Format a date for the label; defaults to fmtDate. */
  format?: (d: DateInput) => string;
  className?: string;
};

export function Scrubber({ dates, activity = [], value, onChange, format = fmtDate, className = "" }: ScrubberProps) {
  const lastIdx = Math.max(0, dates.length - 1);
  const effIdx = value == null ? lastIdx : Math.min(Math.max(0, value), lastIdx);
  const empty = dates.length === 0;
  const isoDates = dates.map(String);
  const maxActivity = Math.max(1, ...activity.map((a) => a.count));

  const step = (delta: number) => {
    const next = effIdx + delta;
    if (next <= 0) return onChange(0);
    if (next >= lastIdx) return onChange(null);
    onChange(next);
  };

  const label = value == null ? "All time" : `As of ${format(dates[effIdx])}`;
  const btn = `grid place-items-center w-8 h-8 shrink-0 rounded-[4px] border border-ink/20 bg-paper text-ink/70 hover:border-ink/45 hover:text-ink disabled:opacity-40 disabled:pointer-events-none ${focusRing}`;

  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <button type="button" className={btn} onClick={() => step(-1)} disabled={empty} aria-label="Step back one event date">
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => onChange(null)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 shrink-0 rounded-[4px] border border-ink/20 bg-paper font-term text-[12px] text-ink/75 hover:border-ink/45 hover:text-ink ${focusRing}`}
        title={dates.length ? `Events ${format(dates[0])} – ${format(dates[lastIdx])} · click to reset` : undefined}
      >
        <Calendar size={14} /> {label}
      </button>

      <div className="relative flex-1 min-w-[8rem] h-8">
        {/* activity density */}
        <svg className="absolute inset-x-0 bottom-2 h-4 w-full" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden>
          {activity.map((a) => {
            const i = isoDates.indexOf(a.date);
            if (i < 0) return null;
            const x = lastIdx > 0 ? (i / lastIdx) * 97 + 1.5 : 50;
            const h = 2 + (a.count / maxActivity) * 12;
            return <rect key={a.date} x={x - 0.6} y={14 - h} width={1.2} height={h} rx={0.5} className="fill-espelette" opacity={0.45} />;
          })}
        </svg>
        {/* baseline */}
        <div className="absolute inset-x-0 bottom-[7px] h-px bg-ink/15" />
        {/* selection window */}
        {!empty && (
          <div
            className="absolute bottom-[3px] h-1.5 rounded-full bg-biscay-2/25 ring-1 ring-inset ring-biscay-2/40 pointer-events-none"
            style={{ left: `${(effIdx / Math.max(1, lastIdx)) * 100}%`, width: 14, transform: "translateX(-50%)" }}
          />
        )}
        <input
          type="range"
          className={`absolute inset-x-0 bottom-0 w-full cursor-pointer accent-biscay-2 ${focusRing}`}
          min={0}
          max={lastIdx}
          value={effIdx}
          disabled={empty}
          aria-label="As-of date (snaps to event dates)"
          onChange={(e) => {
            const i = Number(e.target.value);
            onChange(i >= lastIdx ? null : i);
          }}
        />
      </div>

      <button type="button" className={btn} onClick={() => step(1)} disabled={empty} aria-label="Step forward one event date">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
