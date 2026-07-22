import { Chip, StatusChip, type ChipStatus } from "../data-display/Chip";
import { SkeletonTable } from "../data-display/Skeleton";
import { card } from "../tokens/card";
import { fmtDateTime, type DateInput } from "../tokens/format";

/* Run history — the durable list of prior workflow runs. Selecting a row
   calls onSelect(run); the parent swaps the RunPanel into the detail slot. */

export type RunStatus = "passed" | "running" | "waiting" | "failed" | "skipped" | "pending";

export type RunStepRow = {
  step: string;
  status: RunStatus;
  detail?: string;
  duration?: string;
};

export type RunStat = { label: string; value: number; bad?: boolean };

export type WorkflowRun = {
  id: string;
  number: number;
  workflowName: string;
  status: RunStatus;
  /** When the run started — anything fmtDateTime accepts. */
  started: DateInput;
  duration?: string;
  /** Provenance for auto-started runs; omit for manual runs. */
  triggeredBy?: string;
  /** Dry run — transforms execute but side effects become previews. */
  dry?: boolean;
  /** Per-step timeline; may be empty if the log wasn't retained. */
  rows?: RunStepRow[];
  /** Recorded outcome counters shown in the run panel. */
  stats?: RunStat[];
  /** One-line result summary for the history table. */
  headline?: string;
};

const CHIP_OF: Partial<Record<RunStatus, ChipStatus>> = {
  passed: "approved",
  running: "running",
  waiting: "needs-review",
  failed: "failed",
};

const LABEL: Record<RunStatus, string> = {
  passed: "Passed", running: "Running", waiting: "Waiting",
  failed: "Failed", skipped: "Skipped", pending: "Pending",
};

/** Run lifecycle chip — maps engine statuses onto the one chip system. */
export function RunStatusChip({ status, dry }: { status: RunStatus; dry?: boolean }) {
  const mapped = CHIP_OF[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      {mapped ? <StatusChip status={mapped} /> : <Chip label={LABEL[status]} tone="neutral" />}
      {dry && <span className="rotate-[-2deg] rounded-[4px] border border-dashed border-espelette/50 px-1.5 py-[1px] font-term text-[9px] font-semibold tracking-[0.12em] text-espelette">DRY</span>}
    </span>
  );
}

const th = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60 px-4 py-2.5 border-y border-ink/10";
const td = "px-4 py-2.5 text-[13px] text-ink/70 border-b border-ink/[0.06]";

export type RunHistoryProps = {
  runs: WorkflowRun[];
  selectedId?: string | null;
  onSelect?: (run: WorkflowRun) => void;
  /** Cap the number of rows shown. */
  limit?: number;
  title?: string;
  /** Show a content-shaped table skeleton instead of rows. */
  loading?: boolean;
  className?: string;
};

export function RunHistory({
  runs, selectedId = null, onSelect, limit = 12, title = "Run history", loading = false, className = "",
}: RunHistoryProps) {
  const list = runs.slice(0, limit);
  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <div className="mt-0.5 text-[12px] text-ink/55">Durable and complete — every run, including tests. Select one to inspect its steps.</div>
      </div>
      {loading ? (
        <div className="px-4 pb-4">
          <SkeletonTable rows={6} cols={6} className="border-0" />
        </div>
      ) : list.length === 0 ? (
        <div className="px-4 pb-4 text-[12.5px] text-ink/55">No runs yet — start the flow to see history here.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className={th}>Run</th>
                <th className={th}>Flow</th>
                <th className={th}>Trigger cause</th>
                <th className={th}>Status</th>
                <th className={th}>Duration</th>
                <th className={th}>Headline</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const selected = r.id === selectedId;
                return (
                  <tr
                    key={r.id}
                    onClick={onSelect ? () => onSelect(r) : undefined}
                    className={[
                      onSelect ? "cursor-pointer" : "",
                      selected ? "bg-espelette/[0.05]" : "hover:bg-flysch",
                    ].join(" ")}
                  >
                    <td className={`${td} font-term text-ink`}>
                      #{r.number}{r.dry && <span className="ml-1.5 rotate-[-2deg] inline-block rounded-[4px] border border-dashed border-espelette/50 px-1 py-[1px] text-[9px] font-semibold tracking-[0.12em] text-espelette">DRY</span>}
                    </td>
                    <td className={`${td} text-ink`}>{r.workflowName}</td>
                    <td className={td}>{r.triggeredBy || r.rows?.[0]?.detail || "—"}</td>
                    <td className={td}><RunStatusChip status={r.status} /></td>
                    <td className={`${td} font-term text-ink/55`}>{r.duration || "—"}</td>
                    <td className={`${td} max-w-[280px] truncate`}>{r.headline || r.rows?.[r.rows.length - 1]?.detail || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Re-render an engine "started" label through the canonical formatter. */
export const fmtStarted = (started: DateInput) => fmtDateTime(started);
