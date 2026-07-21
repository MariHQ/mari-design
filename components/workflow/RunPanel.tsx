import { Check, X, Clock, CornerDownRight, RefreshCw, Eye, Bell } from "lucide-react";
import { Button } from "../actions/Button";
import { Spinner } from "../data-display/Spinner";
import { card } from "../tokens/card";
import { fmtDateTime } from "../tokens/format";
import { RunStatusChip, type RunStatus, type WorkflowRun } from "./RunHistory";

/* Run panel — detail of one selected run: its step timeline, recorded stats,
   and (when waiting) the approval affordance. Self-contained: actions are
   surfaced as optional callbacks, so the parent decides what "approve" and
   "re-run" mean. */

function TimelineIcon({ status }: { status: RunStatus }) {
  if (status === "passed") return <Check size={12} strokeWidth={2.4} className="text-moss" />;
  if (status === "running") return <Spinner size="sm" label="Step running" />;
  if (status === "waiting") return <Clock size={12} className="text-clay" />;
  if (status === "failed") return <X size={12} strokeWidth={2.2} className="text-espelette" />;
  if (status === "skipped") return <CornerDownRight size={12} className="text-ink/35" />;
  return <span className="inline-block h-2 w-2 rounded-full border border-ink/30" />;
}

const RING: Record<RunStatus, string> = {
  passed: "border-moss/50 bg-moss/[0.06]",
  running: "border-biscay-2/50 bg-biscay-2/[0.06]",
  waiting: "border-clay/50 bg-clay/[0.08]",
  failed: "border-espelette/50 bg-espelette/[0.06]",
  skipped: "border-ink/15 bg-ink/[0.03]",
  pending: "border-ink/15 bg-paper",
};

export type RunPanelProps = {
  run: WorkflowRun | null;
  onClose?: () => void;
  onApprove?: (run: WorkflowRun) => void;
  onRerun?: (run: WorkflowRun, dry: boolean) => void;
  /** Disables the action buttons while a mutation is in flight. */
  busy?: boolean;
  /** Transient status line under the actions (e.g. "Approved — resuming."). */
  note?: string | null;
  className?: string;
};

export function RunPanel({ run, onClose, onApprove, onRerun, busy = false, note, className = "" }: RunPanelProps) {
  if (!run) {
    return (
      <div className={`${card} flex items-center gap-2 px-5 py-6 text-[13px] text-ink/55 ${className}`}>
        <Spinner size="sm" label="Waiting" /> Select a run to inspect its steps.
      </div>
    );
  }

  const waitingRow = run.rows?.find((r) => r.status === "waiting");

  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-3.5">
        <span className="font-display text-[17px] font-bold text-ink">Run #{run.number}</span>
        <RunStatusChip status={run.status} dry={run.dry} />
        <span className="flex-1" />
        {onClose && <Button variant="link" onClick={onClose} aria-label="Close run panel"><X size={15} /></Button>}
      </div>

      <div className="px-5 py-4">
        <div className="font-term text-[11.5px] text-ink/55">
          {run.workflowName} · started {fmtDateTime(run.started)}{run.duration ? ` · ${run.duration}` : ""}
          {run.dry && " · no side effects were written"}
        </div>
        {run.triggeredBy && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-moss">
            <Bell size={12} /> {run.triggeredBy}
          </div>
        )}

        {run.rows?.length ? (
          <ol className="mt-4 flex flex-col gap-2">
            {run.rows.map((r, i) => (
              <li key={`${r.step}-${i}`} className="flex items-start gap-2.5">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${RING[r.status]}`}>
                  <TimelineIcon status={r.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`text-[13.5px] font-medium ${r.status === "skipped" ? "text-ink/45" : "text-ink"}`}>{r.step}</span>
                    {r.duration && <span className="font-term text-[10.5px] text-ink/40">{r.duration}</span>}
                  </span>
                  <div className="text-[12px] leading-snug text-ink/55">{r.detail || "—"}</div>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 text-[12.5px] text-ink/55">
            The step log wasn't retained for this run — the stats below are the recorded outcome.
          </div>
        )}

        {run.stats && run.stats.length > 0 && (
          <div
            className="mt-4 grid gap-px overflow-hidden rounded-[6px] border border-ink/10 bg-ink/10"
            style={{ gridTemplateColumns: `repeat(${Math.min(4, run.stats.length)}, minmax(0,1fr))` }}
          >
            {run.stats.map((s) => (
              <div key={s.label} className="bg-paper px-3 py-2.5">
                <div className="font-term text-[10px] uppercase tracking-[0.08em] text-ink/50">{s.label}</div>
                <div className={`text-[20px] font-bold leading-tight ${s.bad ? "text-espelette" : "text-ink"}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {run.status === "waiting" && (
          <div className="mt-4 rounded-[6px] border border-dashed border-clay/45 bg-clay/[0.06] px-3.5 py-3 text-[12.5px] text-clay">
            Paused for approval{waitingRow?.detail ? ` — ${waitingRow.detail}` : ""}. Nothing downstream runs until someone approves.
          </div>
        )}
      </div>

      {(onApprove || onRerun) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 px-5 py-3">
          {run.status === "waiting" && onApprove && (
            <Button variant="primary" compact disabled={busy} onClick={() => onApprove(run)}>
              <Check size={13} /> Approve & resume
            </Button>
          )}
          {onRerun && (
            <>
              <Button compact disabled={busy} title="Re-runs every step for real, including side effects" onClick={() => onRerun(run, false)}>
                <RefreshCw size={13} /> Re-run
              </Button>
              <Button compact disabled={busy} title="Re-runs transforms for real; side effects become previews" onClick={() => onRerun(run, true)}>
                <Eye size={13} /> Re-run as test
              </Button>
            </>
          )}
          {note && <span className="font-term text-[11.5px] text-moss">{note}</span>}
        </div>
      )}
    </div>
  );
}
