import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";
import { useState, type ReactNode } from "react";
import {
  ChevronLeft, Play, Eye, Plus, ArrowUp, ArrowDown, Trash2, X, Sparkles,
  Search, Filter, GitBranch, Tag, CheckSquare, Bell, FileText, Send, Globe, RefreshCw,
} from "lucide-react";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { DryChip } from "../data-display/Chip";
import { Truncate } from "../data-display/Truncate";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Switch } from "../forms/Switch";
import { type WorkflowRun } from "../workflow/RunHistory";
import { FlowRunsTable } from "./FlowsRunHistory";
import { FLOWS_SPLIT } from "./FlowsRunPanel";
import { Skeleton, SkeletonLine, SkeletonButton, SkeletonCard } from "../data-display/Skeleton";
import { Alert } from "../feedback/Alert";
import { ERRORS } from "../feedback/errors";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

/* Flows pipeline editor — a Zapier-style vertical step spine. The flow is an
   ordered list of steps beginning with one pinned trigger; selecting a step
   loads its settings in a sticky config panel; a "+" between steps opens the
   step picker. Owns the in-memory draft (name/steps/selection/dirty). Scoped
   run history renders below. Renders standalone with a baked draft. */

/* Every step kind this editor can draw and configure. Exported as a value as
   well as a type: whoever loads a stored pipeline has to drop the kinds this
   build has no config panel for, and guessing that list is how a step ends up
   on screen with no settings behind it. */
export const STEP_KINDS = [
  "trigger", "fetch_docs", "refine", "fact_check", "condition", "tag",
  "derive_links", "create_task", "approval", "deploy_site", "notify",
  "summarize", "sync_source", "refresh_digest", "scan_facts",
] as const;

export type StepKind = typeof STEP_KINDS[number];

type Section = "when" | "do" | "check" | "then";

export type EditorStep = {
  kind: StepKind;
  label: string;
  config: Record<string, unknown>;
  only_if_branch?: boolean;
};

const SECTION_OF: Record<StepKind, Section> = {
  trigger: "when",
  fetch_docs: "do", refine: "do", fact_check: "do", summarize: "do", tag: "do",
  derive_links: "do", sync_source: "do", refresh_digest: "do", scan_facts: "do",
  condition: "check", approval: "check",
  create_task: "then", notify: "then", deploy_site: "then",
};

const SECTION_CHIP: Record<Section, string> = {
  when: "text-moss border-moss/40 bg-moss/[0.08]",
  do: "text-biscay-2 border-biscay-2/40 bg-biscay-2/[0.08]",
  check: "text-clay border-clay/40 bg-clay/[0.09]",
  then: "text-espelette border-espelette/40 bg-espelette/[0.08]",
};
const SECTION_TITLE: Record<Section, string> = { when: "When", do: "Do", check: "Check", then: "Then" };

type KindMeta = { name: string; desc: string; llm?: boolean; defLabel: string; defConfig: Record<string, unknown>; icon: ReactNode };

const I = (n: ReactNode) => n;
const KIND_META: Record<StepKind, KindMeta> = {
  trigger: { name: "Source event", desc: "Watches a scope of documents. The flow runs on its cadence or when you press Run.", defLabel: "When docs change", defConfig: { label: "", query: "" }, icon: I(<Bell size={15} />) },
  fetch_docs: { name: "Fetch docs", desc: "Pulls matching documents into the run by query, tag, or both, capped at k.", defLabel: "Fetch docs", defConfig: { query: "", k: 3 }, icon: I(<Search size={15} />) },
  refine: { name: "Prose refine", llm: true, desc: "Runs a Mari writing skill over each fetched doc and proposes edits as findings.", defLabel: "Refine prose", defConfig: { skill: "tighten" }, icon: I(<Sparkles size={15} />) },
  fact_check: { name: "Fact check", llm: true, desc: "Checks claims against accepted facts and reports contradictions with citations.", defLabel: "Verify facts", defConfig: {}, icon: I(<CheckSquare size={15} />) },
  summarize: { name: "Summarize", llm: true, desc: "Drafts a summary of the fetched documents: useful for digests and drafts.", defLabel: "Summarize", defConfig: {}, icon: I(<FileText size={15} />) },
  tag: { name: "Tag docs", desc: "Applies a tag to every fetched document. Dry runs preview the tagging.", defLabel: "Tag docs", defConfig: { tag: "needs-review" }, icon: I(<Tag size={15} />) },
  derive_links: { name: "Derive links", llm: true, desc: "Suggests lineage links between the fetched docs and related knowledge.", defLabel: "Derive links", defConfig: {}, icon: I(<GitBranch size={15} />) },
  condition: { name: "Condition", desc: "Branches on a run stat (for example contradictions > 0). Yes-branch steps run when it passes.", defLabel: "Contradictions?", defConfig: { field: "contradictions", greater_than: 0 }, icon: I(<Filter size={15} />) },
  approval: { name: "Approval", desc: "Pauses the run as waiting until the assignee approves it from the run panel.", defLabel: "Approval", defConfig: { assignee: "Aki K." }, icon: I(<CheckSquare size={15} />) },
  create_task: { name: "Create task", desc: "Opens a task on the Tasks board. Dry runs preview the task.", defLabel: "Create task", defConfig: { title: "", kind: "review", kind_label: "Review" }, icon: I(<CheckSquare size={15} />) },
  notify: { name: "Notify", desc: "Sends an in-app notification. Dry runs preview the message.", defLabel: "Notify", defConfig: { text: "", detail: "" }, icon: I(<Bell size={15} />) },
  deploy_site: { name: "Deploy site", desc: "Publishes a documentation site version. Dry runs report what would deploy.", defLabel: "Deploy site", defConfig: { site_id: 1 }, icon: I(<Globe size={15} />) },
  sync_source: { name: "Sync source", desc: "Re-syncs a connected source so the run sees the latest.", defLabel: "Sync source", defConfig: { source_id: 0 }, icon: I(<RefreshCw size={15} />) },
  scan_facts: { name: "Scan for facts", llm: true, desc: "Mines recent documents for checkable claims and captures them as facts.", defLabel: "Scan for facts", defConfig: {}, icon: I(<CheckSquare size={15} />) },
  refresh_digest: { name: "Refresh digest", llm: true, desc: "Rebuilds the recent-activity digest over recent docs.", defLabel: "Refresh digest", defConfig: {}, icon: I(<Send size={15} />) },
};

const REFINE_SKILLS = ["tighten", "clarify", "sharpen", "deslop", "understate", "polish"];
const CONDITION_FIELDS = ["contradictions", "edits", "links", "facts", "docs"];
const TASK_KINDS: { value: string; label: string }[] = [
  { value: "review", label: "Review" }, { value: "factcheck", label: "Fact check" },
  { value: "stale", label: "Stale" }, { value: "approval", label: "Approval" },
];

const PICKER_SECTIONS: { section: Section; tagline: string; kinds: StepKind[] }[] = [
  { section: "do", tagline: "editorial work on the matched docs", kinds: ["fetch_docs", "refine", "fact_check", "summarize", "tag", "derive_links", "scan_facts"] },
  { section: "check", tagline: "gate the result", kinds: ["condition", "approval"] },
  { section: "then", tagline: "deliver where the team works", kinds: ["create_task", "notify", "deploy_site"] },
];

/** A published site a deploy step can target. */
export type SiteRef = { id: number; name: string };

/** Steps rendered in the spine before "Show all". */
const STEP_PAGE = 25;

const asNum = (v: unknown, f = 0) => { const n = Number(v); return Number.isNaN(n) ? f : n; };
const asStr = (v: unknown) => (v == null ? "" : String(v));

/** The condition a yes-branch step hangs off, or null when it has none. */
function branchConditionIndex(steps: EditorStep[], i: number): number | null {
  if (!steps[i]?.only_if_branch) return null;
  for (let j = i - 1; j >= 0; j--) {
    if (steps[j].kind === "condition") return j;
    if (!steps[j].only_if_branch) break;
  }
  return null;
}

/** Steps whose own config panel says "Position it after a Fetch docs step":
    they operate over the fetched set, so ahead of one there is nothing for
    them to operate on. */
const NEEDS_FETCH: StepKind[] = ["fact_check", "summarize", "derive_links", "refresh_digest", "scan_facts"];

/** What is wrong with a draft, in step order. Empty means it can be saved.

    The editor validated NOTHING before `onSave`, so a pipeline could be
    persisted in states the engine cannot run: a branch whose condition had
    been deleted or reordered below it, an approval assigned to nobody (the run
    then pauses forever), a fetch-dependent step in position 1, and an unnamed
    flow stored as "Untitled flow" (WF11). `write.failed` only ever surfaced
    what the SERVER rejected, and the server rejects none of these. */
export function validateFlow(name: string, steps: EditorStep[]): string[] {
  const problems: string[] = [];
  if (!name.trim()) problems.push("The flow has no name. Name it above the pipeline.");
  if (steps.length === 0) problems.push("The flow has no steps.");
  else if (steps[0].kind !== "trigger") {
    problems.push(`Step 1 is "${KIND_META[steps[0].kind].name}". Every flow starts with its source event.`);
  }

  const where = (i: number, s: EditorStep) => `Step ${i + 1}, "${s.label || KIND_META[s.kind].name}"`;
  let fetched = false;
  steps.forEach((s, i) => {
    if (s.only_if_branch && branchConditionIndex(steps, i) == null) {
      problems.push(`${where(i, s)}: on a yes-branch with no condition above it. Add a condition, or turn the branch off.`);
    }
    if (s.kind === "approval" && !asStr(s.config.assignee).trim()) {
      problems.push(`${where(i, s)}: no approver, so a run would pause on nobody. Choose one.`);
    }
    if (NEEDS_FETCH.includes(s.kind) && !fetched) {
      problems.push(`${where(i, s)}: nothing has been fetched yet. Position it after a Fetch docs step.`);
    }
    if (s.kind === "fetch_docs") fetched = true;
  });
  return problems;
}

export type FlowsPipelineEditorProps = {
  name: string;
  description: string;
  /** Whether the flow is on. The toggle is the draft's value and `onSave`
      carries it, so opening a paused flow must not show it as running. */
  enabled?: boolean;
  steps: EditorStep[];
  runs: WorkflowRun[];
  /** Assignees a task/notify step can be pointed at. */
  members: string[];
  /** Sites a deploy step can publish to. */
  sites: SiteRef[];
  /** Tags a fetch/tag step can filter or apply. */
  tags: string[];
  /** Leave the editor for the flow list. */
  onBack?: () => void;
  /** Persist the flow as edited. The editor clears its dirty flag when this
      resolves, so "Saved." only ever means the server said so. */
  onSave?: (flow: { name: string; description: string; enabled: boolean; steps: EditorStep[] }) => void | Promise<void>;
  /** Start a run. `dry` is the test run: it records what a real run WOULD do
      without doing it, which is the distinction the footer chip explains.
      A dirty flow saves first — a run always uses the saved version. */
  onRun?: (opts: { dry: boolean }) => void | Promise<void>;
  /** The page's main-column/rail split (§11). */
  split?: string;
  /** Render a content-shaped skeleton silhouette instead of the editor. */
  loading?: boolean;
  className?: string;
};

export function FlowsPipelineEditor({
  name, description, enabled: initialEnabled = true, steps: initialSteps, runs, members, sites, tags,
  onBack, onSave, onRun,
  split = FLOWS_SPLIT,
  loading = false,
  className = "",
}: FlowsPipelineEditorProps) {
  const [flowName, setFlowName] = useState(name);
  const [desc, setDesc] = useState(description);
  const [steps, setSteps] = useState<EditorStep[]>(initialSteps);
  const [sel, setSel] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [allSteps, setAllSteps] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const write = useWrite();

  /* Seen-sentinel resync (X9). The draft was seeded from props on the first
     render only, so a later read of the flow — including the one that follows
     the save — was never reflected, and the editor could sit on a version of
     the pipeline nothing else agreed with. A read arriving over an UNSAVED
     draft is the same collision the round-1 pages settled the same way: the
     server's copy wins, because it is the one a run would execute. */
  const [seenSteps, setSeenSteps] = useState(initialSteps);
  if (seenSteps !== initialSteps) { setSeenSteps(initialSteps); setSteps(initialSteps); setDirty(false); setProblems([]); }
  const [seenName, setSeenName] = useState(name);
  if (seenName !== name) { setSeenName(name); setFlowName(name); }
  const [seenDesc, setSeenDesc] = useState(description);
  if (seenDesc !== description) { setSeenDesc(description); setDesc(description); }
  const [seenEnabled, setSeenEnabled] = useState(initialEnabled);
  if (seenEnabled !== initialEnabled) { setSeenEnabled(initialEnabled); setEnabled(initialEnabled); }

  /* Save and run are one control in two costumes: the labels already say
     "Save & run" when the flow is dirty, because a run uses the SAVED version.
     Doing the save here rather than in each button keeps that promise true
     instead of merely written on the label.

     Validation runs first and BLOCKS (WF11): a draft the engine cannot run
     must not reach the server, and the reason names the step. */
  const save = async (): Promise<boolean> => {
    const found = validateFlow(flowName, steps);
    setProblems(found);
    if (found.length > 0) return false;
    return write.run(
      onSave && (() => onSave({ name: flowName, description: desc, enabled, steps })),
      () => setDirty(false),
    );
  };

  const run = async (dry: boolean) => {
    if (dirty && !(await save())) return;
    await write.run(onRun && (() => onRun({ dry })));
  };

  const visibleSteps = allSteps ? steps : steps.slice(0, STEP_PAGE);
  const selIdx = Math.min(sel, steps.length - 1);
  const selStep = steps[selIdx];

  const patch = (i: number, next: Partial<EditorStep>) => {
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, ...next } : st)));
    setDirty(true);
  };
  const setConfig = (i: number, key: string, value: unknown) =>
    setSteps((s) => { const st = s.map((x, j) => (j === i ? { ...x, config: { ...x.config, [key]: value } } : x)); setDirty(true); return st; });

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (i <= 0 || j <= 0 || j >= steps.length) return;
    setSteps((s) => { const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setSel(j); setDirty(true);
  };
  const deleteStep = (i: number) => {
    if (i === 0) return;
    setSteps((s) => s.filter((_, j) => j !== i));
    setSel((cur) => (cur >= i ? Math.max(0, cur - 1) : cur));
    setDirty(true);
  };
  const insertStep = (at: number, kind: StepKind) => {
    const meta = KIND_META[kind];
    const step: EditorStep = { kind, label: meta.defLabel, config: { ...meta.defConfig } };
    setSteps((s) => { const n = [...s]; n.splice(at, 0, step); return n; });
    setSel(at); setDirty(true); setInsertAt(null);
  };

  const branchLabelFor = (i: number): string | null => {
    const j = branchConditionIndex(steps, i);
    if (j == null) return null;
    return `if ${asStr(steps[j].config.field)} > ${asNum(steps[j].config.greater_than)}`;
  };

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`} aria-hidden="true">
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonLine w={70} h={12} />
          <span className="flex-1" />
          <SkeletonButton w={96} /><SkeletonButton w={90} />
        </div>
        <div className={`${card} space-y-2 px-5 py-4`}>
          <Skeleton width="45%" height={26} /><SkeletonLine w="70%" h={11} />
        </div>
        <div className={split}>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={64} className="rounded-md" />)}
          </div>
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="link" className="text-ink/60" onClick={onBack}><ChevronLeft size={15} /> Flows</Button>
        <span className="font-term text-[12px] text-ink/65">/</span>
        <span className="text-[14px] font-semibold text-ink">{flowName || "Untitled flow"}</span>
        <span className="flex-1" />
        <Switch checked={enabled} onCheckedChange={setEnabled} label={enabled ? "Enabled" : "Paused"} />
        <Button compact disabled={write.busy} onClick={() => void run(true)}><Eye size={13} /> {dirty ? "Save & test run" : "Test run"}</Button>
        <Button variant="primary" compact disabled={write.busy} onClick={() => void run(false)}><Play size={13} /> {dirty ? "Save & run" : "Run"}</Button>
      </div>

      {/* Meta card */}
      <div className={`${card} px-5 py-4`}>
        <input
          value={flowName} onChange={(e) => { setFlowName(e.target.value); setDirty(true); }}
          placeholder="Name this flow"
          className={`w-full bg-transparent font-display text-[22px] font-bold tracking-[-0.01em] text-ink outline-none placeholder:text-ink/30 rounded-[3px] ${focusRing}`}
        />
        <input
          value={desc} onChange={(e) => { setDesc(e.target.value); setDirty(true); }}
          placeholder="What does this flow guarantee? One sentence."
          className={`mt-1 w-full bg-transparent text-[13px] text-ink/60 outline-none placeholder:text-ink/30 rounded-[3px] ${focusRing}`}
        />
      </div>

      {/* Editor grid */}
      <div className={split}>
        {/* Pipeline spine */}
        <div className="relative pl-10">
          <span aria-hidden className="pointer-events-none absolute left-[17px] top-4 bottom-8 border-l border-dashed border-ink/25" />
          {/* Step count above the spine (§13). A long flow renders one page of
              steps rather than a spine thousands of pixels tall. */}
          {steps.length > STEP_PAGE && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-term text-[11.5px] text-ink/65">
                {allSteps
                  ? `Showing all ${steps.length.toLocaleString()} steps`
                  : `Showing ${STEP_PAGE} of ${steps.length.toLocaleString()} steps`}
              </span>
              <Button variant="link" aria-expanded={allSteps} onClick={() => setAllSteps((v) => !v)}>
                {allSteps ? "Show fewer" : "Show all"}
              </Button>
            </div>
          )}
          <ol className="flex flex-col gap-1">
            {visibleSteps.map((s, i) => {
              const sec = SECTION_OF[s.kind];
              const meta = KIND_META[s.kind];
              const selected = i === selIdx;
              const bl = branchLabelFor(i);
              return (
                <li key={i}>
                  {i > 0 && <Inserter onClick={() => setInsertAt(insertAt === i ? null : i)} />}
                  {insertAt === i && <StepPicker onPick={(k) => insertStep(i, k)} onClose={() => setInsertAt(null)} />}
                  <div className={s.only_if_branch ? "ml-8" : ""}>
                    {bl && <div className="mb-1 font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-espelette">{bl}</div>}
                    <div
                      role="button" tabIndex={0}
                      onClick={() => setSel(i)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); } }}
                      aria-current={selected || undefined}
                      className={[
                        card, "relative block w-full cursor-pointer px-3.5 py-3 text-left transition-colors",
                        selected ? "border-espelette/60 ring-2 ring-espelette/25" : "hover:border-ink/30",
                        focusRing,
                      ].join(" ")}
                    >
                      <span aria-hidden className={`absolute top-5 h-2.5 w-2.5 rounded-full border-2 ${s.only_if_branch ? "-left-[57px]" : "-left-[29px]"} ${selected ? "bg-espelette border-espelette" : "bg-paper border-ink/30"}`} />
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-[2px] font-term text-[9px] font-bold uppercase tracking-[0.12em] ${SECTION_CHIP[sec]}`}>{SECTION_TITLE[sec]}</span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[14px] font-semibold text-ink">
                          <span className="shrink-0 text-ink/70">{meta.icon}</span>
                          <Truncate>{s.label}</Truncate>
                        </span>
                        {i > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            <IconTool label="Move up" disabled={i <= 1} onClick={() => moveStep(i, -1)}><ArrowUp size={13} /></IconTool>
                            <IconTool label="Move down" disabled={i >= steps.length - 1} onClick={() => moveStep(i, 1)}><ArrowDown size={13} /></IconTool>
                            {/* Destructive, so it arms first (CONVENTIONS §2). */}
                            <span onClick={(e) => e.stopPropagation()}>
                              <ConfirmButton compact aria-label="Delete step" title="Delete step" confirmLabel="Delete?" onConfirm={() => deleteStep(i)}>
                                <Trash2 size={13} />
                              </ConfirmButton>
                            </span>
                          </span>
                        )}
                      </div>
                      <Truncate lines={2} className="mt-1 text-[12px] leading-snug text-ink/70">{stepSummary(s)}</Truncate>
                      {meta.llm && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-clay/35 bg-clay/[0.07] px-2 py-[2px] font-term text-[10px] font-medium tracking-[0.06em] text-clay">
                          <Sparkles size={10} /> LLM: runs the local model, slower
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="pl-0"><Inserter onClick={() => setInsertAt(insertAt === steps.length ? null : steps.length)} /></div>
          {insertAt === steps.length && <StepPicker onPick={(k) => insertStep(steps.length, k)} onClose={() => setInsertAt(null)} />}
        </div>

        {/* Config panel */}
        {/* Sticky from the breakpoint the split actually appears at (xl). */}
        <div className="xl:sticky xl:top-4">
          <ConfigPanel
            key={`${selIdx}-${selStep?.kind}`}
            step={selStep}
            idx={selIdx}
            members={members}
            sites={sites}
            tags={tags}
            onLabel={(v) => patch(selIdx, { label: v })}
            onConfig={(k, v) => setConfig(selIdx, k, v)}
            onBranch={(v) => patch(selIdx, { only_if_branch: v })}
            /* The REAL save. This used to be `() => setDirty(false)`: the
               panel showed "Step saved.", the footer flipped to "Saved.",
               "Save flow" went disabled and Run stopped saving first, so
               every edit made here was discarded and the next run executed
               the previous version (A1). */
            onSave={save}
            busy={write.busy}
          />
        </div>
      </div>

      {/* Footer */}
      {/* A draft the engine cannot run never reaches the server, so its
          rejection has to come from here — same banner tone and heading a
          server rejection uses, naming the step (WF11, §8). */}
      {problems.length > 0 && (
        <Alert tone="blocked" title={ERRORS["generic.saveFailed"].title} onDismiss={() => setProblems([])}>
          <ul className="ml-4 list-disc space-y-1">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Alert>
      )}
      <WriteError>{write.failed}</WriteError>
      <div className={`${card} flex flex-wrap items-center gap-2 px-5 py-3`}>
        <Button variant="primary" compact disabled={!dirty || write.busy} onClick={() => void save()}>Save flow</Button>
        <Button compact disabled={write.busy} onClick={() => void run(true)}><Eye size={13} /> {dirty ? "Save & test run" : "Test run"}</Button>
        <Button compact disabled={write.busy} onClick={() => void run(false)}><Play size={13} /> {dirty ? "Save & run" : "Run"}</Button>
        <DryChip />
        <span className="font-term text-[11.5px] text-ink/70">is what a test run records.</span>
        <span className="flex-1" />
        <span className="font-term text-[11.5px] text-ink/70">
          {dirty ? "Unsaved changes: runs use the saved version, so Run saves first." : "Saved."}
        </span>
      </div>

      <FlowRunsTable runs={runs} title="Run history" />
    </div>
  );
}

/* ── step summary ──────────────────────────────────────────────────────── */
function stepSummary(s: EditorStep): string {
  const c = s.config;
  switch (s.kind) {
    case "trigger": return asStr(c.query) ? `Watches ${asStr(c.query)}` : "Watches a scope of documents";
    case "fetch_docs": return `Query "${asStr(c.query) || "any"}", top ${asNum(c.k, 3)} docs`;
    case "refine": return `Mari skill: ${asStr(c.skill) || "tighten"}`;
    case "tag": return `Applies "${asStr(c.tag) || "needs-review"}"`;
    case "condition": return `if ${asStr(c.field)} > ${asNum(c.greater_than)}`;
    case "approval": return `Approver: ${asStr(c.assignee) || "unassigned"}`;
    case "create_task": return `${asStr(c.kind_label) || "Task"}: ${asStr(c.title) || "untitled"}`;
    case "notify": return asStr(c.text) || "Sends an in-app notification";
    case "deploy_site": return `Publishes site #${asNum(c.site_id, 1)}`;
    case "sync_source": return `Re-syncs source #${asNum(c.source_id)}`;
    default: return KIND_META[s.kind].desc;
  }
}

/* ── inserter + tools ──────────────────────────────────────────────────── */
function Inserter({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative flex h-6 items-center">
      <button type="button" onClick={onClick} aria-label="Add a step"
        className={`grid h-5 w-5 place-items-center rounded-full border border-ink/25 bg-paper text-ink/65 hover:border-biscay-2 hover:text-biscay-2 ${focusRing}`}>
        <Plus size={12} />
      </button>
    </div>
  );
}

function IconTool({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`grid h-6 w-6 place-items-center rounded-[4px] text-ink/65 hover:bg-flysch hover:text-ink disabled:opacity-30 disabled:pointer-events-none ${focusRing}`}>
      {children}
    </button>
  );
}

/* ── step picker ───────────────────────────────────────────────────────── */
function StepPicker({ onPick, onClose }: { onPick: (kind: StepKind) => void; onClose: () => void }) {
  return (
    <div className={`${card} my-2 p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">Add a step</span>
        <button type="button" onClick={onClose} aria-label="Close picker" className={`grid h-6 w-6 place-items-center rounded-[4px] text-ink/65 hover:bg-flysch ${focusRing}`}><X size={14} /></button>
      </div>
      <div className="flex flex-col gap-3">
        {PICKER_SECTIONS.map((sec) => (
          <div key={sec.section}>
            <div className="mb-1.5 font-term text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink/65">
              {SECTION_TITLE[sec.section]} <span className="text-ink/65">{sec.tagline}</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {sec.kinds.map((k) => {
                const meta = KIND_META[k];
                return (
                  <button key={k} type="button" onClick={() => onPick(k)}
                    className={`${card} flex items-start gap-2 p-2.5 text-left hover:border-biscay-2/50 ${focusRing}`}>
                    <span className="mt-0.5 text-ink/70">{meta.icon}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        {meta.name}
                        {meta.llm && <Sparkles size={11} className="text-clay" />}
                      </span>
                      <span className="block text-[11.5px] leading-snug text-ink/70">{meta.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── config panel ──────────────────────────────────────────────────────── */
function ConfigPanel({
  step, idx, members, sites, tags, onLabel, onConfig, onBranch, onSave, busy = false,
}: {
  step: EditorStep | undefined; idx: number;
  members: string[]; sites: SiteRef[]; tags: string[];
  onLabel: (v: string) => void; onConfig: (key: string, value: unknown) => void; onBranch: (v: boolean) => void;
  /** Persists the flow. Resolves false when the save was blocked or rejected,
      so "Saved." is only ever drawn over a save that happened. */
  onSave: () => Promise<boolean>;
  busy?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  if (!step) return <div className={`${card} px-5 py-6 text-[13px] text-ink/70`}>Select a step to configure it.</div>;
  const meta = KIND_META[step.kind];
  const sec = SECTION_OF[step.kind];
  const c = step.config;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-ink/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-[4px] border px-1.5 py-[2px] font-term text-[9px] font-bold uppercase tracking-[0.12em] ${SECTION_CHIP[sec]}`}>{SECTION_TITLE[sec]}</span>
          <span className="text-[15px] font-semibold text-ink">{meta.name}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-ink/70">{meta.desc}</p>
        {meta.llm && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-clay/35 bg-clay/[0.07] px-2 py-[2px] font-term text-[10px] font-medium tracking-[0.06em] text-clay">
            <Sparkles size={10} /> LLM: slower
          </span>
        )}
      </div>
      <div className="px-4 py-1">
        <Field label="Label">
          <Input value={step.label} onChange={(e) => onLabel(e.target.value)} className="w-full" />
        </Field>

        {step.kind === "trigger" && (
          <>
            <Field label="Event"><Input value={asStr(c.label)} onChange={(e) => onConfig("label", e.target.value)} placeholder="e.g. GitHub PR merged" className="w-full" /></Field>
            <Field label="Scope query"><Input value={asStr(c.query)} onChange={(e) => onConfig("query", e.target.value)} placeholder="docs/**" className="w-full font-term" /></Field>
            {/* A "Currently matches N documents" line used to sit here. N was
                `3 + (query.length % 22)` — a number the editor cannot know,
                moving as the user typed, in biscay blue (I3). Removed rather
                than replaced: nothing in this build counts the matches. */}
          </>
        )}

        {step.kind === "fetch_docs" && (
          <>
            <Field label="Search query"><Input value={asStr(c.query)} onChange={(e) => onConfig("query", e.target.value)} className="w-full" /></Field>
            <Field label="Tag filter">
              <Select value={asStr(c.tag)} onChange={(e) => onConfig("tag", e.target.value)} className="w-full">
                <option value="">Any tag</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Max documents (k)">
              <Input type="number" min={1} max={25} value={asNum(c.k, 3)} onChange={(e) => onConfig("k", Math.max(1, asNum(e.target.value, 1)))} className="w-full" />
            </Field>
          </>
        )}

        {step.kind === "refine" && (
          <Field label="Mari skill">
            <Select value={asStr(c.skill)} onChange={(e) => onConfig("skill", e.target.value)} className="w-full">
              {REFINE_SKILLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        )}

        {step.kind === "tag" && (
          <Field label="Tag to apply">
            <Select value={asStr(c.tag)} onChange={(e) => onConfig("tag", e.target.value)} className="w-full">
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        )}

        {step.kind === "condition" && (
          <>
            <Field label="Field">
              <Select value={asStr(c.field)} onChange={(e) => onConfig("field", e.target.value)} className="w-full">
                {CONDITION_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Is greater than">
              <Input type="number" min={0} value={asNum(c.greater_than)} onChange={(e) => onConfig("greater_than", Math.max(0, asNum(e.target.value)))} className="w-full" />
            </Field>
          </>
        )}

        {step.kind === "create_task" && (
          <>
            <Field label="Task title"><Input value={asStr(c.title)} onChange={(e) => onConfig("title", e.target.value)} className="w-full" /></Field>
            <Field label="Assignee">
              <Select value={asStr(c.assignee)} onChange={(e) => onConfig("assignee", e.target.value)} className="w-full">
                <option value="">Anyone, unassigned</option>
                {members.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Kind">
              <Select value={asStr(c.kind) || "review"} onChange={(e) => { const k = TASK_KINDS.find((x) => x.value === e.target.value); onConfig("kind", e.target.value); onConfig("kind_label", k?.label ?? "Review"); }} className="w-full">
                {TASK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </Field>
            <div className="py-2.5">
              <Switch checked={Boolean(step.only_if_branch)} onCheckedChange={onBranch} label="Only on the yes-branch" />
            </div>
          </>
        )}

        {step.kind === "approval" && (
          <Field label="Approver">
            <Select value={asStr(c.assignee)} onChange={(e) => onConfig("assignee", e.target.value)} className="w-full">
              <option value="">Choose an approver</option>
              {members.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        )}

        {step.kind === "notify" && (
          <>
            <Field label="Notify">
              <Select value={asStr(c.assignee)} onChange={(e) => onConfig("assignee", e.target.value)} className="w-full">
                <option value="">Optional</option>
                {members.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Message"><Input value={asStr(c.text)} onChange={(e) => onConfig("text", e.target.value)} className="w-full" /></Field>
            <Field label="Detail"><Input value={asStr(c.detail)} onChange={(e) => onConfig("detail", e.target.value)} className="w-full" /></Field>
          </>
        )}

        {step.kind === "deploy_site" && (
          <Field label="Site">
            <Select value={asNum(c.site_id, 1)} onChange={(e) => onConfig("site_id", asNum(e.target.value, 1))} className="w-full">
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}

        {(step.kind === "fact_check" || step.kind === "summarize" || step.kind === "derive_links" || step.kind === "refresh_digest" || step.kind === "scan_facts") && (
          <div className="py-3 text-[12px] leading-snug text-ink/65">
            No configuration for this step: it operates over the fetched set from earlier in the flow. Position it after a Fetch docs step.
          </div>
        )}
      </div>

      {/* The affirmative action is BOTTOM LEFT (CONVENTIONS §2). A step's
          settings are part of the flow, so this saves the flow: there is no
          per-step write, and the button that pretended otherwise threw the
          edit away (A1). */}
      <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 px-4 py-3">
        <Button
          variant="primary" compact disabled={busy}
          onClick={async () => {
            if (!(await onSave())) return;
            setSaved(true);
            window.setTimeout(() => setSaved(false), 1800);
          }}
        >
          Save flow
        </Button>
        {saved && <span className="font-term text-[11.5px] text-moss">Saved.</span>}
      </div>
    </div>
  );
}
