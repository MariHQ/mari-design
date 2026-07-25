import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { FlowsList, type Flow, type FlowsListActions, type SourceRef } from "../features/FlowsList";
import { FlowsPipelineEditor, type EditorStep, type SiteRef } from "../features/FlowsPipelineEditor";
import { FlowsRunHistory } from "../features/FlowsRunHistory";
import { FlowsRunPanel, type FlowsRunActions } from "../features/FlowsRunPanel";
import type { WorkflowRun } from "../workflow/RunHistory";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
import { PageHeader } from "../layout/PageHeader";
import { SkeletonPage } from "../data-display/Skeletons";
import { ErrorMessage } from "../feedback/ErrorMessage";

/* Flows (pages/flows.md). The automation surface — a single route that swaps
   between three surfaces: the list view (template gallery + flow list + run
   history), the full-screen pipeline editor, and the slide-in run / trigger
   panels layered over whichever surface is showing.

   This page is a pure presenter. It holds no demo content: which surface it
   shows is derived from the data it was handed — an `editor` payload means the
   pipeline editor, a `runPanel` means the run inspector, `creating` means the
   new-flow drawer, and a workspace with no flows renders the list's own empty
   state, under the list's own "New flow". The canvas supplies the same shape
   from `.preview/fixtures/flows.ts`. */

const STATES = [
  { id: "default", label: "Default (list)" },
  { id: "new-flow", label: "New flow · name and trigger" },
  { id: "new-flow-first", label: "New flow · first one in the workspace" },
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

/** What the Flows page can DO. Every handler may throw and the control that
    called it shows the message. All optional: without actions every control
    keeps the local behaviour the library ships (the canvas has no server). */
export type FlowsActions = FlowsListActions & FlowsRunActions & {
  /** Open one flow's pipeline editor. */
  openFlow?: (id: number) => void;
  /** Leave the pipeline editor for the list. Which surface is on screen lives
      in `data`, so the page cannot go back on its own. */
  openFlows?: () => void;
  /** Persist the flow the pipeline editor is open on, pipeline and all. The
      editor only clears its dirty flag once this resolves. */
  saveFlow?: (flow: {
    id: number; name: string; description: string; enabled: boolean; steps: EditorStep[];
  }) => void | Promise<void>;
};

export type TriggerKind = "manual" | "schedule" | "document";

/** The pipeline editor, open on one flow. Carries that flow's id: saving and
    running from inside the editor act on it, and a page cannot infer which
    row it is looking at from a name. */
export type FlowsEditor = {
  id: number;
  name: string;
  description: string;
  /** Whether the flow is currently on. */
  enabled: boolean;
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
  /** The new-flow drawer is open. It is the first step of creating a flow, so
      an app can route straight to it. */
  creating: boolean;
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

/* The list surface brings its OWN page header (title, summary, and a working
   "New flow"), and so does the pipeline editor. Stacking a second header on
   top of either is the bug this guards. */
function showsHeader(d: FlowsData, error: string | null): boolean {
  if (error) return true;
  if (d.editor) return false;
  return Boolean(d.extras || d.runHistory || d.runPanel);
}

function Body({ data, error, actions, mobile }: {
  data: FlowsData; error: string | null; actions?: FlowsActions; mobile: boolean;
}) {
  if (error) return <ErrorMessage id="server.unavailable" />;

  /* A workspace with no flows used to get a page-level empty state and nothing
     else — the one screen where creating a flow matters most had no way to do
     it. The list draws its own "no flows yet", under its own "New flow". */

  if (data.editor) {
    const { id, ...editor } = data.editor;
    return (
      <FlowsPipelineEditor
        {...editor}
        onBack={actions?.openFlows}
        onSave={actions?.saveFlow && ((flow) => actions.saveFlow!({ id, ...flow }))}
        /* Running from the editor is the same run the list starts, so it is
           the same handler — a second one would be a second way to be wrong
           about what a test run is. */
        onRun={actions?.runFlow && (({ dry }) => actions.runFlow!({ id, dryRun: dry }))}
      />
    );
  }

  if (data.extras || data.runHistory || data.runPanel) {
    return (
      <>
        {data.extras && <Extras extras={data.extras} />}
        {data.runHistory && <FlowsRunHistory runs={data.runHistory.runs} limit={data.runHistory.limit} actions={actions} />}
        {data.runPanel && <FlowsRunPanel runs={data.runPanel.runs} openNumber={data.runPanel.openNumber} actions={actions} />}
      </>
    );
  }

  /* The trigger editor is FlowsList's own drawer, opened through its props.
     This page used to draw a second, inline copy of that drawer because the
     real one "owns its own open state and can't be pre-opened" — so the copy's
     Save and Cancel did nothing. Making the real one pre-openable is the
     smaller change, and it is the drawer people actually use. */
  const editTriggerFor = data.trigger
    ? data.flows.find((f) => f.name === data.trigger!.flow)?.id ?? null
    : null;

  return (
    <FlowsList
      flows={data.flows}
      sources={data.sources}
      actions={actions}
      editTriggerFor={editTriggerFor}
      createOpen={data.creating}
      onOpenFlow={actions?.openFlow}
    />
  );
}

function FlowsPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<FlowsData, FlowsActions>) {
  const showHeader = showsHeader(data, error);
  return (
    <PageFrame chrome={chrome} active={navFor("flows")} title="Flows" mobile={mobile}>
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
            <Body data={data} error={error} actions={actions} mobile={mobile} />
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<FlowsData, FlowsActions> = {
  id: "flows",
  title: "Flows",
  route: "/flows",
  component: FlowsPage,
  states: STATES.map((s) => ({ ...s })),
};
