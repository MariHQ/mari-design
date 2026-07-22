import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { card } from "../tokens/card";
import { Spinner } from "../data-display/Spinner";
import { SectionLabel } from "../forms/SectionLabel";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark } from "../icons/marks";

/* SourcesSyncStatus — a visual read-out of the sync state model that powers the
   Sources page (pages/sources/syncStatus.ts). The real module is a headless,
   self-terminating poll; here it's rendered as the two things every consumer
   builds from it: an ordered <PhaseTracker> and the live <SyncPanel> row. The
   phase vocabulary (PHASES / PHASE_LABEL) is exported so it stays canonical.
   Standalone: a self-advancing demo walks a source through every phase. */

export const PHASES = ["listing", "fetching", "chunking", "embedding", "indexing"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABEL: Record<Phase | "done", string> = {
  listing: "Listing", fetching: "Fetching", chunking: "Chunking",
  embedding: "Embedding", indexing: "Indexing", done: "Done",
};

type PhaseState = "pending" | "active" | "done" | "error";

const STATE_STYLE: Record<PhaseState, { ring: string; text: string; icon: ReactNode }> = {
  pending: { ring: "border-ink/25 text-ink/40", text: "text-ink/45", icon: <Clock size={13} /> },
  active: { ring: "border-biscay-2 text-biscay-2", text: "text-ink", icon: <Spinner size="sm" /> },
  done: { ring: "border-moss/50 text-moss", text: "text-ink/70", icon: <CheckCircle2 size={13} /> },
  error: { ring: "border-espelette/50 text-espelette", text: "text-espelette", icon: <Clock size={13} /> },
};

/** PhaseTracker — read-only ordered phase strip. Distinct from Stepper (which
    is a clickable numbered wizard control); this is a status trail. */
export function PhaseTracker({
  current, failed = false, className = "",
}: {
  /** Index into PHASES of the active phase, or the number of phases when done. */
  current: number;
  failed?: boolean;
  className?: string;
}) {
  return (
    <ol className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`.trim()}>
      {PHASES.map((p, i) => {
        const state: PhaseState =
          failed && i === current ? "error" : i < current ? "done" : i === current ? "active" : "pending";
        const st = STATE_STYLE[state];
        return (
          <li key={p} className="flex items-center gap-1.5">
            <span className={`grid place-items-center w-[18px] h-[18px] rounded-full border ${st.ring}`}>{st.icon}</span>
            <span className={`font-term text-[11.5px] ${st.text}`}>{PHASE_LABEL[p]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export type SourcesSyncStatusProps = {
  /** Stop the self-advancing demo animation. */
  animate?: boolean;
  className?: string;
};

export function SourcesSyncStatus({ animate = true, className = "" }: SourcesSyncStatusProps) {
  const [idx, setIdx] = useState(3); // start mid-run on "embedding"

  useEffect(() => {
    if (!animate) return;
    const t = window.setInterval(() => setIdx((i) => (i >= PHASES.length ? 3 : i + 1)), 1600);
    return () => window.clearInterval(t);
  }, [animate]);

  const done = idx >= PHASES.length;
  const perPhase = 100;
  const total = PHASES.length * perPhase;
  const doneCount = Math.min(total, idx * perPhase + (done ? 0 : 60));

  const source: SyncSource = done
    ? {
        id: "gh", name: "GitHub · acme/handbook", mark: <SourceMark provider="github" size={24} />,
        state: "done", docCount: 500, chunkCount: 8912, embeddedCount: 8912,
        lastSyncAt: new Date().toISOString(),
      }
    : {
        id: "gh", name: "GitHub · acme/handbook", mark: <SourceMark provider="github" size={24} />,
        state: "syncing", phase: PHASE_LABEL[PHASES[Math.min(idx, PHASES.length - 1)]],
        done: doneCount, total, chunkCount: 8912, embeddedCount: doneCount * 17,
      };

  return (
    <div className={`grid gap-3 ${className}`.trim()}>
      <div className={`${card} p-4`}>
        <SectionLabel>Sync phases</SectionLabel>
        <div className="mt-3">
          <PhaseTracker current={Math.min(idx, PHASES.length)} />
        </div>
        <p className="mt-3 font-term text-[11px] text-ink/45">
          Polls the server ~1.5s while a sync is running, then stops — a self-terminating poll, not a fixed interval.
        </p>
      </div>
      <SyncPanel sources={[source]} />
    </div>
  );
}
