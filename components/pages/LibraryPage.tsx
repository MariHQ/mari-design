import { useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { BookOpen } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { LibraryTagsPanel, type TagDef, type LibraryTagsActions } from "../features/LibraryTagsPanel";
import { LibraryRulesPanel, type CheckerDoc } from "../features/LibraryRulesPanel";
import { LibraryGlossaryPanel, type Term, type LibraryGlossaryActions } from "../features/LibraryGlossaryPanel";
import { LibraryGuidesPanel, type Guide, type VoiceLayer, type LibraryGuidesActions } from "../features/LibraryGuidesPanel";
import { LibraryTemplatesPanel, type Template, type LibraryTemplatesActions } from "../features/LibraryTemplatesPanel";

/* Library (pages/library.md). The project-wide editorial system: one tabbed
   page over the tag vocabulary, deterministic rule registry, style guides,
   glossary, and document templates. A top-level underline Tabs strip drives
   which Library* panel renders below. Each panel carries its own within-tab
   richness — rules by severity + a live document checker, a tag edit row,
   glossary add/edit, a template gallery with an opened template, a guides pack
   selected — so a screenshot of each tab reads the whole surface.

   Pure presenter: every collection the five panels render arrives in `data`,
   and the "nothing here yet" state is derived from all of them being empty. */

export type LibraryTab = "tags" | "rules" | "glossary" | "guides" | "templates";

/** What the Library can DO: the union of what its five panels offer.

    The Rules tab contributes nothing, and that is deliberate: its registry is
    compiled into LibraryRulesPanel as live RegExps, there is no rule row on
    the server to write, and the checker runs entirely in the browser. */
export type LibraryActions =
  LibraryTagsActions & LibraryGlossaryActions & LibraryGuidesActions & LibraryTemplatesActions;

/** Everything the Library renders, one collection per tab. */
export type LibraryData = {
  /** Which tab the page opens on. */
  tab: LibraryTab;
  tags: TagDef[];
  /** Documents in the corpus, for the tag coverage line. */
  totalDocs: number;
  /** Sample documents the rules checker can run over. */
  checkerDocs: CheckerDoc[];
  /** Workspace name, shown on the rules and guides panels. */
  workspace: string;
  terms: Term[];
  guides: Guide[];
  /** Which style pack this project has adopted. */
  defaultPack: string;
  /** The workspace's own voice layer, stacked on the pack. */
  voice: VoiceLayer;
  templates: Template[];
  /** Counts on the tab strip. */
  counts: Record<LibraryTab, number>;
};

const TAB_LABELS: { id: LibraryTab; label: string }[] = [
  { id: "tags", label: "Tags" },
  { id: "rules", label: "Rules" },
  { id: "glossary", label: "Glossary" },
  { id: "guides", label: "Style guides" },
  { id: "templates", label: "Templates" },
];

const STATES = [
  { id: "default", label: "Default · Tags" },
  { id: "rules", label: "Rules · severity + doc check" },
  { id: "glossary", label: "Glossary · add / edit" },
  { id: "guides", label: "Style guides · pack selected" },
  { id: "templates", label: "Templates · gallery + opened" },
  { id: "tags-empty", label: "Tags · empty" },
  { id: "glossary-empty", label: "Glossary · empty" },
  { id: "templates-empty", label: "Templates · empty" },
  { id: "guides-empty", label: "Style guides · empty" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / new workspace" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Render the active tab from the data it was given. A tab with nothing in it
    renders its panel's own empty state, because the collection is empty. */
function Panel({ tab, data, mobile, actions }: { tab: LibraryTab; data: LibraryData; mobile: boolean; actions?: LibraryActions }) {
  switch (tab) {
    case "rules":
      return <LibraryRulesPanel workspace={data.workspace} docs={data.checkerDocs} />;
    case "glossary":
      return <LibraryGlossaryPanel terms={data.terms} actions={actions} />;
    case "guides":
      return (
        <LibraryGuidesPanel
          guides={data.guides}
          workspace={data.workspace}
          defaultPack={data.defaultPack}
          layer={data.voice}
          actions={actions}
        />
      );
    case "templates":
      return <LibraryTemplatesPanel compact={mobile} templates={data.templates} actions={actions} />;
    case "tags":
    default:
      return <LibraryTagsPanel compact={mobile} tags={data.tags} totalDocs={data.totalDocs} actions={actions} />;
  }
}

/** A workspace with no editorial system at all. Derived from the data, so it
    is true in the real app for exactly the same reason it is true here. */
function isEmpty(d: LibraryData): boolean {
  return !d.tags.length && !d.terms.length && !d.guides.length
    && !d.templates.length && !d.checkerDocs.length;
}

function LibraryPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<LibraryData, LibraryActions>) {
  const [tab, setTab] = useState<LibraryTab>(data.tab);

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("library")} title="Library" mobile={mobile}>
        <SkeletonPage variant="list" />
      </PageFrame>
    );
  }

  const tabOptions: TabOption<LibraryTab>[] =
    TAB_LABELS.map((t) => ({ ...t, count: data.counts[t.id] }));

  let body;
  if (error) {
    body = (
      <div className="mt-6">
        <Card>
          <EmptyState title="API offline">{error}</EmptyState>
        </Card>
      </div>
    );
  } else if (isEmpty(data)) {
    body = (
      <div className="mt-6">
        <Card>
          <EmptyState title="Nothing here yet">Connect a source and add your first tags, rules, and terms to build the editorial system.</EmptyState>
        </Card>
      </div>
    );
  } else {
    body = (
      <div className="mt-6 flex flex-col gap-5">
        <Tabs<LibraryTab> ariaLabel="Library sections" variant="underline" options={tabOptions} value={tab} onChange={setTab} />
        <Panel tab={tab} data={data} mobile={mobile} actions={actions} />
      </div>
    );
  }

  /* The Library IS the editorial system; "Setup guide" is the walkthrough that
     populates it, which is onboarding. Offered only where there is somewhere
     to send you. */
  const headerActions = chrome?.onNavigate
    ? <Button variant="default" onClick={() => chrome.onNavigate!("welcome")}>Setup guide</Button>
    : undefined;

  return (
    <PageFrame chrome={chrome} active={navFor("library")} title="Library" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Editorial system"
          title="Library"
          description="Project-wide vocabulary, deterministic rules, voice, and scaffolds for every document."
          icon={<span className="text-moss"><BookOpen size={24} /></span>}
          actions={mobile ? undefined : headerActions}
        />
        {mobile && headerActions && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
        {body}
      </div>
    </PageFrame>
  );
}

export const page: PageModule<LibraryData, LibraryActions> = {
  id: "library",
  title: "Library",
  route: "/library",
  component: LibraryPage,
  states: STATES.map((s) => ({ ...s })),
};
