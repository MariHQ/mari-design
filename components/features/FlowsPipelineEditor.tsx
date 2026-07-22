import { useState, type ReactNode } from "react";
import {
  ChevronLeft, Play, Eye, Plus, ArrowUp, ArrowDown, Trash2, X, Sparkles,
  Search, Filter, GitBranch, Tag, CheckSquare, Bell, FileText, Send, Globe, RefreshCw,
} from "lucide-react";
import { Button } from "../actions/Button";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Switch } from "../forms/Switch";
import { RunHistory, type WorkflowRun } from "../workflow/RunHistory";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

/* Flows pipeline editor — a Zapier-style vertical step spine. The flow is an
   ordered list of steps beginning with one pinned trigger; selecting a step
   loads its settings in a sticky config panel; a "+" between steps opens the
   step picker. Owns the in-memory draft (name/steps/selection/dirty). Scoped
   run history renders below. Renders standalone with a baked draft. */

type StepKind =
  | "trigger" | "fetch_docs" | "refine" | "fact_check" | "condition" | "tag"
  | "derive_links" | "create_task" | "approval" | "deploy_site" | "notify"
  | "summarize" | "sync_source" | "refresh_digest";

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
  derive_links: "do", sync_source: "do", refresh_digest: "do",
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
  summarize: { name: "Summarize", llm: true, desc: "Drafts a summary of the fetched documents — useful for digests and drafts.", defLabel: "Summarize", defConfig: {}, icon: I(<FileText size={15} />) },
  tag: { name: "Tag docs", desc: "Applies a tag to every fetched document. Dry runs preview the tagging.", defLabel: "Tag docs", defConfig: { tag: "needs-review" }, icon: I(<Tag size={15} />) },
  derive_links: { name: "Derive links", llm: true, desc: "Suggests lineage links between the fetched docs and related knowledge.", defLabel: "Derive links", defConfig: {}, icon: I(<GitBranch size={15} />) },
  condition: { name: "Condition", desc: "Branches on a run stat (e.g. contradictions > 0). Yes-branch steps run when it passes.", defLabel: "Contradictions?", defConfig: { field: "contradictions", greater_than: 0 }, icon: I(<Filter size={15} />) },
  approval: { name: "Approval", desc: "Pauses the run as waiting until the assignee approves it from the run panel.", defLabel: "Approval", defConfig: { assignee: "Aki K." }, icon: I(<CheckSquare size={15} />) },
  create_task: { name: "Create task", desc: "Opens a task on the Tasks board. Dry runs preview the task.", defLabel: "Create task", defConfig: { title: "", kind: "review", kind_label: "Review" }, icon: I(<CheckSquare size={15} />) },
  notify: { name: "Notify", desc: "Sends an in-app notification. Dry runs preview the message.", defLabel: "Notify", defConfig: { text: "", detail: "" }, icon: I(<Bell size={15} />) },
  deploy_site: { name: "Deploy site", desc: "Publishes a documentation site version. Dry runs report what would deploy.", defLabel: "Deploy site", defConfig: { site_id: 1 }, icon: I(<Globe size={15} />) },
  sync_source: { name: "Sync source", desc: "Re-syncs a connected source so the run sees the latest.", defLabel: "Sync source", defConfig: { source_id: 0 }, icon: I(<RefreshCw size={15} />) },
  refresh_digest: { name: "Refresh digest", llm: true, desc: "Rebuilds the recent-activity digest over recent docs.", defLabel: "Refresh digest", defConfig: {}, icon: I(<Send size={15} />) },
};

const REFINE_SKILLS = ["tighten", "clarify", "sharpen", "deslop", "understate", "polish"];
const CONDITION_FIELDS = ["contradictions", "edits", "links", "facts", "docs"];
const TASK_KINDS: { value: string; label: string }[] = [
  { value: "review", label: "Review" }, { value: "factcheck", label: "Fact check" },
  { value: "stale", label: "Stale" }, { value: "approval", label: "Approval" },
];

const PICKER_SECTIONS: { section: Section; tagline: string; kinds: StepKind[] }[] = [
  { section: "do", tagline: "editorial work on the matched docs", kinds: ["fetch_docs", "refine", "fact_check", "summarize", "tag", "derive_links"] },
  { section: "check", tagline: "gate the result", kinds: ["condition", "approval"] },
  { section: "then", tagline: "deliver where the team works", kinds: ["create_task", "notify", "deploy_site"] },
];

const DEMO_MEMBERS = ["Aki K.", "Dana R.", "Priya S."];
const DEMO_SITES = [{ id: 1, name: "Docs — production" }, { id: 2, name: "Docs — staging" }];
const DEMO_TAGS = ["needs-review", "customer-facing", "internal", "stale"];

const DEMO_STEPS: EditorStep[] = [
  { kind: "trigger", label: "GitHub PR merged", config: { label: "GitHub PR merged", query: "docs/**" } },
  { kind: "fetch_docs", label: "Fetch changed docs", config: { query: "docs/**", k: 5 } },
  { kind: "fact_check", label: "Verify facts", config: {} },
  { kind: "condition", label: "Contradictions?", config: { field: "contradictions", greater_than: 0 } },
  { kind: "create_task", label: "Open review task", config: { title: "Resolve contradiction", kind: "factcheck", kind_label: "Fact check" }, only_if_branch: true },
];

const DEMO_RUNS: WorkflowRun[] = [
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", headline: "No contradictions found across 5 docs" },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", started: "2026-07-19T10:02:00", duration: "00:01:12", headline: "2 contradictions — review task opened" },
  { id: "r140", number: 140, workflowName: "Docs guardrail", status: "passed", started: "2026-07-18T16:44:00", duration: "00:00:38", dry: true, headline: "Dry run — 1 task previewed" },
];

const asNum = (v: unknown, f = 0) => { const n = Number(v); return Number.isNaN(n) ? f : n; };
const asStr = (v: unknown) => (v == null ? "" : String(v));

export type FlowsPipelineEditorProps = {
  name?: string;
  description?: string;
  steps?: EditorStep[];
  runs?: WorkflowRun[];
  className?: string;
};

export function FlowsPipelineEditor({
  name = "Docs guardrail",
  description = "Fact-checks every changed doc before it can ship.",
  steps: initialSteps = DEMO_STEPS,
  runs = DEMO_RUNS,
  className = "",
}: FlowsPipelineEditorProps) {
  const [flowName, setFlowName] = useState(name);
  const [desc, setDesc] = useState(description);
  const [steps, setSteps] = useState<EditorStep[]>(initialSteps);
  const [sel, setSel] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [insertAt, setInsertAt] = useState<number | null>(null);

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
    if (!steps[i].only_if_branch) return null;
    for (let j = i - 1; j >= 0; j--) {
      if (steps[j].kind === "condition") return `if ${asStr(steps[j].config.field)} > ${asNum(steps[j].config.greater_than)}`;
      if (!steps[j].only_if_branch) break;
    }
    return null;
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="link" className="text-ink/60"><ChevronLeft size={15} /> Flows</Button>
        <span className="font-term text-[12px] text-ink/40">/</span>
        <span className="text-[14px] font-semibold text-ink">{flowName || "Untitled flow"}</span>
        <span className="flex-1" />
        <Switch checked={enabled} onCheckedChange={setEnabled} label={enabled ? "Enabled" : "Paused"} />
        <Button compact><Eye size={13} /> {dirty ? "Save & test run" : "Test run"}</Button>
        <Button variant="primary" compact><Play size={13} /> {dirty ? "Save & run" : "Run"}</Button>
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Pipeline spine */}
        <div className="relative pl-10">
          <span aria-hidden className="pointer-events-none absolute left-[17px] top-4 bottom-8 border-l border-dashed border-ink/25" />
          <ol className="flex flex-col gap-1">
            {steps.map((s, i) => {
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
                          <span className="text-ink/60">{meta.icon}</span>
                          <span className="truncate">{s.label}</span>
                        </span>
                        {i > 0 && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            <IconTool label="Move up" disabled={i <= 1} onClick={() => moveStep(i, -1)}><ArrowUp size={13} /></IconTool>
                            <IconTool label="Move down" disabled={i >= steps.length - 1} onClick={() => moveStep(i, 1)}><ArrowDown size={13} /></IconTool>
                            <IconTool label="Delete step" onClick={() => deleteStep(i)}><Trash2 size={13} /></IconTool>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[12px] leading-snug text-ink/55">{stepSummary(s)}</div>
                      {meta.llm && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-clay/35 bg-clay/[0.07] px-2 py-[2px] font-term text-[10px] font-medium tracking-[0.06em] text-clay">
                          <Sparkles size={10} /> LLM — runs the local model, slower
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
        <div className="lg:sticky lg:top-4">
          <ConfigPanel key={`${selIdx}-${selStep?.kind}`} step={selStep} idx={selIdx} onLabel={(v) => patch(selIdx, { label: v })} onConfig={(k, v) => setConfig(selIdx, k, v)} onBranch={(v) => patch(selIdx, { only_if_branch: v })} />
        </div>
      </div>

      {/* Footer */}
      <div className={`${card} flex flex-wrap items-center gap-2 px-5 py-3`}>
        <Button variant="primary" compact disabled={!dirty} onClick={() => setDirty(false)}>Save flow</Button>
        <Button compact><Eye size={13} /> {dirty ? "Save & test run" : "Test run"}</Button>
        <Button compact><Play size={13} /> {dirty ? "Save & run" : "Run"}</Button>
        <span className="flex-1" />
        <span className="font-term text-[11.5px] text-ink/50">
          {dirty ? "Unsaved changes — runs use the saved version, so Run saves first." : "Saved."}
        </span>
      </div>

      <RunHistory runs={runs} title="Run history" />
    </div>
  );
}

/* ── step summary ──────────────────────────────────────────────────────── */
function stepSummary(s: EditorStep): string {
  const c = s.config;
  switch (s.kind) {
    case "trigger": return asStr(c.query) ? `Watches ${asStr(c.query)}` : "Watches a scope of documents";
    case "fetch_docs": return `Query "${asStr(c.query) || "—"}", top ${asNum(c.k, 3)} docs`;
    case "refine": return `Mari skill: ${asStr(c.skill) || "tighten"}`;
    case "tag": return `Applies "${asStr(c.tag) || "needs-review"}"`;
    case "condition": return `if ${asStr(c.field)} > ${asNum(c.greater_than)}`;
    case "approval": return `Approver: ${asStr(c.assignee) || "—"}`;
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
        className={`grid h-5 w-5 place-items-center rounded-full border border-ink/25 bg-paper text-ink/50 hover:border-biscay-2 hover:text-biscay-2 ${focusRing}`}>
        <Plus size={12} />
      </button>
    </div>
  );
}

function IconTool({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`grid h-6 w-6 place-items-center rounded-[4px] text-ink/45 hover:bg-flysch hover:text-ink disabled:opacity-30 disabled:pointer-events-none ${focusRing}`}>
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
        <button type="button" onClick={onClose} aria-label="Close picker" className={`grid h-6 w-6 place-items-center rounded-[4px] text-ink/50 hover:bg-flysch ${focusRing}`}><X size={14} /></button>
      </div>
      <div className="flex flex-col gap-3">
        {PICKER_SECTIONS.map((sec) => (
          <div key={sec.section}>
            <div className="mb-1.5 font-term text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink/50">
              {SECTION_TITLE[sec.section]} <span className="text-ink/35">— {sec.tagline}</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {sec.kinds.map((k) => {
                const meta = KIND_META[k];
                return (
                  <button key={k} type="button" onClick={() => onPick(k)}
                    className={`${card} flex items-start gap-2 p-2.5 text-left hover:border-biscay-2/50 ${focusRing}`}>
                    <span className="mt-0.5 text-ink/55">{meta.icon}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                        {meta.name}
                        {meta.llm && <Sparkles size={11} className="text-clay" />}
                      </span>
                      <span className="block text-[11.5px] leading-snug text-ink/55">{meta.desc}</span>
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
  step, idx, onLabel, onConfig, onBranch,
}: {
  step: EditorStep | undefined; idx: number;
  onLabel: (v: string) => void; onConfig: (key: string, value: unknown) => void; onBranch: (v: boolean) => void;
}) {
  if (!step) return <div className={`${card} px-5 py-6 text-[13px] text-ink/55`}>Select a step to configure it.</div>;
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
        <p className="mt-1.5 text-[12px] leading-snug text-ink/55">{meta.desc}</p>
        {meta.llm && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-clay/35 bg-clay/[0.07] px-2 py-[2px] font-term text-[10px] font-medium tracking-[0.06em] text-clay">
            <Sparkles size={10} /> LLM — slower
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
            <HydrationHint query={asStr(c.query)} />
          </>
        )}

        {step.kind === "fetch_docs" && (
          <>
            <Field label="Search query"><Input value={asStr(c.query)} onChange={(e) => onConfig("query", e.target.value)} className="w-full" /></Field>
            <Field label="Tag filter">
              <Select value={asStr(c.tag)} onChange={(e) => onConfig("tag", e.target.value)} className="w-full">
                <option value="">— any tag —</option>
                {DEMO_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Max documents (k)">
              <Input type="number" min={1} max={25} value={asNum(c.k, 3)} onChange={(e) => onConfig("k", Math.max(1, asNum(e.target.value, 1)))} className="w-full" />
            </Field>
            <HydrationHint query={asStr(c.query)} tail={`— top ${asNum(c.k, 3)} enter the run`} />
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
              {DEMO_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
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
                <option value="">— anyone / unassigned —</option>
                {DEMO_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
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
              <option value="">— choose —</option>
              {DEMO_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        )}

        {step.kind === "notify" && (
          <>
            <Field label="Notify">
              <Select value={asStr(c.assignee)} onChange={(e) => onConfig("assignee", e.target.value)} className="w-full">
                <option value="">— optional —</option>
                {DEMO_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Message"><Input value={asStr(c.text)} onChange={(e) => onConfig("text", e.target.value)} className="w-full" /></Field>
            <Field label="Detail"><Input value={asStr(c.detail)} onChange={(e) => onConfig("detail", e.target.value)} className="w-full" /></Field>
          </>
        )}

        {step.kind === "deploy_site" && (
          <Field label="Site">
            <Select value={asNum(c.site_id, 1)} onChange={(e) => onConfig("site_id", asNum(e.target.value, 1))} className="w-full">
              {DEMO_SITES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}

        {(step.kind === "fact_check" || step.kind === "summarize" || step.kind === "derive_links" || step.kind === "refresh_digest") && (
          <div className="py-3 text-[12px] leading-snug text-ink/55">
            No configuration — this step operates over the fetched set from earlier in the flow. Position it after a Fetch docs step.
          </div>
        )}
      </div>
    </div>
  );
}

function HydrationHint({ query, tail = "" }: { query: string; tail?: string }) {
  const q = query.trim();
  if (!q) return <div className="px-1 pb-3 pt-1 font-term text-[11px] text-ink/40">Enter a query to preview the matching documents.</div>;
  // Deterministic pseudo-count from the query so the demo reads as live.
  const n = 3 + (q.length % 22);
  return (
    <div className="px-1 pb-3 pt-1 font-term text-[11px] text-biscay-2">
      Currently matches {n} documents {tail}
    </div>
  );
}
