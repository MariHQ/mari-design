import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Workflow, Bell, FileText } from "lucide-react";
import { FlowsList, type Flow, type SourceRef } from "../features/FlowsList";
import { FlowsPipelineEditor, type EditorStep, type SiteRef } from "../features/FlowsPipelineEditor";
import { FlowsRunHistory } from "../features/FlowsRunHistory";
import { FlowsRunPanel } from "../features/FlowsRunPanel";
import type { WorkflowRun } from "../workflow/RunHistory";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
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
   between three surfaces: the list view (template gallery + flow list + run
   history), the full-screen pipeline editor, and the slide-in run / trigger
   panels layered over whichever surface is showing.

   This page is a pure presenter. It holds no demo content: which surface it
   shows is derived from the data it was handed — an `editor` payload means the
   pipeline editor, a `runPanel` means the run inspector, and a workspace with
   no flows at all falls out of `isEmpty`. The canvas supplies the same shape
   from `.preview/fixtures/flows.ts`. */

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

export type TriggerKind = "manual" | "schedule" | "document";

/** The pipeline editor, open on one flow. */
export type FlowsEditor = {
  name: string;
  description: string;
  steps: EditorStep[];
  runs: WorkflowRun[];
  members: string[];
  sites: SiteRef[];
  tags: string[];
};

/** The trigger editor, open beside the list. */
export type FlowsTrigger = {
  kind: TriggerKind;
  /** The flow whose trigger is being edited. */
  flow: string;
  /** The selected "On" event, "" for manual only. */
  on: string;
};

/** A supporting card carrying long label content. Only the long-text states
    have one, which is why it is nullable. */
export type FlowsExtras = {
  title: string;
  crumbs: string[];
  tags: string[];
  people: string[];
  avatarMax: number;
};

/** Everything the Flows page renders. Which surface shows is a function of
    which of these is present, so there is one rendering path for the app and
    for the canvas alike. */
export type FlowsData = {
  flows: Flow[];
  sources: SourceRef[];
  editor: FlowsEditor | null;
  runPanel: { runs: WorkflowRun[]; openNumber?: number } | null;
  runHistory: { runs: WorkflowRun[]; limit: number } | null;
  trigger: FlowsTrigger | null;
  extras: FlowsExtras | null;
};

function Extras({ extras }: { extras: FlowsExtras }) {
  return (
    <Card title={extras.title}>
      <Breadcrumb items={extras.crumbs.map((label) => ({ label }))} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {extras.tags.map((t) => <Chip key={t} label={t} />)}
      </div>
      <div className="mt-3">
        <AvatarGroup people={extras.people.map((initials) => ({ initials }))} max={extras.avatarMax} />
      </div>
    </Card>
  );
}

/* ── inline trigger editor ──────────────────────────────────────────────────
   A static preview of the Trigger Drawer from FlowsList (which owns its own
   open state and can't be pre-opened via props). Rebuilt here from catalog
   primitives so each trigger kind shows as its own gallery state. */
function TriggerEditorPreview({ trigger }: { trigger: FlowsTrigger }) {
  const { kind } = trigger;
  return (
    <Drawer
      open
      variant="inline"
      closable
      onClose={() => {}}
      title="Trigger"
      subtitle={trigger.flow}
      icon={<Bell size={16} className="text-ink/65" />}
      footer={
        <>
          <Button variant="primary">Save trigger</Button>
          <Button>Cancel</Button>
        </>
      }
    >
      <Field label="On">
        <Select value={trigger.on} onChange={() => {}} className="w-full">
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

/** No automation in the workspace at all, on any surface. Derived from the
    data, so it is true in the real app for the same reason it is true here. */
function isEmpty(d: FlowsData): boolean {
  return !d.flows.length && !d.editor && !d.runPanel && !d.runHistory && !d.trigger && !d.extras;
}

/* The list surface brings its OWN page header (title, summary, and a working
   "New flow"), and so does the pipeline editor. Stacking a second header on
   top of either is the bug this guards. */
function showsHeader(d: FlowsData, error: string | null): boolean {
  if (error || isEmpty(d)) return true;
  if (d.editor) return false;
  return Boolean(d.extras || d.runHistory || d.runPanel);
}

function Body({ data, error, mobile }: { data: FlowsData; error: string | null; mobile: boolean }) {
  if (error) return <ErrorMessage id="server.unavailable" />;
  if (isEmpty(data)) {
    return (
      <EmptyState icon={<Workflow size={22} />} title="No flows yet">
        Start from a template or create one to automate editorial work.
      </EmptyState>
    );
  }

  if (data.editor) return <FlowsPipelineEditor {...data.editor} />;

  if (data.extras || data.runHistory || data.runPanel) {
    return (
      <>
        {data.extras && <Extras extras={data.extras} />}
        {data.runHistory && <FlowsRunHistory runs={data.runHistory.runs} limit={data.runHistory.limit} />}
        {data.runPanel && <FlowsRunPanel runs={data.runPanel.runs} openNumber={data.runPanel.openNumber} />}
      </>
    );
  }

  const list = <FlowsList flows={data.flows} sources={data.sources} />;

  if (data.trigger) {
    /* Standard 320px supporting rail beside the list on desktop (§11; §10: no
       flex-col/lg:flex-row); on mobile the rail stacks under the list. */
    if (mobile) {
      return (
        <div className="flex flex-col gap-5">
          {list}
          <TriggerEditorPreview trigger={data.trigger} />
        </div>
      );
    }
    return (
      <div className={`items-start ${SPLIT[320]}`}>
        <div className="min-w-0">{list}</div>
        <div className="min-w-0"><TriggerEditorPreview trigger={data.trigger} /></div>
      </div>
    );
  }

  return list;
}

function FlowsPage({ data, loading = false, error = null, mobile = false }: PageProps<FlowsData>) {
  const showHeader = showsHeader(data, error);
  return (
    <PageFrame active={navFor("flows")} title="Flows" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="list" />
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          {showHeader && (
            <PageHeader
              eyebrow="Flows"
              title="Flows"
              description="When something happens to your knowledge, Mari does the editorial work, checks it, then delivers it."
            />
          )}
          <div className={`flex flex-col gap-5 [&>*]:min-w-0 ${showHeader ? "mt-6" : ""}`}>
            <Body data={data} error={error} mobile={mobile} />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<FlowsData> = {
  id: "flows",
  title: "Flows",
  route: "/flows",
  component: FlowsPage,
  states: STATES.map((s) => ({ ...s })),
};
