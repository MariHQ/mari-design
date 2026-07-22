import { useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { BookOpen, FileText } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Avatar } from "../data-display/Avatar";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_URL, UNBREAKABLE, LONG_WORD,
  HUGE_NUMBER, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS, repeat,
} from "./stress";
import { Button } from "../actions/Button";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
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
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* ── Overflow / stress fixtures (see pages/stress.ts) ───────────────────────
   `overflow` = long but natural text; `stress` = pathological content. Fed to
   the Library panels via their data props so the real composed features render
   under stress, catching wrapping / truncation / flex-blowout bugs. */
const OVERFLOW_TAGS = [
  { id: "canonical", name: "Canonical — consolidated across every service, region, and on-call team", tone: "ok" as const, evidence: "Preferred evidence, superseding all prior evidence policies across the org", weight: 1.6, usage: 142, behaviors: ["Ranks first in every search surface and published documentation site", "Trusted for facts extracted during the quarterly reliability review"], standard: true, description: LONG_PARAGRAPH },
  { id: "incident-response", name: "Incident-response and on-call escalation runbook", tone: "attention" as const, evidence: "Flagged for a human reviewer, never used as silent evidence", weight: 0.6, usage: 27, behaviors: ["Routed to the reliability guild for a judgment call", "Re-reviewed every quarter or immediately after any Sev-1 incident"], standard: true, description: LONG_TITLE },
  { id: "runbook", name: LONG_TITLE, tone: "info" as const, evidence: "Operational runbooks and on-call documentation for every service tier", weight: 1.1, usage: 34, behaviors: ["Operational workflows", "On-call escalation ladder"], standard: false, description: LONG_PARAGRAPH },
];
const STRESS_TAGS = [
  { id: "s1", name: UNBREAKABLE, tone: "blocked" as const, evidence: UNBREAKABLE, weight: HUGE_NUMBER, usage: HUGE_NUMBER, behaviors: MANY_TAGS, standard: false, description: LONG_URL },
  { id: "s2", name: LONG_WORD, tone: "info" as const, evidence: LONG_URL, weight: 1, usage: 12847392, behaviors: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT], standard: false, description: MIXED_SCRIPT },
];

const OVERFLOW_TERMS = [
  { id: "t1", term: "Escalation ladder and paging policy — the consolidated runbook definition", definition: LONG_PARAGRAPH, owner: LONG_NAME, updated: "2026-07-14" },
  { id: "t2", term: LONG_TITLE, definition: LONG_PARAGRAPH, owner: LONG_NAME, updated: "2026-07-09" },
];
const STRESS_TERMS = [
  { id: "s1", term: UNBREAKABLE, definition: LONG_URL, owner: LONG_WORD, updated: "2026-07-14" },
  { id: "s2", term: LONG_WORD, definition: `${MIXED_SCRIPT} ${UNBREAKABLE}`, owner: MIXED_SCRIPT, updated: "2026-07-01" },
];

const OVERFLOW_TEMPLATES = [
  { id: "o1", name: LONG_TITLE, category: "Operations", description: LONG_PARAGRAPH, sections: repeat((i) => `${i + 1}. Escalation ladder, paging policy, severity rubric, and communication templates for responders`, 10), standard: true, icon: FileText },
  { id: "o2", name: "Consolidated platform reliability and incident-response scaffold", category: "Governance", description: LONG_TITLE, sections: repeat((i) => `Reviewed section ${i + 1} — reconciled against the last four quarters of incident retrospectives`, 8), standard: false, icon: FileText },
];
const STRESS_TEMPLATES = [
  { id: "s1", name: UNBREAKABLE, category: "Governance", description: LONG_URL, sections: [UNBREAKABLE, LONG_URL, LONG_WORD, MIXED_SCRIPT], standard: false, icon: FileText },
  { id: "s2", name: LONG_WORD, category: "Engineering", description: MIXED_SCRIPT, sections: MANY_TAGS, standard: false, icon: FileText },
];

function StressBody({ variant }: { variant: "overflow" | "stress" }) {
  const stress = variant === "stress";
  return (
    <div className="mt-5 flex flex-col gap-6">
      {stress && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {MANY_INITIALS.map((ini, n) => (
              <span key={n} className="rounded-full ring-2 ring-paper"><Avatar initials={ini} /></span>
            ))}
          </div>
          <span className="min-w-0 break-words font-term text-[11px] text-ink/45">{MIXED_SCRIPT}</span>
        </div>
      )}
      <LibraryTagsPanel tags={stress ? STRESS_TAGS : OVERFLOW_TAGS} />
      <LibraryGlossaryPanel terms={stress ? STRESS_TERMS : OVERFLOW_TERMS} />
      <LibraryTemplatesPanel templates={stress ? STRESS_TEMPLATES : OVERFLOW_TEMPLATES} />
    </div>
  );
}

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

  if (state === "loading") {
    return (
      <PageFrame active={navFor("library")} title="Library" mobile={mobile}>
        <SkeletonPage variant="list" />
      </PageFrame>
    );
  }

  let body;
  if (state === "error") {
    body = <div className="mt-6"><EmptyState title="API offline">The library is temporarily unavailable. Retrying…</EmptyState></div>;
  } else if (state === "empty") {
    body = <div className="mt-6"><EmptyState title="Nothing here yet">Connect a source and add your first tags, rules, and terms to build the editorial system.</EmptyState></div>;
  } else if (state === "overflow" || state === "stress") {
    body = <StressBody variant={state} />;
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
