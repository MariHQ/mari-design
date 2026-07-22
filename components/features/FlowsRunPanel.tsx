import { useState } from "react";
import { RunPanel } from "../workflow/RunPanel";
import { RunStatusChip, type WorkflowRun } from "../workflow/RunHistory";
import { SkeletonList, SkeletonCard } from "../data-display/Skeleton";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

/* Flows run panel — a non-blocking inspector for a single run: header status,
   provenance, a step timeline, a stats grid, an approval box when waiting, and
   footer actions (approve / re-run). It layers beside the live list so the page
   keeps updating behind it. This macro wires the RunPanel primitive to a faux
   list of runs, plus local approve / re-run behavior, and renders standalone. */

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
    headline: "Draft written for review — waiting on approval",
  },
  {
    id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed",
    started: "2026-07-20T14:12:00", duration: "00:00:41",
    triggeredBy: "Triggered by: docs/api.md merged",
    rows: [
      { step: "GitHub PR merged", status: "passed", detail: "PR #482", duration: "0.1s" },
      { step: "Fetch docs", status: "passed", detail: "5 documents matched", duration: "0.6s" },
      { step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" },
      { step: "Contradictions?", status: "skipped", detail: "0 — yes-branch skipped" },
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
      { step: "Contradictions?", status: "passed", detail: "2 > 0 — yes-branch taken" },
      { step: "Create task", status: "passed", detail: "Review task previewed (dry run)" },
    ],
    stats: [
      { label: "Edits", value: 3 }, { label: "Contradictions", value: 2, bad: true },
      { label: "Links", value: 1 }, { label: "Facts", value: 9 },
    ],
    headline: "2 contradictions — review task previewed",
  },
];

const DOT: Record<string, string> = {
  passed: "bg-moss", failed: "bg-espelette", running: "bg-biscay-2 animate-pulse",
  waiting: "bg-clay", skipped: "bg-ink/30", pending: "bg-ink/30",
};

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
    setNote(`Approved run #${r.number} — the run is resuming.`);
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
    setNote(`Started run #${nextNumber}${dry ? " as a test" : ""} — this panel is now showing it.`);
  };

  if (loading) {
    return (
      <div className={`grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px] ${className}`} aria-hidden="true">
        <SkeletonList rows={5} />
        <SkeletonCard lines={6} footer />
      </div>
    );
  }

  return (
    <div className={`grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px] ${className}`}>
      {/* Faux live list behind the panel */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-ink/10 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-ink">Recent runs</h3>
          <div className="mt-0.5 font-term text-[11px] text-ink/50">The panel stays live over the list — no backdrop.</div>
        </div>
        <ul className="divide-y divide-ink/10">
          {runs.map((r) => (
            <li key={r.id}>
              <button
                type="button" onClick={() => { setOpenId(r.id); setNote(null); }}
                aria-current={r.id === openId || undefined}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${r.id === openId ? "bg-espelette/[0.05]" : "hover:bg-flysch"} ${focusRing}`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[r.status]}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-term text-[13px] text-ink">#{r.number}</span>
                    <span className="truncate text-[13px] font-medium text-ink">{r.workflowName}</span>
                  </span>
                  <span className="block truncate text-[12px] text-ink/55">{r.headline}</span>
                </span>
                <RunStatusChip status={r.status} dry={r.dry} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* The run panel inspector */}
      <div className="lg:sticky lg:top-4">
        <RunPanel
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
