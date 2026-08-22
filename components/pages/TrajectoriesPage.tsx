import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { SkeletonPage } from "../data-display/Skeletons";
import { ReadError } from "../feedback/ReadError";
import { Button, Card, Chip } from "../index";
import { CheckCircle2, ChevronDown, CircleAlert, Database, GitBranch, RefreshCw, Save, Trash2, Workflow } from "lucide-react";
import { useState } from "react";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";
import { Drawer } from "../layout/Drawer";
import { Spinner } from "../data-display/Spinner";

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
  promotedWorkflowName?: string;
  workflowRootTrajectoryId?: number | null;
  workflowObservationCount?: number;
  clusterObservations?: TrajectoryRow[];
  promotedWorkflowStatus: string;
  promotedWorkflowCachePolicy?: "none" | "reviewed_answer";
  promotedWorkflowCacheState?: "disabled" | "empty" | "fresh" | "stale";
  promotedWorkflowCacheRefreshedAt?: string;
  promotedWorkflowDependencyCount?: number;
  promotedWorkflowEmbeddingMap?: {
    profile: string;
    points: Array<{ kind: "intent" | "phase" | "tool"; label: string; x: number; y: number }>;
  };
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
  setWorkflowCache?: (workflowId: number, enabled: boolean) => void | Promise<void>;
  reconcileStale?: () => number | Promise<number>;
  deleteWorkflow?: (workflowId: number) => void | Promise<void>;
  suggestSplitName?: (trajectoryId: number) => string | Promise<string>;
  splitWorkflow?: (trajectoryId: number, name: string) => number | Promise<number>;
  harvestCandidates?: () => WorkflowHarvestCandidate[] | Promise<WorkflowHarvestCandidate[]>;
  codifyCandidate?: (candidate: WorkflowHarvestCandidate) => number | Promise<number>;
};

export type WorkflowHarvestCandidate = {
  seedTrajectoryId: number;
  name: string;
  reason: string;
  observationIds: number[];
  prompts: string[];
  existingWorkflowId: number | null;
  accepted?: boolean;
};

function WorkflowHarvestWizard({ actions }: { actions?: TrajectoriesActions }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "scanning" | "review" | "done">("intro");
  const [candidates, setCandidates] = useState<WorkflowHarvestCandidate[]>([]);
  const scan = useWrite();
  const create = useWrite();
  const start = async () => {
    setStep("scanning");
    const rows = await scan.runFor(actions?.harvestCandidates && (() => actions.harvestCandidates!()));
    if (rows) {
      setCandidates(rows.map((row) => ({ ...row, accepted: true })));
      setStep("review");
    } else setStep("intro");
  };
  const finish = async () => {
    const selected = candidates.filter((candidate) => candidate.accepted && candidate.name.trim());
    const result = await create.runFor(async () => {
      let count = 0;
      for (const candidate of selected) {
        await actions?.codifyCandidate?.({ ...candidate, name: candidate.name.trim() });
        count += 1;
      }
      return count;
    });
    if (result !== undefined) setStep("done");
  };
  const close = () => { if (!scan.busy && !create.busy) { setOpen(false); setStep("intro"); setCandidates([]); } };
  return <>
    <Button compact onClick={() => setOpen(true)}><GitBranch size={13} /> Harvest new workflows</Button>
    <Drawer open={open} onClose={close} title="Harvest new workflows" subtitle="Guided workflow discovery" closable={!scan.busy && !create.busy}
      footer={step === "review" ? <>
        <Button onClick={close}>Cancel</Button>
        <Button variant="primary" disabled={create.busy || !candidates.some((candidate) => candidate.accepted && candidate.name.trim())} onClick={() => void finish()}>
          Codify selected
        </Button>
      </> : step === "done" ? <Button variant="primary" onClick={close}>Done</Button> : undefined}>
      {step === "intro" && <div className="space-y-4">
        <p className="text-[13px] leading-5 text-ink/70">Mari will inspect recent assistant turns and propose distinct reusable workflows. You review every candidate before anything is created.</p>
        <div className="rounded-[7px] border border-ink/10 bg-ink/[0.02] p-3 text-[12px] text-ink/65">The scan considers unclustered turns and narrower intents inside existing clusters. Greetings and one-off chatter are excluded.</div>
        <Button variant="primary" disabled={scan.busy} onClick={() => void start()}>Analyze recent turns</Button>
        <WriteError onDismiss={() => scan.setFailed(null)}>{scan.failed}</WriteError>
      </div>}
      {step === "scanning" && <div className="flex flex-col items-center gap-3 py-14 text-center"><Spinner label="Finding workflow candidates" /><strong className="text-[13px]">Clustering observed intent</strong><span className="text-[12px] text-ink/60">Comparing recent turns with current workflow clusters…</span></div>}
      {step === "review" && <div className="space-y-3">
        <p className="text-[12px] text-ink/65">{candidates.length ? `${candidates.length} candidate${candidates.length === 1 ? "" : "s"} found. Rename, inspect, or skip each one.` : "No distinct workflow candidates were found in recent turns."}</p>
        {candidates.map((candidate, index) => <Card key={`${candidate.seedTrajectoryId}-${index}`} className={candidate.accepted ? "" : "opacity-60"}>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={Boolean(candidate.accepted)} onChange={(event) => setCandidates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, accepted: event.target.checked } : row))} className="mt-1" />
            <span className="min-w-0 flex-1">
              <input aria-label={`Candidate ${index + 1} name`} value={candidate.name} onChange={(event) => setCandidates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} className="w-full rounded border border-ink/15 bg-paper px-2 py-1.5 text-[13px] font-semibold" />
              <span className="mt-2 block text-[12px] leading-5 text-ink/65">{candidate.reason}</span>
            </span>
          </label>
          <details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-biscay">{candidate.observationIds.length} supporting turn{candidate.observationIds.length === 1 ? "" : "s"}</summary>
            <ul className="mt-2 space-y-1 text-[11px] text-ink/65">{candidate.prompts.map((prompt, promptIndex) => <li key={promptIndex} className="rounded bg-ink/[0.025] px-2 py-1.5">{prompt}</li>)}</ul>
          </details>
          {candidate.existingWorkflowId && <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-rust">Will split from workflow {candidate.existingWorkflowId}</p>}
        </Card>)}
        <WriteError onDismiss={() => create.setFailed(null)}>{create.failed}</WriteError>
      </div>}
      {step === "done" && <div className="py-12 text-center"><CheckCircle2 className="mx-auto text-olive" size={28} /><h3 className="mt-3 text-[15px] font-semibold">Workflows codified</h3><p className="mt-1 text-[12px] text-ink/65">The selected candidates are now available to chat, Slack, and other agent destinations.</p></div>}
    </Drawer>
  </>;
}

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

function EmbeddingMap({ map }: { map?: TrajectoryRow["promotedWorkflowEmbeddingMap"] }) {
  const points = map?.points ?? [];
  if (!points.length) return (
    <div className="rounded-[6px] border border-dashed border-ink/15 bg-paper px-4 py-8 text-center text-[11px] text-ink/55">
      The embedding map will appear after this workflow has been indexed.
    </div>
  );
  const colors = { intent: "#294f78", phase: "#707746", tool: "#b05d3b" } as const;
  return (
    <figure className="overflow-hidden rounded-[7px] border border-ink/10 bg-paper p-3" aria-label="Workflow embedding">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Workflow embedding</h3>
          <p className="mt-1 text-[11px] text-ink/55">A two-dimensional projection of the stored intent, phases, and tool steps.</p>
        </div>
        {map?.profile && <span className="max-w-[280px] truncate font-mono text-[10px] text-ink/45" title={map.profile}>{map.profile}</span>}
      </div>
      <svg viewBox="0 0 600 240" role="img" aria-label={`Embedding projection with ${points.length} points`} className="mt-2 h-auto w-full min-w-0">
        <rect x="0" y="0" width="600" height="240" rx="8" fill="#f8f6f1" />
        {[100, 200, 300, 400, 500].map((x) => <line key={`x-${x}`} x1={x} y1="18" x2={x} y2="222" stroke="#17202a" strokeOpacity="0.055" />)}
        {[60, 120, 180].map((y) => <line key={`y-${y}`} x1="18" y1={y} x2="582" y2={y} stroke="#17202a" strokeOpacity="0.055" />)}
        {points.map((point, index) => {
          const x = 300 + point.x * 245;
          const y = 120 - point.y * 82;
          const labelRight = x < 420;
          return <g key={`${point.kind}-${point.label}-${index}`}>
            {point.kind === "intent" && <circle cx={x} cy={y} r="14" fill={colors.intent} fillOpacity="0.12" />}
            <circle cx={x} cy={y} r={point.kind === "intent" ? 7 : 5} fill={colors[point.kind]} stroke="#fff" strokeWidth="2" />
            <text x={labelRight ? x + 10 : x - 10} y={y + 4} textAnchor={labelRight ? "start" : "end"} fontSize="11" fill="#17202a">{point.label.slice(0, 34)}</text>
          </g>;
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[10px] text-ink/55">
        {(["intent", "phase", "tool"] as const).map((kind) => <span key={kind} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[kind] }} />{kind === "intent" ? "Canonical intent" : kind === "phase" ? "Phase" : "Tool step"}</span>)}
        <span className="ml-auto">Distance is relative within this workflow.</span>
      </figcaption>
    </figure>
  );
}

function TrajectoryCard({ row, actions }: { row: TrajectoryRow; actions?: TrajectoriesActions }) {
  const ready = row.status === "ready" || row.status === "fallback";
  const [workflowName, setWorkflowName] = useState(row.macroIntent || row.prompt.slice(0, 80));
  const [promoted, setPromoted] = useState(row.promotedWorkflowId);
  const [enabled, setEnabled] = useState(row.promotedWorkflowStatus === "active");
  const [cachePolicy, setCachePolicy] = useState(row.promotedWorkflowCachePolicy ?? "none");
  const [cacheState, setCacheState] = useState(row.promotedWorkflowCacheState ?? "disabled");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const promotion = useWrite();
  const statusWrite = useWrite();
  const cacheWrite = useWrite();
  const deleteWrite = useWrite();
  const splitWrite = useWrite();
  const [splitTarget, setSplitTarget] = useState<number | null>(null);
  const [splitName, setSplitName] = useState("");
  const observations = row.clusterObservations ?? [row];
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
              {row.promotedWorkflowName || row.macroIntent || row.prompt || `Trajectory ${row.id}`}
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
        {promoted && <details className="mt-3 rounded-[6px] border border-ink/10 bg-ink/[0.015] px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-biscay">
            {row.workflowObservationCount ?? observations.length} chat observation{(row.workflowObservationCount ?? observations.length) === 1 ? "" : "s"} in this workflow
          </summary>
          <div className="mt-3"><EmbeddingMap map={row.promotedWorkflowEmbeddingMap} /></div>
          <ol className="mt-2 grid gap-2">
            {observations.map((observation) => <li key={observation.id} className="rounded border border-ink/10 bg-paper p-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1"><strong>{observation.prompt}</strong> · {observation.stepCount} tool step{observation.stepCount === 1 ? "" : "s"}</span>
                {observation.id === row.workflowRootTrajectoryId ? <Chip label="Cluster seed" /> :
                  <Button compact disabled={splitWrite.busy} onClick={() => void splitWrite.runFor(actions?.suggestSplitName && (() => actions.suggestSplitName!(observation.id))).then((name) => {
                    if (name) { setSplitTarget(observation.id); setSplitName(name); }
                  })}>Split from cluster</Button>}
              </div>
              {splitTarget === observation.id && <div className="mt-2 flex flex-wrap gap-2">
                <input aria-label="New workflow name" value={splitName} onChange={(event) => setSplitName(event.target.value)} className="min-w-[220px] flex-1 rounded border border-ink/15 bg-paper px-2 py-1" />
                <Button compact onClick={() => { setSplitTarget(null); setSplitName(""); }}>Cancel</Button>
                <Button compact disabled={!splitName.trim() || splitWrite.busy} onClick={() => void splitWrite.runFor(actions?.splitWorkflow && (() => actions.splitWorkflow!(observation.id, splitName))).then((id) => {
                  if (id) { setSplitTarget(null); setSplitName(""); }
                })}>Create split workflow</Button>
              </div>}
            </li>)}
          </ol>
          <WriteError onDismiss={() => splitWrite.setFailed(null)}>{splitWrite.failed}</WriteError>
        </details>}
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
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Workflow cluster</h3>
            {promoted ? <div className="mt-2 grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={enabled ? "Enabled for assistants" : "Paused"} />
                <Button compact disabled={statusWrite.busy} onClick={() => void statusWrite.run(actions?.setWorkflowEnabled && (() => actions.setWorkflowEnabled!(promoted, !enabled))).then((ok) => { if (ok) setEnabled(!enabled); })}>
                  <Workflow size={13} /> {enabled ? "Pause workflow" : "Enable workflow"}
                </Button>
                {!confirmDelete ? <Button compact onClick={() => setConfirmDelete(true)}><Trash2 size={13} /> Delete workflow</Button>
                  : <><span className="text-[11px] font-medium text-rust">The observed trajectory will be kept.</span>
                    <Button compact onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button compact disabled={deleteWrite.busy} onClick={() => void deleteWrite.run(actions?.deleteWorkflow && (() => actions.deleteWorkflow!(promoted))).then((ok) => {
                      if (ok) { setPromoted(null); setEnabled(false); setCachePolicy("none"); setCacheState("disabled"); setConfirmDelete(false); }
                    })}><Trash2 size={13} /> Confirm delete</Button></>}
              </div>
              <div className="rounded-[6px] border border-ink/10 bg-ink/[0.02] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Database size={14} />
                  <strong className="text-[12px]">Reviewed-answer cache</strong>
                  <Chip label={cachePolicy === "none" ? "Not cached" : cacheState === "fresh" ? "Current" : cacheState === "stale" ? "Stale" : "Needs reconciliation"} />
                  <Button compact disabled={cacheWrite.busy} onClick={() => void cacheWrite.run(actions?.setWorkflowCache && (() => actions.setWorkflowCache!(promoted, cachePolicy === "none"))).then((ok) => {
                    if (ok) { const enabling = cachePolicy === "none"; setCachePolicy(enabling ? "reviewed_answer" : "none"); setCacheState(enabling ? "fresh" : "disabled"); }
                  })}>{cachePolicy === "none" ? "Cache reviewed answer" : "Disable cache"}</Button>
                </div>
                <p className="mt-1 text-[11px] text-ink/65">Optional. A current cache returns the reviewed answer without generation. It becomes stale when any tracked document revision changes.</p>
                {cachePolicy !== "none" && <p className="mt-1 text-[11px] text-ink/55">Tracking {row.promotedWorkflowDependencyCount ?? 0} document{row.promotedWorkflowDependencyCount === 1 ? "" : "s"}{row.promotedWorkflowCacheRefreshedAt ? ` · refreshed ${new Date(row.promotedWorkflowCacheRefreshedAt).toLocaleString()}` : ""}</p>}
                <WriteError onDismiss={() => cacheWrite.setFailed(null)}>{cacheWrite.failed}</WriteError>
              </div>
            </div> : <div className="mt-2 flex flex-wrap gap-2">
              <input aria-label="Workflow name" value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} className="min-w-[240px] flex-1 rounded border border-ink/15 bg-paper px-2 py-1.5 text-[12px]" />
              <Button disabled={promotion.busy || !workflowName.trim()} onClick={() => void promotion.runFor(actions?.promote && (() => actions.promote!(row.id, workflowName))).then((id) => { if (id) { setPromoted(id); setEnabled(true); } })}><Workflow size={13} /> Codify workflow</Button>
            </div>}
            <WriteError onDismiss={() => promotion.setFailed(null)}>{promotion.failed}</WriteError>
            <WriteError onDismiss={() => statusWrite.setFailed(null)}>{statusWrite.failed}</WriteError>
            <WriteError onDismiss={() => deleteWrite.setFailed(null)}>{deleteWrite.failed}</WriteError>
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
  const staleCaches = data.rows.filter((row) => (row.promotedWorkflowCachePolicy ?? "none") !== "none" && row.promotedWorkflowCacheState !== "fresh").length;
  const reconciliation = useWrite();
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-ink/70">Showing {pageStart}-{pageEnd} of {data.total}</span>
                <WorkflowHarvestWizard actions={actions} />
                <Button compact disabled={reconciliation.busy} onClick={() => void reconciliation.runFor(actions?.reconcileStale && (() => actions.reconcileStale!()))}>
                  <RefreshCw size={13} /> Reconcile stale caches{staleCaches ? ` (${staleCaches})` : ""}
                </Button>
              </div>
            </div>
            <WriteError onDismiss={() => reconciliation.setFailed(null)}>{reconciliation.failed}</WriteError>
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
