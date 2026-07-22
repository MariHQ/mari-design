import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Workflow, Bell, FileText } from "lucide-react";
import { FlowsList } from "../features/FlowsList";
import { FlowsPipelineEditor, type EditorStep } from "../features/FlowsPipelineEditor";
import { FlowsRunHistory } from "../features/FlowsRunHistory";
import { FlowsRunPanel } from "../features/FlowsRunPanel";
import type { WorkflowRun } from "../workflow/RunHistory";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT,
  HUGE_NUMBER, HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS, LONG_BREADCRUMB, repeat,
} from "./stress";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Drawer } from "../layout/Drawer";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { ErrorMessage } from "../feedback/ErrorMessage";

/* Flows (pages/flows.md). The automation surface — a single route that swaps
   between three surfaces held in local state: the list view (template gallery +
   flow list + run history), the full-screen pipeline editor, and the slide-in
   run / trigger panels layered over whichever surface is showing.

   The `state` prop enumerates every reasonable view: the list, the editor
   (linear flow and a branching flow), the run panel across its lifecycle
   (approval / passed / failed dry-run), the durable run-history table, the
   trigger editor for each trigger kind (manual / schedule / document), plus
   loading / offline / empty. */

const STATES = [
  { id: "default", label: "Default (list)" },
  { id: "pipeline-editor", label: "Pipeline editor" },
  { id: "pipeline-branch", label: "Pipeline editor · branching" },
  { id: "run", label: "Run panel · waiting (approval)" },
  { id: "run-passed", label: "Run panel · passed" },
  { id: "run-failed", label: "Run panel · failed (dry run)" },
  { id: "run-history", label: "Run history · running" },
  { id: "trigger-manual", label: "Trigger editor · manual" },
  { id: "trigger-schedule", label: "Trigger editor · schedule" },
  { id: "trigger-document", label: "Trigger editor · document" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No flows yet" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* Overflow / stress runs: long headlines, workflow names, and step labels
   injected as data props into the run-history table + panel. `overflow` uses
   natural long text; `stress` uses pathological tokens + huge run numbers. */
function stressRuns(pathological: boolean): WorkflowRun[] {
  const STATUS = ["passed", "running", "waiting", "failed", "skipped"] as const;
  return repeat((i) => ({
    id: `sr${i}`,
    number: pathological ? HUGE_NUMBER + i : 1000 + i,
    workflowName: pathological ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3] : LONG_TITLE,
    status: STATUS[i % STATUS.length],
    dry: i % 2 === 0,
    started: "2026-07-21T08:30:00",
    duration: "00:01:04",
    triggeredBy: `Triggered by: ${pathological ? UNBREAKABLE : LONG_SOURCE}`,
    headline: pathological ? `${MIXED_SCRIPT} ${HUGE_NUMBER_STR}` : LONG_PARAGRAPH,
    rows: [
      { step: pathological ? UNBREAKABLE : LONG_TITLE, status: "passed", detail: pathological ? LONG_WORD : LONG_SOURCE, duration: "0.2s" },
      { step: pathological ? LONG_WORD : "Fetch every document across every source and region", status: "running", detail: pathological ? HUGE_NUMBER_STR : LONG_PARAGRAPH },
    ],
    stats: [
      { label: pathological ? LONG_WORD : "Contradictions found", value: pathological ? HUGE_NUMBER : 128, bad: true },
      { label: "Facts", value: pathological ? HUGE_NUMBER + i : 9 },
    ],
  }), pathological ? 24 : 6);
}

function StressExtras({ pathological }: { pathological: boolean }) {
  return (
    <Card title={pathological ? MIXED_SCRIPT : LONG_TITLE}>
      <Breadcrumb items={LONG_BREADCRUMB.map((label) => ({ label }))} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(pathological ? MANY_TAGS : MANY_TAGS.slice(0, 10)).map((t) => <Chip key={t} label={t} />)}
      </div>
      <div className="mt-3">
        <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={pathological ? 4 : 6} />
      </div>
    </Card>
  );
}

const BRANCH_STEPS: EditorStep[] = [
  { kind: "trigger", label: "Weekly scan", config: { label: "Weekly scan", query: "stale" } },
  { kind: "fetch_docs", label: "Fetch stale docs", config: { query: "stale", k: 8 } },
  { kind: "fact_check", label: "Verify facts", config: {} },
  { kind: "condition", label: "Contradictions?", config: { field: "contradictions", greater_than: 0 } },
  { kind: "create_task", label: "Open review task", config: { title: "Resolve contradiction", kind: "factcheck", kind_label: "Fact check" }, only_if_branch: true },
  { kind: "notify", label: "Ping the owner", config: { text: "A contradiction needs a look", detail: "" }, only_if_branch: true },
];

/* ── inline trigger editor ──────────────────────────────────────────────────
   A static preview of the Trigger Drawer from FlowsList (which owns its own
   open state and can't be pre-opened via props). Rebuilt here from catalog
   primitives so each trigger kind shows as its own gallery state. */

type TriggerKind = "manual" | "schedule" | "document";

const TRIGGER_META: Record<TriggerKind, { flow: string; on: string }> = {
  manual: { flow: "Onboarding checker", on: "" },
  schedule: { flow: "Slack digest", on: "schedule" },
  document: { flow: "Docs guardrail", on: "document_changed" },
};

function TriggerEditorPreview({ kind }: { kind: TriggerKind }) {
  const meta = TRIGGER_META[kind];
  return (
    <Drawer
      open
      variant="inline"
      closable
      onClose={() => {}}
      title="Trigger"
      subtitle={meta.flow}
      icon={<Bell size={16} className="text-ink/65" />}
      footer={
        <>
          <Button variant="primary">Save trigger</Button>
          <Button>Cancel</Button>
        </>
      }
    >
      <Field label="On">
        <Select value={meta.on} onChange={() => {}} className="w-full">
          <option value="">Manual only</option>
          <option value="document_added">Document added</option>
          <option value="document_changed">Document changed</option>
          <option value="schedule">Schedule</option>
        </Select>
      </Field>

      {kind === "schedule" && (
        <Field label="Every (minutes)">
          <Input type="number" min={1} max={10080} value={10080} onChange={() => {}} className="w-full" />
          <div className="mt-1.5 font-term text-[11px] text-ink/65">Every week · presets: 10 / 60 / 1440 / 10080</div>
          <div className="mt-1 text-[11.5px] text-ink/65">
            The scheduler checks twice a minute and never starts a run while the previous one is still going.
          </div>
        </Field>
      )}

      {kind === "document" && (
        <>
          <Field label="Source">
            <Select value="1" onChange={() => {}} className="w-full">
              <option value="">Any source</option>
              <option value="1">GitHub · product-docs</option>
              <option value="2">Slack · #support</option>
            </Select>
          </Field>
          <Field label="Tag">
            <Input value="customer-facing" onChange={() => {}} className="w-full" />
          </Field>
          <Field label="Path glob">
            <Input value="docs/**" onChange={() => {}} className="w-full font-term" />
          </Field>
          <div className="pt-2 text-[11.5px] text-ink/65">Filters are optional and combine: a run fires only when all set filters match.</div>
        </>
      )}

      {kind === "manual" && (
        <div className="pt-2 text-[12.5px] text-ink/70">
          <FileText size={13} className="mr-1 inline text-ink/65" />
          Manual only: this flow runs when you press Run or Test run.
        </div>
      )}
    </Drawer>
  );
}

const TRIGGER_STATE: Record<string, TriggerKind> = {
  "trigger-manual": "manual",
  "trigger-schedule": "schedule",
  "trigger-document": "document",
};

/* States that render <FlowsList/>, which brings its OWN page header (title,
   summary, and a working "New flow"). The page must not stack a second header
   on top of it, so `pageHeaderFor` returns null for these. */
const LIST_STATES = (state: string) => state === "default" || state in TRIGGER_STATE;

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  if (state === "error") return <ErrorMessage id="server.unavailable" />;
  if (state === "empty") {
    return (
      <EmptyState icon={<Workflow size={22} />} title="No flows yet">
        Start from a template or create one to automate editorial work.
      </EmptyState>
    );
  }

  if (state === "overflow" || state === "stress") {
    const p = state === "stress";
    return (
      <>
        <StressExtras pathological={p} />
        <FlowsRunHistory runs={stressRuns(p)} limit={p ? 24 : 6} />
      </>
    );
  }

  if (state === "pipeline-editor") return <FlowsPipelineEditor />;
  if (state === "pipeline-branch") {
    return (
      <FlowsPipelineEditor
        name="Stale sweeper"
        description="Flags docs that have gone quiet and routes contradictions for review."
        steps={BRANCH_STEPS}
      />
    );
  }

  if (state === "run-history") return <FlowsRunHistory />;

  if (state === "run" || state === "run-passed" || state === "run-failed") {
    const openNumber = state === "run-passed" ? 145 : state === "run-failed" ? 143 : 209;
    return <FlowsRunPanel openNumber={openNumber} />;
  }

  const triggerKind = TRIGGER_STATE[state];
  if (triggerKind) {
    /* Fixed 420px editor rail beside the list on desktop (§10: no
       flex-col/lg:flex-row); on mobile the rail stacks under the list. */
    if (mobile) {
      return (
        <div className="flex flex-col gap-5">
          <FlowsList />
          <TriggerEditorPreview kind={triggerKind} />
        </div>
      );
    }
    return (
      <div className="flex gap-5">
        <div className="min-w-0 flex-1"><FlowsList /></div>
        <div className="w-[420px] shrink-0"><TriggerEditorPreview kind={triggerKind} /></div>
      </div>
    );
  }

  return <FlowsList />;
}

function FlowsPage({ state = "default", mobile = false }: PageProps) {
  const editing = state === "pipeline-editor" || state === "pipeline-branch";
  const showHeader = !editing && !LIST_STATES(state);
  return (
    <PageFrame active={navFor("flows")} title="Flows" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="list" />
      ) : (
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          {showHeader && (
            <PageHeader
              eyebrow="Flows"
              title="Flows"
              description="When something happens to your knowledge, Mari does the editorial work, checks it, then delivers it."
            />
          )}
          <div className={`flex flex-col gap-5 ${showHeader ? "mt-6" : ""}`}>
            <Body state={state} mobile={mobile} />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "flows",
  title: "Flows",
  route: "/flows",
  component: FlowsPage,
  states: STATES.map((s) => ({ ...s })),
};
