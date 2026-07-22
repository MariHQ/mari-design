import { useState } from "react";
import { RunHistory, RunStatusChip, type WorkflowRun } from "../workflow/RunHistory";
import { RunPanel } from "../workflow/RunPanel";
import { Skeleton, SkeletonTable, SkeletonCard } from "../data-display/Skeleton";
import { card } from "../tokens/card";

/* Flows run history — the durable, complete run-history table: every run,
   including test runs, click-to-inspect. RunStatusChip maps engine statuses
   onto the one console chip system (passed→approved, waiting→needs-review,
   running→running, failed→failed; else neutral) and appends a DRY marker.
   Selecting a row swaps the RunPanel into the detail slot. Renders standalone. */

const DEMO_RUNS: WorkflowRun[] = [
  { id: "r209", number: 209, workflowName: "Translation sync", status: "running", dry: true, started: "2026-07-21T08:30:00", duration: "00:00:22", triggeredBy: "Triggered by: handbook/pricing.md changed", headline: "Summarizing 3 documents…",
    rows: [{ step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" }, { step: "Fetch docs", status: "passed", detail: "3 matched", duration: "0.8s" }, { step: "Summarize", status: "running", detail: "Drafting…" }] },
  { id: "r205", number: 205, workflowName: "Translation sync", status: "passed", started: "2026-07-20T08:30:00", duration: "00:01:11", triggeredBy: "Triggered by: handbook/faq.md changed", headline: "Draft approved and deployed",
    stats: [{ label: "Edits", value: 4 }, { label: "Facts", value: 8 }] },
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", triggeredBy: "Triggered by: docs/api.md merged", headline: "No contradictions across 5 docs",
    rows: [{ step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" }] },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true, started: "2026-07-19T10:02:00", duration: "00:01:12", triggeredBy: "Triggered by: docs/limits.md merged", headline: "2 contradictions — review task previewed",
    stats: [{ label: "Contradictions", value: 2, bad: true }, { label: "Facts", value: 9 }] },
  { id: "r97", number: 97, workflowName: "Slack digest", status: "passed", started: "2026-07-20T09:00:00", duration: "00:00:55", triggeredBy: "Triggered by: weekly schedule", headline: "Monday digest sent to #support" },
  { id: "r57", number: 57, workflowName: "Stale sweeper", status: "waiting", started: "2026-07-19T06:00:00", duration: "00:00:31", triggeredBy: "Triggered by: daily schedule", headline: "12 stale docs — waiting on approval",
    rows: [{ step: "Tag docs", status: "passed", detail: "12 docs tagged stale", duration: "1.1s" }, { step: "Approval", status: "waiting", detail: "Waiting on Dana R." }] },
  { id: "r51", number: 51, workflowName: "Stale sweeper", status: "passed", started: "2026-07-18T06:00:00", duration: "00:00:29", triggeredBy: "Triggered by: daily schedule", headline: "8 stale docs assigned" },
  { id: "r40", number: 40, workflowName: "Onboarding checker", status: "skipped", started: "2026-07-17T11:20:00", duration: "00:00:03", headline: "No matching docs — nothing to do" },
];

const CHIP_LEGEND: { status: WorkflowRun["status"]; note: string }[] = [
  { status: "passed", note: "approved" },
  { status: "running", note: "running" },
  { status: "waiting", note: "needs-review" },
  { status: "failed", note: "failed" },
  { status: "skipped", note: "neutral" },
];

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
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <SkeletonTable rows={7} cols={4} />
          <SkeletonCard lines={6} footer />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <div className={`${card} flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3`}>
        <span className="font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/50">Status mapping</span>
        {CHIP_LEGEND.map((l) => (
          <span key={l.status} className="inline-flex items-center gap-1.5">
            <RunStatusChip status={l.status} />
            <span className="font-term text-[11px] text-ink/40">{l.note}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><RunStatusChip status="passed" dry /><span className="font-term text-[11px] text-ink/40">test run</span></span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <RunHistory runs={runs} limit={limit} selectedId={selId} onSelect={(r) => setSelId(r.id)} />
        <div className="lg:sticky lg:top-4">
          <RunPanel run={selected} onClose={() => setSelId(null)} />
        </div>
      </div>
    </div>
  );
}
