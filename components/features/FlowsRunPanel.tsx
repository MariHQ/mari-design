import { useState } from "react";
import { Check, X, Clock, CornerDownRight, RefreshCw, Eye, Bell } from "lucide-react";
import { Button } from "../actions/Button";
import { Spinner } from "../data-display/Spinner";
import { StatusChip, DryChip, type ChipStatus } from "../data-display/Chip";
import { SkeletonList, SkeletonCard, SkeletonLine } from "../data-display/Skeleton";
import { Truncate } from "../data-display/Truncate";
import { FieldError } from "../feedback/ErrorMessage";
import { Scrollable } from "../data-display/Scrollable";
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

/** Steps rendered in the run timeline before the count line takes over. */
const STEP_PAGE = 25;

export type RunInspectorProps = {
  run: WorkflowRun | null;
  onClose?: () => void;
  onApprove?: (run: WorkflowRun) => void;
  onRerun?: (run: WorkflowRun, dry: boolean) => void;
  busy?: boolean;
  note?: string | null;
  /** What the last action said when it failed. Shown under the action row. */
  error?: string | null;
  loading?: boolean;
  className?: string;
};

/* The single run inspector used by both the run panel and the run history. */
export function RunInspector({
  run, onClose, onApprove, onRerun, busy = false, note, error = null, loading = false, className = "",
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
          <>
          {run.rows.length > STEP_PAGE && (
            <div className="mt-4 font-term text-[11px] text-ink/65">
              Showing {STEP_PAGE} of {run.rows.length.toLocaleString()} steps
            </div>
          )}
          <Scrollable axis="y" style={{ maxHeight: run.rows.length > 10 ? 420 : undefined }} scrollerClassName="pr-1">
          <ol className="mt-4 flex flex-col gap-2">
            {run.rows.slice(0, STEP_PAGE).map((r, i) => (
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
          </Scrollable>
          </>
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
          {error && <FieldError>{error}</FieldError>}
          {note && !error && <span className="font-term text-[11.5px] text-moss">{note}</span>}
        </div>
      )}
    </div>
  );
}

/** Runs rendered in the live list beside the panel. */
const LIST_PAGE = 30;

/* One rail width for every Flows surface. The PAGE owns the split (§10/§11:
   components are desktop-first fixed-width), so FlowsPage passes its own
   `PageFrame.SPLIT` value through `split`. This is only the standalone/canvas
   fallback, and the editor, the run panel and the run history all share it —
   they used to own 340px, 400px and 380px each, so the plumb line jumped as
   the user moved between three surfaces of one page (X6). */
export const FLOWS_SPLIT =
  "grid grid-cols-1 items-start gap-5 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_420px]";

/** What a run inspector can DO. Optional, and each control is drawn only when
    its handler exists (§2): a run is a server-side fact, so a panel with no
    handler has nothing honest to echo. */
export type FlowsRunActions = {
  /** Resume a run paused at an approval step. May throw; the panel shows it. */
  approveRun?: (runId: string) => void | Promise<void>;
  /** Start a fresh run of the flow this run belongs to. `dry` is the test run.
      Takes the RUN id: a run row knows its workflow (`workflow_runs.workflow_id`),
      so the host resolves the flow rather than the panel guessing one.
      May throw; the panel shows it. */
  rerunRun?: (runId: string, dry: boolean) => void | Promise<void>;
};

export type FlowsRunPanelProps = {
  /** The runs listed down the left. Required: no invented run history. */
  runs: WorkflowRun[];
  /** Run number to open by default. */
  openNumber?: number;
  /** Side effects the inspector offers. Omitted = a read-only inspector. */
  actions?: FlowsRunActions;
  /** The page's main-column/rail split (§11). */
  split?: string;
  /** Render a content-shaped skeleton silhouette instead of the panel. */
  loading?: boolean;
  className?: string;
};

const defaultOpen = (runs: WorkflowRun[], openNumber?: number) =>
  (openNumber != null ? runs.find((r) => r.number === openNumber) : runs[0])?.id ?? null;

/* The one echo an approval earns. `approve_run` marks the paused row approved
   and puts the run back to running; it says NOTHING about the steps below it,
   because the engine has not reached them yet. This used to rewrite every
   PENDING row to "passed · Deployed", so approving a deploy gate reported a
   deploy that had not happened (I2). The next read of the run replaces it. */
function withApproval(r: WorkflowRun): WorkflowRun {
  if (r.status !== "waiting") return r;
  return {
    ...r,
    status: "running",
    rows: r.rows?.map((row) =>
      row.status === "waiting" ? { ...row, status: "passed", detail: "Approved by you" } : row),
  };
}

export function FlowsRunPanel({
  runs: incoming, openNumber, actions, split = FLOWS_SPLIT, loading = false, className = "",
}: FlowsRunPanelProps) {
  const [approved, setApproved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(defaultOpen(incoming, openNumber));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  /* Seen-sentinel resync (X9). The panel used to copy `runs` into state once
     and never look at the prop again, so every later read was thrown away —
     which is how a locally-minted run row survived every refetch. Props are
     now the only source of run rows; local state carries the selection and the
     approval echo, both of which the incoming read supersedes. */
  const [seenRuns, setSeenRuns] = useState(incoming);
  if (seenRuns !== incoming) {
    setSeenRuns(incoming);
    setApproved([]);
    if (!incoming.some((r) => r.id === openId)) setOpenId(defaultOpen(incoming, openNumber));
  }

  const runs = approved.length
    ? incoming.map((r) => (approved.includes(r.id) ? withApproval(r) : r))
    : incoming;

  const run = openId ? runs.find((r) => r.id === openId) ?? null : null;
  const visible = runs.slice(0, LIST_PAGE);

  const approve = async (r: WorkflowRun) => {
    setBusy(true);
    setFailed(null);
    try {
      await actions!.approveRun!(r.id);
      setApproved((a) => (a.includes(r.id) ? a : [...a, r.id]));
      setNote(`Approved run #${r.number}: the run is resuming.`);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : `Could not approve run #${r.number}.`);
    } finally {
      setBusy(false);
    }
  };

  /* Re-run starts a run on the SERVER and says only that. It used to invent
     the next run number, stamp it with `new Date()` and splice a permanently
     "running" row into a table headed "durable and complete" (I1). The panel
     cannot know the new run's number, so it does not name one. */
  const rerun = async (r: WorkflowRun, dry: boolean) => {
    setBusy(true);
    setFailed(null);
    setNote(null);
    try {
      await actions!.rerunRun!(r.id, dry);
      setNote(`Re-run of ${r.workflowName} started${dry ? " as a test" : ""}. It appears in this list when the runs reload.`);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : `Could not re-run ${r.workflowName}.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`${split} ${className}`} aria-hidden="true">
        <SkeletonList rows={5} />
        <SkeletonCard lines={6} footer />
      </div>
    );
  }

  return (
    <div className={`${split} ${className}`}>
      {/* The live list behind the panel. Every row is a run the caller read;
          the panel has never been allowed to add one. */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-ink/10 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-ink">Recent runs</h3>
          <div className="mt-0.5 font-term text-[11px] text-ink/65">The panel stays live over the list, no backdrop.</div>
        </div>
        {/* Count strip above the list (§13); the list itself scrolls in place
            rather than growing to the height of the run history (§20). */}
        {runs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-2">
            <span className="font-term text-[11.5px] text-ink/65">
              {visible.length < runs.length
                ? `Showing ${visible.length} of ${runs.length.toLocaleString()} runs`
                : `Showing all ${runs.length.toLocaleString()} run${runs.length === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
        <Scrollable axis="y" style={{ maxHeight: visible.length > 8 ? 520 : undefined }}>
        <ul className="divide-y divide-ink/10">
          {visible.map((r) => (
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
        </Scrollable>
      </div>

      {/* The run panel inspector */}
      {/* Sticky from the breakpoint the split actually appears at (xl). */}
      <div className="xl:sticky xl:top-4">
        <RunInspector
          run={run}
          onClose={() => { setOpenId(null); setNote(null); setFailed(null); }}
          /* Drawn only when a handler exists (§2). Both controls report a
             server-side fact, so with nothing behind them there is no local
             behaviour that would not be a lie. */
          onApprove={actions?.approveRun ? (r) => void approve(r) : undefined}
          onRerun={actions?.rerunRun ? (r, dry) => void rerun(r, dry) : undefined}
          busy={busy}
          note={note}
          error={failed}
        />
      </div>
    </div>
  );
}
