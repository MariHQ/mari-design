import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { SkeletonPage } from "../data-display/Skeletons";
import { ReadError } from "../feedback/ReadError";
import { Button, Card, Chip } from "../index";
import { CheckCircle2, ChevronDown, CircleAlert, GitBranch, Save, Workflow } from "lucide-react";
import { useState } from "react";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error / service unavailable" },
  { id: "empty", label: "Empty / no observed workflows" },
  { id: "stress", label: "Stress / large archive" },
] as const;

export type TrajectoryStep = {
  ordinal: number;
  tool: string;
  actionFamily: string;
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
  disposition: "included" | "excluded" | "preferred";
  editedArgs: Record<string, unknown> | null;
};

export type TrajectoryEvidence = {
  documentId: number; title: string; reason: string; rank: number;
  relevance: "observed" | "relevant" | "irrelevant" | "pinned"; note: string;
};

export type TrajectoryPhase = {
  id: number;
  name: string;
  family: string;
  start: number;
  end: number;
  steps: number;
  substate: string;
  failures: number;
};

export type TrajectoryRow = {
  id: number;
  sessionId: number | null;
  prompt: string;
  status: string;
  model: string;
  layer1: string;
  layer2: string;
  category: string;
  macroIntent: string;
  phases: TrajectoryPhase[];
  stepCount: number;
  failureCount: number;
  reworkCount: number;
  startedAt: string;
  completedAt: string;
  steps: TrajectoryStep[];
  evidence: TrajectoryEvidence[];
  promotedWorkflowId: number | null;
  promotedWorkflowStatus: string;
};

export type TrajectoriesData = {
  rows: TrajectoryRow[];
  total: number;
  categories: string[];
  category: string | null;
  offset: number;
  limit: number;
};

export type TrajectoriesActions = {
  setCategory?: (category: string | null) => void;
  setOffset?: (offset: number) => void;
  tuneStep?: (trajectoryId: number, ordinal: number, disposition: string,
              editedArgs: Record<string, unknown> | null) => void | Promise<void>;
  tuneEvidence?: (trajectoryId: number, documentId: number, relevance: string,
                  note: string) => void | Promise<void>;
  promote?: (trajectoryId: number, name: string) => number | Promise<number>;
  setWorkflowEnabled?: (workflowId: number, enabled: boolean) => void | Promise<void>;
};

function PhaseRail({ phases }: { phases: TrajectoryPhase[] }) {
  if (!phases.length) return <p className="text-[12px] text-ink/70">No tool phases were observed.</p>;
  return (
    <ol aria-label="Workflow phases" className="flex min-w-0 flex-wrap gap-2">
      {phases.map((phase, index) => (
        <li key={`${phase.id}-${index}`} className="min-w-[120px] flex-1 rounded-[6px] border border-ink/12 bg-paper px-3 py-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold">
            <span className="text-ink/40">{index + 1}</span>
            <span className="truncate">{phase.name}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink/70">{phase.steps} step{phase.steps === 1 ? "" : "s"} · {phase.substate}</p>
        </li>
      ))}
    </ol>
  );
}

function ToolStepEditor({ trajectoryId, step, actions }: {
  trajectoryId: number; step: TrajectoryStep; actions?: TrajectoriesActions;
}) {
  const [disposition, setDisposition] = useState(step.disposition ?? "included");
  const [args, setArgs] = useState(JSON.stringify(step.editedArgs ?? step.args, null, 2));
  const write = useWrite();
  const save = async () => {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(args); } catch { write.setFailed("Arguments must be a JSON object."); return; }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      write.setFailed("Arguments must be a JSON object."); return;
    }
    await write.run(actions?.tuneStep && (() => actions.tuneStep!(trajectoryId, step.ordinal, disposition, parsed)));
  };
  return (
    <li className={`rounded-[5px] border px-2 py-2 text-[12px] ${disposition === "excluded" ? "border-rust/20 bg-rust/[0.03] opacity-70" : "border-ink/10"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {step.ok ? <CheckCircle2 size={13} className="shrink-0 text-olive" /> : <CircleAlert size={13} className="shrink-0 text-rust" />}
        <span className="min-w-24 font-mono text-[11px] font-semibold">{step.tool}</span>
        <span className="min-w-0 flex-1 truncate text-ink/70">{step.summary}</span>
        <select aria-label={`${step.tool} disposition`} value={disposition} onChange={(event) => setDisposition(event.target.value as typeof disposition)} className="rounded border border-ink/20 bg-paper px-1.5 py-1 text-[11px]">
          <option value="included">Include</option><option value="preferred">Prefer</option><option value="excluded">Exclude</option>
        </select>
      </div>
      <details className="mt-1.5"><summary className="cursor-pointer text-[11px] font-medium text-biscay">Tune arguments</summary>
        <textarea aria-label={`${step.tool} arguments`} value={args} onChange={(event) => setArgs(event.target.value)} rows={4} className="mt-2 w-full rounded border border-ink/15 bg-paper p-2 font-mono text-[11px]" />
        <Button compact disabled={write.busy} onClick={() => void save()}><Save size={12} /> Save tool</Button>
        <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      </details>
    </li>
  );
}

function EvidenceEditor({ trajectoryId, evidence, actions }: {
  trajectoryId: number; evidence: TrajectoryEvidence; actions?: TrajectoriesActions;
}) {
  const [relevance, setRelevance] = useState(evidence.relevance ?? "observed");
  const [note, setNote] = useState(evidence.note ?? "");
  const write = useWrite();
  return <li className="rounded-[5px] border border-ink/10 p-2 text-[12px]">
    <div className="flex flex-wrap items-center gap-2"><strong className="min-w-0 flex-1 truncate">{evidence.title || `Document ${evidence.documentId}`}</strong>
      <select aria-label={`${evidence.title} relevance`} value={relevance} onChange={(event) => setRelevance(event.target.value as typeof relevance)} className="rounded border border-ink/20 bg-paper px-1.5 py-1 text-[11px]">
        <option value="observed">Observed</option><option value="relevant">Relevant</option><option value="pinned">Pin</option><option value="irrelevant">Not relevant</option>
      </select></div>
    <p className="mt-1 text-[11px] text-ink/60">{evidence.reason}</p>
    <div className="mt-2 flex gap-2"><input aria-label={`${evidence.title} note`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this document matters" className="min-w-0 flex-1 rounded border border-ink/15 bg-paper px-2 py-1 text-[11px]" />
      <Button compact disabled={write.busy} onClick={() => void write.run(actions?.tuneEvidence && (() => actions.tuneEvidence!(trajectoryId, evidence.documentId, relevance, note)))}><Save size={12} /> Save</Button></div>
    <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
  </li>;
}

function TrajectoryCard({ row, actions }: { row: TrajectoryRow; actions?: TrajectoriesActions }) {
  const ready = row.status === "ready" || row.status === "fallback";
  const [workflowName, setWorkflowName] = useState(row.macroIntent || row.prompt.slice(0, 80));
  const [promoted, setPromoted] = useState(row.promotedWorkflowId);
  const [enabled, setEnabled] = useState(row.promotedWorkflowStatus === "active");
  const promotion = useWrite();
  const statusWrite = useWrite();
  return (
    <Card>
      <article aria-labelledby={`trajectory-${row.id}`} className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip label={row.category || "Unclassified"} />
              <span className="text-[11px] text-ink/70">{row.model || "model unavailable"}</span>
              {!ready && <span className="text-[11px] font-medium text-biscay">Analyzing</span>}
            </div>
            <h2 id={`trajectory-${row.id}`} className="mt-2 truncate text-[16px] font-semibold text-ink">
              {row.macroIntent || row.prompt || `Trajectory ${row.id}`}
            </h2>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink/65">
              {row.layer2 || "Workflow abstraction is still being generated."}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-3 text-center text-[11px] text-ink/70">
            <span><b className="block text-[15px] text-ink">{row.stepCount}</b>steps</span>
            <span><b className="block text-[15px] text-ink">{row.failureCount}</b>failures</span>
            <span><b className="block text-[15px] text-ink">{row.reworkCount}</b>rework</span>
          </div>
        </div>
        <div className="mt-4"><PhaseRail phases={row.phases} /></div>
        <details className="group mt-4 border-t border-ink/10 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold text-biscay">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            Evidence and abstraction layers
          </summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Grounded workflow</h3>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink/70">{row.layer1 || "Pending"}</p>
            </section>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Chronological evidence</h3>
              <ol className="mt-1 max-h-96 space-y-1 overflow-y-auto pr-1" aria-label="Trajectory steps">
                {row.steps.map((step) => <ToolStepEditor key={step.ordinal} trajectoryId={row.id} step={step} actions={actions} />)}
              </ol>
            </section>
          </div>
          <section className="mt-4 border-t border-ink/10 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Answer evidence</h3>
            {row.evidence.length ? <ol className="mt-2 grid gap-2 lg:grid-cols-2">{row.evidence.map((reference) => <EvidenceEditor key={reference.documentId} trajectoryId={row.id} evidence={reference} actions={actions} />)}</ol>
              : <p className="mt-1 text-[12px] text-ink/60">No documents were attached to this answer.</p>}
          </section>
          <section className="mt-4 border-t border-ink/10 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Codified workflow</h3>
            {promoted ? <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip label={enabled ? "Enabled for assistants" : "Paused"} />
              <Button compact disabled={statusWrite.busy} onClick={() => void statusWrite.run(actions?.setWorkflowEnabled && (() => actions.setWorkflowEnabled!(promoted, !enabled))).then((ok) => { if (ok) setEnabled(!enabled); })}>
                <Workflow size={13} /> {enabled ? "Pause workflow" : "Enable workflow"}
              </Button>
            </div> : <div className="mt-2 flex flex-wrap gap-2">
              <input aria-label="Workflow name" value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} className="min-w-[240px] flex-1 rounded border border-ink/15 bg-paper px-2 py-1.5 text-[12px]" />
              <Button disabled={promotion.busy || !workflowName.trim()} onClick={() => void promotion.runFor(actions?.promote && (() => actions.promote!(row.id, workflowName))).then((id) => { if (id) { setPromoted(id); setEnabled(true); } })}><Workflow size={13} /> Codify workflow</Button>
            </div>}
            <WriteError onDismiss={() => promotion.setFailed(null)}>{promotion.failed}</WriteError>
            <WriteError onDismiss={() => statusWrite.setFailed(null)}>{statusWrite.failed}</WriteError>
          </section>
        </details>
      </article>
    </Card>
  );
}

function TrajectoriesPage({ data, loading = false, error = null, actions, chrome, mobile = false }:
  PageProps<TrajectoriesData, TrajectoriesActions>) {
  const pageStart = data.total ? data.offset + 1 : 0;
  const pageEnd = Math.min(data.offset + data.rows.length, data.total);
  if (loading) return (
    <PageFrame chrome={chrome} active={navFor("trajectories")} title="Workflows" mobile={mobile}>
      <SkeletonPage variant="list" eyebrow="Agent learning" title="Workflows" description="Observe, tune, and codify how assistants use tools and evidence." mobile={mobile} />
    </PageFrame>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("trajectories")} title="Workflows" mobile={mobile}>
      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <PageHeader eyebrow="Agent learning" title="Workflows" description="Observe successful assistant behavior, tune its tools and evidence, then codify it for chat and bot experiences." />
        {error ? <ReadError>{error}</ReadError> : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-ink/12 bg-paper px-4 py-3">
              <label className="flex items-center gap-2 text-[12px] font-medium">
                Category
                <select aria-label="Trajectory category" value={data.category ?? ""} onChange={(event) => actions?.setCategory?.(event.target.value || null)} className="rounded-[5px] border border-ink/20 bg-paper px-2 py-1.5 text-[12px]">
                  <option value="">All categories</option>
                  {data.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <span className="text-[12px] text-ink/70">Showing {pageStart}-{pageEnd} of {data.total}</span>
            </div>
            {!data.rows.length ? (
              <div className="rounded-[8px] border border-dashed border-ink/20 px-6 py-16 text-center">
                <GitBranch className="mx-auto text-ink/35" size={26} />
                <h2 className="mt-3 text-[15px] font-semibold">No observed workflows yet</h2>
                <p className="mt-1 text-[13px] text-ink/70">Assistant tool runs appear here so they can be reviewed and codified.</p>
              </div>
            ) : <div className="space-y-4">{data.rows.map((row) => <TrajectoryCard key={row.id} row={row} actions={actions} />)}</div>}
            {data.total > data.limit && (
              <nav aria-label="Workflow pages" className="mt-6 flex items-center justify-between">
                <Button disabled={data.offset === 0} onClick={() => actions?.setOffset?.(Math.max(0, data.offset - data.limit))}>Previous</Button>
                <span className="text-[12px] text-ink/50">Page {Math.floor(data.offset / data.limit) + 1}</span>
                <Button disabled={data.offset + data.limit >= data.total} onClick={() => actions?.setOffset?.(data.offset + data.limit)}>Next</Button>
              </nav>
            )}
          </>
        )}
      </div>
    </PageFrame>
  );
}

export const page: PageModule<TrajectoriesData, TrajectoriesActions> = {
  id: "trajectories",
  title: "Workflows",
  route: "/workflows",
  component: TrajectoriesPage,
  states: STATES.map((state) => ({ ...state })),
};
