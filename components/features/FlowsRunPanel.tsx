import { useState } from "react";
import { Check, X, Clock, CornerDownRight, RefreshCw, Eye, Bell } from "lucide-react";
import { Button } from "../actions/Button";
import { Spinner } from "../data-display/Spinner";
import { StatusChip, DryChip, type ChipStatus } from "../data-display/Chip";
import { SkeletonList, SkeletonCard, SkeletonLine } from "../data-display/Skeleton";
import { Truncate } from "../data-display/Truncate";
import { type RunStatus, type WorkflowRun } from "../workflow/RunHistory";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { fmtDateTime } from "../tokens/format";

/* Flows run panel — a non-blocking inspector for a single run: header status,
   provenance, a step timeline, a stats grid, an approval box when waiting, and
   footer actions. It layers beside the live list so the page keeps updating
   behind it. The inspector is local (rather than the workflow RunPanel
   primitive) so the console chip system is the only status vocabulary here:
   the dry-run marker is the canonical DryChip and sits to the LEFT of the
   status chip, and the affirmative "Approve & resume" sits bottom-left under
   the re-run row (CONVENTIONS §2). Renders standalone. */

/** Engine status → the one console chip vocabulary. */
export const RUN_CHIP: Record<RunStatus, ChipStatus> = {
  passed: "approved",
  running: "running",
  waiting: "needs-review",
  failed: "failed",
  skipped: "skipped",
  pending: "queued",
};

/** Run lifecycle chips. Dry marker LEFT of the status chip, everywhere. */
export function RunStatusChips({ status, dry }: { status: RunStatus; dry?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dry && <DryChip />}
      <StatusChip status={RUN_CHIP[status]} />
    </span>
  );
}

const DEMO_RUNS: WorkflowRun[] = [
  {
    id: "r209", number: 209, workflowName: "Translation sync", status: "waiting",
    started: "2026-07-21T08:30:00", duration: "00:01:04",
    triggeredBy: "Triggered by: handbook/pricing.md changed",
    rows: [
      { step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" },
      { step: "Fetch docs", status: "passed", detail: "3 documents matched", duration: "0.8s" },
      { step: "Summarize", status: "passed", detail: "Draft written for review", duration: "42s" },
      { step: "Approval", status: "waiting", detail: "Waiting on Aki K." },
      { step: "Deploy site", status: "pending" },
    ],
    stats: [
      { label: "Edits", value: 6 }, { label: "Contradictions", value: 0 },
      { label: "Links", value: 2 }, { label: "Facts", value: 11 },
    ],
    headline: "Draft written for review, waiting on approval",
  },
  {
    id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed",
    started: "2026-07-20T14:12:00", duration: "00:00:41",
    triggeredBy: "Triggered by: docs/api.md merged",
    rows: [
      { step: "GitHub PR merged", status: "passed", detail: "PR #482", duration: "0.1s" },
      { step: "Fetch docs", status: "passed", detail: "5 documents matched", duration: "0.6s" },
      { step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" },
      { step: "Contradictions?", status: "skipped", detail: "0, yes-branch skipped" },
      { step: "Create task", status: "skipped", detail: "Not on this branch" },
    ],
    stats: [
      { label: "Edits", value: 0 }, { label: "Contradictions", value: 0 },
      { label: "Links", value: 0 }, { label: "Facts", value: 14 },
    ],
    headline: "No contradictions across 5 docs",
  },
  {
    id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true,
    started: "2026-07-19T10:02:00", duration: "00:01:12",
    rows: [
      { step: "GitHub PR merged", status: "passed", detail: "PR #479", duration: "0.1s" },
      { step: "Fetch docs", status: "passed", detail: "4 documents matched", duration: "0.5s" },
      { step: "Fact check", status: "failed", detail: "2 contradictions against accepted facts", duration: "44s" },
      { step: "Contradictions?", status: "passed", detail: "2 > 0, yes-branch taken" },
      { step: "Create task", status: "passed", detail: "Review task previewed (dry run)" },
    ],
    stats: [
      { label: "Edits", value: 3 }, { label: "Contradictions", value: 2, bad: true },
      { label: "Links", value: 1 }, { label: "Facts", value: 9 },
    ],
    headline: "2 contradictions, review task previewed",
  },
];

const DOT: Record<string, string> = {
  passed: "bg-moss", failed: "bg-espelette", running: "bg-biscay-2 animate-pulse",
  waiting: "bg-clay", skipped: "bg-ink/30", pending: "bg-ink/30",
};

const RING: Record<RunStatus, string> = {
  passed: "border-moss/50 bg-moss/[0.06]",
  running: "border-biscay-2/50 bg-biscay-2/[0.06]",
  waiting: "border-clay/50 bg-clay/[0.08]",
  failed: "border-espelette/50 bg-espelette/[0.06]",
  skipped: "border-ink/15 bg-ink/[0.03]",
  pending: "border-ink/15 bg-paper",
};

function TimelineIcon({ status }: { status: RunStatus }) {
  if (status === "passed") return <Check size={12} strokeWidth={2.4} className="text-moss" />;
  if (status === "running") return <Spinner size="sm" label="Step running" />;
  if (status === "waiting") return <Clock size={12} className="text-clay" />;
  if (status === "failed") return <X size={12} strokeWidth={2.2} className="text-espelette" />;
  if (status === "skipped") return <CornerDownRight size={12} className="text-ink/35" />;
  return <span className="inline-block h-2 w-2 rounded-[2px] border border-ink/30" />;
}

export type RunInspectorProps = {
  run: WorkflowRun | null;
  onClose?: () => void;
  onApprove?: (run: WorkflowRun) => void;
  onRerun?: (run: WorkflowRun, dry: boolean) => void;
  busy?: boolean;
  note?: string | null;
  loading?: boolean;
  className?: string;
};

/* The single run inspector used by both the run panel and the run history. */
export function RunInspector({
  run, onClose, onApprove, onRerun, busy = false, note, loading = false, className = "",
}: RunInspectorProps) {
  if (loading) {
    return (
      <div className={`${card} overflow-hidden ${className}`} aria-hidden="true">
        <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-3.5">
          <SkeletonLine w={96} h={16} />
          <SkeletonLine w={64} h={18} />
        </div>
        <div className="px-5 py-4">
          <SkeletonLine w="60%" h={11} />
          <SkeletonList rows={4} className="mt-4 border-0 px-0" />
        </div>
      </div>
    );
  }
  if (!run) {
    return (
      <div className={`${card} flex items-center gap-2 px-5 py-6 text-[13px] text-ink/70 ${className}`}>
        <Spinner size="sm" label="Waiting" /> Select a run to inspect its steps.
      </div>
    );
  }

  const waitingRow = run.rows?.find((r) => r.status === "waiting");
  const canApprove = run.status === "waiting" && Boolean(onApprove);

  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-3.5">
        <span className="font-display text-[17px] font-bold text-ink">Run #{run.number}</span>
        <RunStatusChips status={run.status} dry={run.dry} />
        <span className="flex-1" />
        {onClose && <Button variant="link" onClick={onClose} aria-label="Close run panel"><X size={15} /></Button>}
      </div>

      <div className="px-5 py-4">
        <Truncate
          className="font-term text-[11.5px] text-ink/70"
          title={`${run.workflowName} · started ${fmtDateTime(run.started)}${run.duration ? ` · ${run.duration}` : ""}${run.dry ? " · no side effects were written" : ""}`}
        >
          {run.workflowName} · started {fmtDateTime(run.started)}{run.duration ? ` · ${run.duration}` : ""}
          {run.dry && " · no side effects were written"}
        </Truncate>
        {run.triggeredBy && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-moss">
            <Bell size={12} /> {run.triggeredBy}
          </div>
        )}

        {run.rows?.length ? (
          <ol className="mt-4 flex flex-col gap-2">
            {run.rows.map((r, i) => (
              <li key={`${r.step}-${i}`} className="flex items-start gap-2.5">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[4px] border ${RING[r.status]}`}>
                  <TimelineIcon status={r.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <Truncate className={`text-[13.5px] font-medium ${r.status === "skipped" ? "text-ink/65" : "text-ink"}`}>{r.step}</Truncate>
                    {r.duration && <span className="shrink-0 font-term text-[10.5px] text-ink/65">{r.duration}</span>}
                  </span>
                  <Truncate lines={2} className="text-[12px] leading-snug text-ink/70">{r.detail || "Not recorded"}</Truncate>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-4 text-[12.5px] text-ink/70">
            The step log wasn't retained for this run. The stats below are the recorded outcome.
          </div>
        )}

        {run.stats && run.stats.length > 0 && (
          <div
            className="mt-4 grid gap-px overflow-hidden rounded-[6px] border border-ink/10 bg-ink/10"
            style={{ gridTemplateColumns: `repeat(${Math.min(4, run.stats.length)}, minmax(0,1fr))` }}
          >
            {run.stats.map((s) => (
              <div key={s.label} className="min-w-0 bg-paper px-3 py-2.5">
                {/* A mono uppercase label with letter-spacing has a wide
                    min-content: in a quarter-width tile "Contradictions" alone
                    ran 38px past its cell, so it ellipsises (§12). */}
                <Truncate className="font-term text-[10px] uppercase tracking-[0.08em] text-ink/65">{s.label}</Truncate>
                <Truncate className={`text-[20px] font-bold leading-tight ${s.bad ? "text-espelette" : "text-ink"}`} title={String(s.value)}>{s.value}</Truncate>
              </div>
            ))}
          </div>
        )}

        {run.status === "waiting" && (
          <div className="mt-4 rounded-[6px] border border-dashed border-clay/45 bg-clay/[0.06] px-3.5 py-3 text-[12.5px] text-clay">
            Paused for approval{waitingRow?.detail ? `: ${waitingRow.detail}` : ""}. Nothing downstream runs until someone approves.
          </div>
        )}
      </div>

      {(canApprove || onRerun) && (
        <div className="flex flex-col gap-2 border-t border-ink/10 px-5 py-3">
          {/* Re-runs sit ABOVE; the affirmative action is BOTTOM LEFT. */}
          {onRerun && (
            <div className="flex flex-wrap items-center gap-2">
              <Button compact disabled={busy} title="Re-runs every step for real, including side effects" onClick={() => onRerun(run, false)}>
                <RefreshCw size={13} /> Re-run
              </Button>
              <Button compact disabled={busy} title="Re-runs transforms for real; side effects become previews" onClick={() => onRerun(run, true)}>
                <Eye size={13} /> Re-run as test
              </Button>
            </div>
          )}
          {canApprove && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" compact disabled={busy} onClick={() => onApprove!(run)}>
                <Check size={13} /> Approve &amp; resume
              </Button>
            </div>
          )}
          {note && <span className="font-term text-[11.5px] text-moss">{note}</span>}
        </div>
      )}
    </div>
  );
}

export type FlowsRunPanelProps = {
  runs?: WorkflowRun[];
  /** Run number to open by default. */
  openNumber?: number;
  /** Render a content-shaped skeleton silhouette instead of the panel. */
  loading?: boolean;
  className?: string;
};

export function FlowsRunPanel({ runs: initial = DEMO_RUNS, openNumber, loading = false, className = "" }: FlowsRunPanelProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>(initial);
  const [openId, setOpenId] = useState<string | null>(
    (openNumber != null ? runs.find((r) => r.number === openNumber) : runs[0])?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = openId ? runs.find((r) => r.id === openId) ?? null : null;

  const approve = (r: WorkflowRun) => {
    setBusy(true);
    setRuns((rs) => rs.map((x) => (x.id === r.id
      ? { ...x, status: "passed", rows: x.rows?.map((row) => (row.status === "waiting" ? { ...row, status: "passed", detail: "Approved by you" } : row.status === "pending" ? { ...row, status: "passed", detail: "Deployed" } : row)) }
      : x)));
    setNote(`Approved run #${r.number}: the run is resuming.`);
    setBusy(false);
  };

  const rerun = (r: WorkflowRun, dry: boolean) => {
    const nextNumber = Math.max(...runs.map((x) => x.number)) + 1;
    const fresh: WorkflowRun = {
      ...r, id: `r${nextNumber}`, number: nextNumber, status: "running", dry, started: new Date().toISOString(),
      duration: undefined, triggeredBy: undefined, headline: "Re-running…",
      rows: r.rows?.map((row, i) => ({ ...row, status: i === 0 ? "passed" : "pending", detail: i === 0 ? row.detail : undefined, duration: i === 0 ? row.duration : undefined })),
    };
    setRuns((rs) => [fresh, ...rs]);
    setOpenId(fresh.id);
    setNote(`Started run #${nextNumber}${dry ? " as a test" : ""}: this panel is now showing it.`);
  };

  if (loading) {
    return (
      <div className={`grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_400px] ${className}`} aria-hidden="true">
        <SkeletonList rows={5} />
        <SkeletonCard lines={6} footer />
      </div>
    );
  }

  return (
    <div className={`grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_400px] ${className}`}>
      {/* Faux live list behind the panel */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-ink/10 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-ink">Recent runs</h3>
          <div className="mt-0.5 font-term text-[11px] text-ink/65">The panel stays live over the list, no backdrop.</div>
        </div>
        <ul className="divide-y divide-ink/10">
          {runs.map((r) => (
            <li key={r.id}>
              <button
                type="button" onClick={() => { setOpenId(r.id); setNote(null); }}
                aria-current={r.id === openId || undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${r.id === openId ? "bg-espelette/[0.05]" : "hover:bg-flysch"} ${focusRing}`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${DOT[r.status]}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-term text-[13px] text-ink">#{r.number}</span>
                    <span className="truncate text-[13px] font-medium text-ink">{r.workflowName}</span>
                  </span>
                  <span className="block truncate text-[12px] text-ink/70">{r.headline}</span>
                </span>
                <RunStatusChips status={r.status} dry={r.dry} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* The run panel inspector */}
      <div className="lg:sticky lg:top-4">
        <RunInspector
          run={run}
          onClose={() => { setOpenId(null); setNote(null); }}
          onApprove={approve}
          onRerun={rerun}
          busy={busy}
          note={note}
        />
      </div>
    </div>
  );
}
