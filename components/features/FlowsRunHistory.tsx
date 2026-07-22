import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { Button } from "../actions/Button";
import { StatusChip, DryChip } from "../data-display/Chip";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Skeleton, SkeletonTable, SkeletonCard } from "../data-display/Skeleton";
import { type WorkflowRun, type RunStatus } from "../workflow/RunHistory";
import { RUN_CHIP, RunStatusChips, RunInspector } from "./FlowsRunPanel";
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

const DEMO_RUNS: WorkflowRun[] = [
  { id: "r209", number: 209, workflowName: "Translation sync", status: "running", dry: true, started: "2026-07-21T08:30:00", duration: "00:00:22", triggeredBy: "Triggered by: handbook/pricing.md changed", headline: "Summarizing 3 documents",
    rows: [{ step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" }, { step: "Fetch docs", status: "passed", detail: "3 matched", duration: "0.8s" }, { step: "Summarize", status: "running", detail: "Drafting a summary" }] },
  { id: "r205", number: 205, workflowName: "Translation sync", status: "passed", started: "2026-07-20T08:30:00", duration: "00:01:11", triggeredBy: "Triggered by: handbook/faq.md changed", headline: "Draft approved and deployed",
    stats: [{ label: "Edits", value: 4 }, { label: "Facts", value: 8 }] },
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", triggeredBy: "Triggered by: docs/api.md merged", headline: "No contradictions across 5 docs",
    rows: [{ step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" }] },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true, started: "2026-07-19T10:02:00", duration: "00:01:12", triggeredBy: "Triggered by: docs/limits.md merged", headline: "2 contradictions, review task previewed",
    stats: [{ label: "Contradictions", value: 2, bad: true }, { label: "Facts", value: 9 }] },
  { id: "r97", number: 97, workflowName: "Slack digest", status: "passed", started: "2026-07-20T09:00:00", duration: "00:00:55", triggeredBy: "Triggered by: weekly schedule", headline: "Monday digest sent to #support" },
  { id: "r57", number: 57, workflowName: "Stale sweeper", status: "waiting", started: "2026-07-19T06:00:00", duration: "00:00:31", triggeredBy: "Triggered by: daily schedule", headline: "12 stale docs, waiting on approval",
    rows: [{ step: "Tag docs", status: "passed", detail: "12 docs tagged stale", duration: "1.1s" }, { step: "Approval", status: "waiting", detail: "Waiting on Dana R." }] },
  { id: "r51", number: 51, workflowName: "Stale sweeper", status: "passed", started: "2026-07-18T06:00:00", duration: "00:00:29", triggeredBy: "Triggered by: daily schedule", headline: "8 stale docs assigned" },
  { id: "r40", number: 40, workflowName: "Onboarding checker", status: "skipped", started: "2026-07-17T11:20:00", duration: "00:00:03", headline: "No matching docs, nothing to do" },
];

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
  const capped = runs.slice(0, limit);
  const { sort, onSort, sorted } = useSort(capped, {
    number: (r) => r.number,
    workflowName: (r) => r.workflowName,
    started: (r) => new Date(r.started).getTime() || 0,
    duration: (r) => r.duration || "",
    headline: (r) => r.headline || "",
    status: (r) => RUN_CHIP[r.status],
  });

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
      ) : sorted.length === 0 ? (
        <div className="px-4 pb-4 text-[12.5px] text-ink/70">No runs yet. Start the flow to see history here.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: onSelect ? 720 : 620 }}>
            <thead>
              <tr>
                <SortHeader label="Run" sortKey="number" sort={sort} onSort={onSort} />
                <SortHeader label="Flow" sortKey="workflowName" sort={sort} onSort={onSort} />
                <SortHeader label={<>Started<span className="block normal-case tracking-normal text-ink/65">duration</span></>} sortKey="started" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Result" sortKey="headline" sort={sort} onSort={onSort} />
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                {/* Only when the row is actually actionable: an empty action
                    column reads as a broken table. */}
                {onSelect && <SortHeader label="Inspect" sortable={false} align="right" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
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
        </div>
      )}
    </div>
  );
}

export type FlowsRunHistoryProps = {
  runs?: WorkflowRun[];
  /** Cap on rows, newest first. */
  limit?: number;
  /** Render a content-shaped skeleton silhouette instead of the history. */
  loading?: boolean;
  className?: string;
};

export function FlowsRunHistory({ runs = DEMO_RUNS, limit = 12, loading = false, className = "" }: FlowsRunHistoryProps) {
  const [selId, setSelId] = useState<string | null>(runs[0]?.id ?? null);
  const selected = selId ? runs.find((r) => r.id === selId) ?? null : null;

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`} aria-hidden="true">
        <Skeleton height={44} className="rounded-md" />
        <div className="grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_380px]">
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
            <StatusChip status={RUN_CHIP[l.status]} />
            <span className="font-term text-[11px] text-ink/65">{l.label}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <DryChip />
          <span className="font-term text-[11px] text-ink/65">Test run</span>
        </span>
      </div>

      <div className="grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <FlowRunsTable runs={runs} limit={limit} selectedId={selId} onSelect={(r) => setSelId(r.id)} />
        <div className="lg:sticky lg:top-4">
          <RunInspector run={selected} onClose={() => setSelId(null)} />
        </div>
      </div>
    </div>
  );
}
