import { useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { BookOpen } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { LibraryTagsPanel } from "../features/LibraryTagsPanel";
import { LibraryRulesPanel } from "../features/LibraryRulesPanel";
import { LibraryGlossaryPanel } from "../features/LibraryGlossaryPanel";
import { LibraryGuidesPanel } from "../features/LibraryGuidesPanel";
import { LibraryTemplatesPanel } from "../features/LibraryTemplatesPanel";

/* Library (pages/library.md). The project-wide editorial system: one tabbed
   page over the tag vocabulary, deterministic rule registry, style guides,
   glossary, and document templates. A top-level underline Tabs strip drives
   which Library* panel renders below. Every tab is a state, plus per-tab empty
   variants (new workspace with that section unpopulated) and the shared
   loading / error / empty variants. Each panel carries its own within-tab
   richness — rules by severity + a live document checker, a tag edit row,
   glossary add/edit, a template gallery with an opened template, a guides pack
   selected — so a screenshot of each tab reads the whole surface. */

type Tab = "tags" | "rules" | "glossary" | "guides" | "templates";

const TAB_OPTIONS: TabOption<Tab>[] = [
  { id: "tags", label: "Tags", count: 12 },
  { id: "rules", label: "Rules", count: 170 },
  { id: "glossary", label: "Glossary", count: 34 },
  { id: "guides", label: "Style guides", count: 5 },
  { id: "templates", label: "Templates", count: 9 },
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
] as const;

/** Which tab a given state opens on. */
function tabForState(state: string): Tab {
  if (state.startsWith("rules")) return "rules";
  if (state.startsWith("glossary")) return "glossary";
  if (state.startsWith("guides")) return "guides";
  if (state.startsWith("templates")) return "templates";
  return "tags";
}

/** Render the active tab; `state` may request the empty (unpopulated) variant. */
function Panel({ tab, state }: { tab: Tab; state: string }) {
  const emptyTab = state.endsWith("-empty");
  switch (tab) {
    case "rules": return <LibraryRulesPanel />;
    case "glossary": return emptyTab ? <LibraryGlossaryPanel terms={[]} /> : <LibraryGlossaryPanel />;
    case "guides": return emptyTab ? <LibraryGuidesPanel guides={[]} /> : <LibraryGuidesPanel />;
    case "templates": return emptyTab ? <LibraryTemplatesPanel templates={[]} /> : <LibraryTemplatesPanel />;
    case "tags":
    default: return emptyTab ? <LibraryTagsPanel tags={[]} /> : <LibraryTagsPanel />;
  }
}

function LibraryPage({ state = "default", mobile = false }: PageProps) {
  const [tab, setTab] = useState<Tab>(tabForState(state));

  let body;
  if (state === "loading") {
    body = <div className="grid place-items-center py-24"><Spinner size="md" label="Loading library" /></div>;
  } else if (state === "error") {
    body = <div className="mt-6"><EmptyState title="API offline">The library is temporarily unavailable. Retrying…</EmptyState></div>;
  } else if (state === "empty") {
    body = <div className="mt-6"><EmptyState title="Nothing here yet">Connect a source and add your first tags, rules, and terms to build the editorial system.</EmptyState></div>;
  } else {
    body = (
      <>
        <div className="mt-5">
          <Tabs<Tab> ariaLabel="Library sections" variant="underline" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        </div>
        <div className="mt-5"><Panel tab={tab} state={state} /></div>
      </>
    );
  }

  return (
    <PageFrame active={navFor("library")} title="Library" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Editorial system"
          title="Library"
          description="Project-wide vocabulary, deterministic rules, voice, and scaffolds for every document."
          icon={<span className="text-moss"><BookOpen size={24} /></span>}
          actions={<Button variant="default">Setup guide</Button>}
        />
        {body}
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "library",
  title: "Library",
  route: "/library",
  component: LibraryPage,
  states: STATES.map((s) => ({ ...s })),
};
