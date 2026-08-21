import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { Button } from "../actions/Button";
import { StatusChip, DryChip } from "../data-display/Chip";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Skeleton, SkeletonTable, SkeletonCard } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { ResultCount } from "../data-display/Pagination";
import { ShowRest } from "../data-display/ShowRest";
import { why } from "../actions/useWrite";
import { type WorkflowRun, type RunStatus } from "../workflow/RunHistory";
import { RUN_STATUS_CHIP } from "../tokens/runStatus";
import { RunStatusChips, RunInspector, FLOWS_SPLIT, type FlowsRunActions } from "./FlowsRunPanel";
import { card } from "../tokens/card";
import { fmtDate } from "../tokens/format";

/* Flows run history — the durable, complete run-history table: every run,
   including test runs, click-to-inspect.

   The table is local (FlowRunsTable) rather than workflow/RunHistory so the
   console's own vocabulary is the only one on screen: statuses render through
   RunStatusChips (engine status → console chip, dry marker as the canonical
   DryChip, never a rotated sticker), the status column sits second-to-last
   because each row carries a trailing Inspect action (CONVENTIONS §3), and
   every header goes through SortHeader with the shared thPad/tdPad spacing.
   Provenance ("triggered by") lives in the inspector rather than a seventh
   column, which is what used to push the Inspect action off the right edge.
   Selecting a row swaps RunInspector into the detail slot, the same inspector
   the run panel uses. FlowsPipelineEditor reuses FlowRunsTable. Standalone. */

/** Legend: the engine's status words, shown in the chip each one maps to. */
const CHIP_LEGEND: { status: RunStatus; label: string }[] = [
  { status: "passed", label: "Passed" },
  { status: "running", label: "Running" },
  { status: "waiting", label: "Waiting" },
  { status: "failed", label: "Failed" },
  { status: "skipped", label: "Skipped" },
  { status: "pending", label: "Pending" },
];

/** Placeholder for a value the engine never recorded. Never an em dash (§5). */
const NONE = "Not recorded";

const td = `${tdPad} text-[13px] text-ink/75 border-b border-ink/[0.06] align-middle`;

/** A recorded duration in seconds, for ordering. The engine writes several
    shapes ("00:04:12", "12m", "9s", "1h 2m"), and sorting them as TEXT put
    "9s" after "12m" — the column claimed to rank by length and ranked by first
    character (WF4). Unparseable stays 0 rather than becoming a guess. */
export function durationSeconds(d: string | undefined): number {
  if (!d) return 0;
  const clock = d.trim().match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (clock) {
    const [, a, b, c] = clock;
    return c === undefined
      ? Number(a) * 60 + Number(b)
      : Number(a) * 3600 + Number(b) * 60 + Number(c);
  }
  let secs = 0;
  let matched = false;
  const UNIT: Record<string, number> = { h: 3600, m: 60, s: 1, ms: 0.001 };
  for (const m of d.matchAll(/(\d+(?:\.\d+)?)\s*(ms|[hms])/gi)) {
    secs += Number(m[1]) * UNIT[m[2].toLowerCase()];
    matched = true;
  }
  if (matched) return secs;
  const plain = Number(d.trim());
  return Number.isFinite(plain) ? plain : 0;
}

export type FlowRunsTableProps = {
  runs: WorkflowRun[];
  selectedId?: string | null;
  onSelect?: (run: WorkflowRun) => void;
  /** Cap the number of rows shown. */
  limit?: number;
  title?: string;
  hint?: string;
  /** Table-level action, rendered top right (CONVENTIONS §2). */
  actions?: ReactNode;
  loading?: boolean;
  className?: string;
};

/* The one run table for the Flows area. Exported so the pipeline editor shows
   the identical table under the spine instead of a second dialect. */
export function FlowRunsTable({
  runs, selectedId = null, onSelect, limit = 12, title = "Run history",
  hint = "Durable and complete: every run, including tests. Inspect one to see its steps.",
  actions, loading = false, className = "",
}: FlowRunsTableProps) {
  const [showAll, setShowAll] = useState(false);
  /* Sort the WHOLE history, then take a page of it. It used to cap first and
     sort the cap, so "longest run" meant "longest of the first twelve" and the
     header ranked a page rather than the history it names (WF3). */
  const { sort, onSort, sorted } = useSort(runs, {
    number: (r) => r.number,
    workflowName: (r) => r.workflowName,
    started: (r) => new Date(r.started).getTime() || 0,
    duration: (r) => durationSeconds(r.duration),
    headline: (r) => r.headline || "",
    status: (r) => RUN_STATUS_CHIP[r.status],
  });
  /* A flow's history is thousands of runs long. The table renders one page,
     says so above the rows (§13), and the region itself scrolls (§20) instead
     of the card growing to the height of the history. */
  const page = showAll ? sorted.slice(0, limit * 4) : sorted.slice(0, limit);

  return (
    <div className={`${card} overflow-hidden ${className}`}>
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <div className="mt-0.5 text-[12px] text-ink/70">{hint}</div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {loading ? (
        <div className="px-4 pb-4"><SkeletonTable rows={6} cols={6} className="border-0" /></div>
      ) : page.length === 0 ? (
        <div className="px-4 pb-4 text-[12.5px] text-ink/70">No runs yet. Start the automation to see history here.</div>
      ) : (
        <>
        {/* The count says what is on screen and the toggle says how to see the
            rest, both above the rows (§13). The toggle used to say "Show more"
            here and "Show all" in the flow list, for the same affordance. */}
        <ResultCount
          from={1}
          to={page.length}
          total={runs.length}
          noun="runs"
          actions={runs.length > limit
            ? <ShowRest expanded={showAll} total={runs.length} onToggle={() => setShowAll((v) => !v)} />
            : undefined}
        />
        <Scrollable axis="both" style={{ maxHeight: page.length > 8 ? 520 : undefined }}>
          <table className="w-full border-collapse text-left" style={{ minWidth: onSelect ? 720 : 620 }}>
            <thead>
              <tr>
                <SortHeader label="Run" sortKey="number" sort={sort} onSort={onSort} />
                <SortHeader label="Automation" sortKey="workflowName" sort={sort} onSort={onSort} />
                <SortHeader label={<>Started<span className="block normal-case tracking-normal text-ink/65">duration</span></>} sortKey="started" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Result" sortKey="headline" sort={sort} onSort={onSort} />
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                {/* Only when the row is actually actionable: an empty action
                    column reads as a broken table. */}
                {onSelect && <SortHeader label="Inspect" sortable={false} align="right" />}
              </tr>
            </thead>
            <tbody>
              {page.map((r) => {
                const selected = r.id === selectedId;
                return (
                  <tr key={r.id} className={selected ? "bg-espelette/[0.05]" : "hover:bg-flysch"}>
                    <td className={`${td} whitespace-nowrap font-term text-ink`}>#{r.number}</td>
                    <td className={`${td} max-w-[150px] truncate text-ink`}>{r.workflowName}</td>
                    <td className={`${td} whitespace-nowrap text-center font-term text-[12px] text-ink/70`}>
                      {fmtDate(r.started)}
                      <span className="block text-ink/65">{r.duration || NONE}</span>
                    </td>
                    <td className={`${td} max-w-[190px] truncate`}>{r.headline || r.rows?.[r.rows.length - 1]?.detail || NONE}</td>
                    <td className={`${td} whitespace-nowrap`}><RunStatusChips status={r.status} dry={r.dry} /></td>
                    {onSelect && (
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <Button compact aria-label={`Inspect run ${r.number}`} onClick={() => onSelect(r)}>
                          <Eye size={13} /> Inspect
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Scrollable>
        </>
      )}
    </div>
  );
}

export type FlowsRunHistoryProps = {
  /** The runs to table. Required: the page never invents run history. */
  runs: WorkflowRun[];
  /** Cap on rows, newest first. */
  limit?: number;
  /** Side effects the inspector offers. Omitted = read-only history. */
  actions?: FlowsRunActions;
  /** The page's main-column/rail split (§11). */
  split?: string;
  /** Render a content-shaped skeleton silhouette instead of the history. */
  loading?: boolean;
  className?: string;
};

export function FlowsRunHistory({
  runs, limit = 12, actions, split = FLOWS_SPLIT, loading = false, className = "",
}: FlowsRunHistoryProps) {
  const [selId, setSelId] = useState<string | null>(runs[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  /* Seen-sentinel resync (X9): the selection is seeded from the first read and
     a later read may not contain it any more. Inspecting a run the history no
     longer lists is the same failure as a ghost row. */
  const [seenRuns, setSeenRuns] = useState(runs);
  if (seenRuns !== runs) {
    setSeenRuns(runs);
    if (!runs.some((r) => r.id === selId)) setSelId(runs[0]?.id ?? null);
  }

  const selected = selId ? runs.find((r) => r.id === selId) ?? null : null;

  const approve = async (r: WorkflowRun) => {
    setBusy(true);
    setFailed(null);
    try {
      await actions!.approveRun!(r.id);
      setNote(`Approved run #${r.number}: the run is resuming.`);
    } catch (err) {
      setFailed(why(err, `Could not approve run #${r.number}.`));
    } finally {
      setBusy(false);
    }
  };

  /* No invented run row and no invented run number: the server starts the run
     and the next read of the history is what shows it (I1). */
  const rerun = async (r: WorkflowRun, dry: boolean) => {
    setBusy(true);
    setFailed(null);
    setNote(null);
    try {
      await actions!.rerunRun!(r.id, dry);
      setNote(`Re-run of ${r.workflowName} started${dry ? " as a test" : ""}. It appears in this table when the history reloads.`);
    } catch (err) {
      setFailed(why(err, `Could not re-run ${r.workflowName}.`));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`} aria-hidden="true">
        <Skeleton height={44} className="rounded-md" />
        <div className={split}>
          <SkeletonTable rows={7} cols={4} />
          <SkeletonCard lines={6} footer />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Legend: the engine's status words, in the chips the console uses. */}
      <div className={`${card} flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3`}>
        <span className="font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/65">Status mapping</span>
        {CHIP_LEGEND.map((l) => (
          <span key={l.status} className="inline-flex items-center gap-1.5">
            <StatusChip status={RUN_STATUS_CHIP[l.status]} />
            <span className="font-term text-[11px] text-ink/65">{l.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <DryChip />
          <span className="font-term text-[11px] text-ink/65">Test run</span>
        </span>
      </div>

      <div className={split}>
        <FlowRunsTable runs={runs} limit={limit} selectedId={selId} onSelect={(r) => setSelId(r.id)} />
        <div className="xl:sticky xl:top-4">
          <RunInspector
            run={selected}
            onClose={() => { setSelId(null); setNote(null); setFailed(null); }}
            /* Drawn only when a handler exists (§2). */
            onApprove={actions?.approveRun ? (r) => void approve(r) : undefined}
            onRerun={actions?.rerunRun ? (r, dry) => void rerun(r, dry) : undefined}
            busy={busy}
            note={note}
            error={failed}
          />
        </div>
      </div>
    </div>
  );
}
