import { useMemo, useState } from "react";
import { card } from "../tokens/card";
import { Scrubber as ScrubberControl } from "../data-display/Scrubber";
import { fmtDate } from "../tokens/format";
import { Chip } from "../data-display/Chip";
import { DEMO_DATES, DEMO_ACTIVITY } from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage time scrubber (feature: lineage-time-scrubber)

   A Wayback-Machine "as-of" control that snaps to real event dates (document
   updates/creations + edge dates) rather than a continuous calendar. It wraps
   the catalog `Scrubber` primitive (activity-density track + range slider +
   step arrows + reset-to-live) and frames it as the row that sits below the
   graph canvas inside the same card, adding the live "As of …" readout and the
   event-range caption.

   Dragging past the end resets to "All time" (live/latest) rather than pinning
   the last date — the core Wayback behavior — which the primitive already does
   via its `null` value.
   ──────────────────────────────────────────────────────────────────────── */

export type LineageTimeScrubberProps = {
  /** Sorted ISO event dates (snap targets). */
  dates?: string[];
  activity?: { date: string; count: number }[];
  /** Initial selected index, or null = all time / live. */
  value?: number | null;
  className?: string;
};

export function LineageTimeScrubber({
  dates = DEMO_DATES, activity = DEMO_ACTIVITY, value = null, className = "",
}: LineageTimeScrubberProps) {
  const [idx, setIdx] = useState<number | null>(value);
  const lastIdx = Math.max(0, dates.length - 1);
  const effIdx = idx == null ? lastIdx : Math.min(Math.max(0, idx), lastIdx);
  const effAsof = idx == null ? null : dates[effIdx];

  const rangeLabel = useMemo(
    () => (dates.length ? `${fmtDate(dates[0])} – ${fmtDate(dates[lastIdx])}` : "No events"),
    [dates, lastIdx],
  );

  return (
    <div className={`${card} p-3 font-display ${className}`.trim()}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Time travel</span>
          <Chip
            tone={effAsof ? "info" : "neutral"}
            label={effAsof ? `As of ${fmtDate(effAsof)}` : "All time"}
          />
        </div>
        <span className="font-term text-[11px] text-ink/45">{dates.length} events · {rangeLabel}</span>
      </div>

      <ScrubberControl dates={dates} activity={activity} value={idx} onChange={setIdx} />

      <div className="mt-2 font-term text-[11px] text-ink/45">
        {effAsof
          ? "Nodes created after this date are hidden; edits after it show dashed."
          : "Showing the live graph. Drag or step back to travel in time."}
      </div>
    </div>
  );
}
