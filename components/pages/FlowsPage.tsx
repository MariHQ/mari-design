import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Workflow, Plus, Bell, FileText } from "lucide-react";
import { FlowsList } from "../features/FlowsList";
import { FlowsPipelineEditor, type EditorStep } from "../features/FlowsPipelineEditor";
import { FlowsRunHistory } from "../features/FlowsRunHistory";
import { FlowsRunPanel } from "../features/FlowsRunPanel";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Drawer } from "../layout/Drawer";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";

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
] as const;

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
      icon={<Bell size={16} className="text-ink/50" />}
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
          <div className="mt-1.5 font-term text-[11px] text-ink/50">Every week · presets: 10 / 60 / 1440 / 10080</div>
          <div className="mt-1 text-[11.5px] text-ink/45">
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
          <div className="pt-2 text-[11.5px] text-ink/45">Filters are optional and combine — a run fires only when all set filters match.</div>
        </>
      )}

      {kind === "manual" && (
        <div className="pt-2 text-[12.5px] text-ink/55">
          <FileText size={13} className="mr-1 inline text-ink/40" />
          Manual-only — this flow runs when you press Run or Test run.
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

function Body({ state }: { state: string }) {
  if (state === "loading") {
    return <div className="grid place-items-center py-24"><Spinner size="md" label="Loading flows" /></div>;
  }
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Workflow size={22} />} title="API offline">
          Flows unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Workflow size={22} />} title="No flows yet">
          Start from a template or create one to automate editorial work.
        </EmptyState>
      </div>
    );
  }

  if (state === "pipeline-editor") {
    return <div className="mt-5"><FlowsPipelineEditor /></div>;
  }
  if (state === "pipeline-branch") {
    return (
      <div className="mt-5">
        <FlowsPipelineEditor
          name="Stale sweeper"
          description="Flags docs that have gone quiet and routes contradictions for review."
          steps={BRANCH_STEPS}
        />
      </div>
    );
  }

  if (state === "run-history") {
    return <div className="mt-5"><FlowsRunHistory /></div>;
  }

  if (state === "run" || state === "run-passed" || state === "run-failed") {
    const openNumber = state === "run-passed" ? 145 : state === "run-failed" ? 143 : 209;
    return <div className="mt-5"><FlowsRunPanel openNumber={openNumber} /></div>;
  }

  const triggerKind = TRIGGER_STATE[state];
  if (triggerKind) {
    return (
      <div className="mt-5 flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1"><FlowsList /></div>
        <div className="w-full shrink-0 lg:w-[420px]"><TriggerEditorPreview kind={triggerKind} /></div>
      </div>
    );
  }

  return <div className="mt-5"><FlowsList /></div>;
}

function FlowsPage({ state = "default", mobile = false }: PageProps) {
  const editing = state === "pipeline-editor" || state === "pipeline-branch";
  return (
    <PageFrame active={navFor("flows")} title="Flows" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        {!editing && (
          <PageHeader
            eyebrow="Flows"
            title="Flows"
            description="When something happens to your knowledge, Mari does the editorial work, checks it, then delivers it."
            actions={<Button variant="primary" icon={false}><Plus size={15} /> New flow</Button>}
          />
        )}
        <Body state={state} />
      </div>
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
