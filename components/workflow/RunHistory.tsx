import { Chip, StatusChip, DryChip, type ChipStatus } from "../data-display/Chip";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { SkeletonTable } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { card } from "../tokens/card";
import { fmtDate, fmtDateTime, type DateInput } from "../tokens/format";

/* Run history: the durable list of prior workflow runs. Selecting a row
   calls onSelect(run); the parent swaps the RunPanel into the detail slot.

   The dry-run marker is <DryChip> from the chip system, not a hand-rolled
   rubber-stamp span. It used to be a rotated dashed label that matched nothing
   else on the page (CONVENTIONS.md §4). */

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

/** Run lifecycle chip — maps engine statuses onto the one chip system.
    The dry-run marker sits to the LEFT of the status: it qualifies the whole
    run, so it reads first, and the status chip stays in the same position
    whether or not a run was dry. */
export function RunStatusChip({ status, dry }: { status: RunStatus; dry?: boolean }) {
  const mapped = CHIP_OF[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {dry && <DryChip />}
      {mapped ? <StatusChip status={mapped} /> : <Chip label={LABEL[status]} tone="neutral" />}
    </span>
  );
}

/* overflow-wrap:anywhere, not break-words: only "anywhere" shrinks a cell's
   min-content width, so one unbroken token cannot stretch the table past the
   panel and push the trailing columns out of sight. */
const td = `${tdPad} text-[13px] text-ink/75 border-b border-ink/[0.06] [overflow-wrap:anywhere]`;

/** Placeholder for a value the engine never recorded. Never an em dash (§5). */
const NONE = "Not recorded";

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
  const capped = runs.slice(0, limit);
  const { sort, onSort, sorted: list } = useSort(capped, {
    number: (r) => r.number,
    workflowName: (r) => r.workflowName,
    trigger: (r) => r.triggeredBy || r.rows?.[0]?.detail || "",
    status: (r) => r.status,
    started: (r) => new Date(r.started).getTime() || 0,
    duration: (r) => r.duration || "",
    headline: (r) => r.headline || "",
  });
  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <div className="mt-0.5 text-[12px] text-ink/70">Durable and complete: every run, including tests. Select one to inspect its steps.</div>
      </div>
      {loading ? (
        <div className="px-4 pb-4">
          <SkeletonTable rows={6} cols={6} className="border-0" />
        </div>
      ) : list.length === 0 ? (
        <div className="px-4 pb-4 text-[12.5px] text-ink/70">No runs yet. Start the flow to see history here.</div>
      ) : (
        <Scrollable>
          {/* table-fixed + a colgroup: column widths are declared, not derived
              from the longest word, so a long unbroken value can neither push
              the trailing columns out of sight nor squeeze its neighbours to a
              letter per line. */}
          <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 880 }}>
            <colgroup>
              <col style={{ width: "7%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr>
                <SortHeader label="Run" sortKey="number" sort={sort} onSort={onSort} />
                <SortHeader label="Flow" sortKey="workflowName" sort={sort} onSort={onSort} />
                <SortHeader label="Trigger cause" sortKey="trigger" sort={sort} onSort={onSort} />
                <SortHeader label="Started" sortKey="started" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Duration" sortKey="duration" sort={sort} onSort={onSort} align="center" />
                {/* Rows are clickable, so status is second-to-last (§3). */}
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                <SortHeader label="Headline" sortKey="headline" sort={sort} onSort={onSort} />
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
                    <td className={`${td} font-term text-ink whitespace-nowrap`}>#{r.number}</td>
                    <td className={`${td} text-ink break-words`}>{r.workflowName}</td>
                    <td className={`${td} break-words`}>{r.triggeredBy || r.rows?.[0]?.detail || NONE}</td>
                    <td className={`${td} text-center font-term text-[12px] text-ink/70 whitespace-nowrap`}>{fmtDate(r.started)}</td>
                    <td className={`${td} text-center font-term text-ink/70`}>{r.duration || NONE}</td>
                    <td className={td}><RunStatusChip status={r.status} dry={r.dry} /></td>
                    <td className={td}>{r.headline || r.rows?.[r.rows.length - 1]?.detail || NONE}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Scrollable>
      )}
    </div>
  );
}

/** Re-render an engine "started" label through the canonical formatter. */
export const fmtStarted = (started: DateInput) => fmtDateTime(started);
