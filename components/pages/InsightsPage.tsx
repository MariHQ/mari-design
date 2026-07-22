import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Sparkles, BookOpen, FileCheck } from "lucide-react";
import { InsightsWidgets } from "../features/InsightsWidgets";
import { InsightsFreshnessChart, type Freshness } from "../features/InsightsFreshnessChart";
import type { ActivityItem } from "../data-display/ActivityFeed";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { SkeletonCard, SkeletonStat } from "../data-display/Skeleton";

/* Insights (pages/insights.md). Read-mostly dashboard proving the knowledge
   cloud is working: the headline stat row + evidence panels (readability,
   glossary health, recent audit) from InsightsWidgets, with the freshness-by-
   source stacked-bar card composed alongside as the dashboard grid.

   The `state` prop drives the full spread of visual states: the freshness card
   present / unavailable / empty, the readability grade distribution, glossary
   suggestions vs. "all clear", the audit feed active vs. empty, per-widget
   loading skeletons, plus the whole-page loading / empty / error branches. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading (full page)" },
  { id: "widgets-loading", label: "Per-widget loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / no data" },
  { id: "no-freshness", label: "Freshness unavailable" },
  { id: "freshness-empty", label: "Freshness — no sources" },
  { id: "readability-spread", label: "Readability grade spread" },
  { id: "glossary-review", label: "Glossary suggestions" },
  { id: "glossary-clear", label: "Glossary all clear" },
  { id: "audit-active", label: "Audit activity" },
  { id: "audit-empty", label: "Audit — nothing logged" },
] as const;

/* ── content variants ─────────────────────────────────────────────────────── */

const SPREAD_READABILITY = [
  { id: 1, title: "API authentication", source: "github", grade: "A", note: "Clear, concise, well-structured." },
  { id: 2, title: "Billing & invoices", source: "gdocs", grade: "B", note: "Two long paragraphs could be split." },
  { id: 3, title: "Rate limits", source: "github", grade: "C", note: "Dense; heavy passive voice." },
  { id: 4, title: "Legacy migration notes", source: "notion", grade: "D", note: "Unstructured; no headings." },
  { id: 5, title: "Onboarding checklist", source: "notion", grade: "A", note: "" },
  { id: 6, title: "Incident runbook", source: "slack", grade: "B", note: "Jargon without definitions." },
  { id: 7, title: "Deprecated SDK guide", source: "docs", grade: "C", note: "Long sentences, buried steps." },
];

const REVIEW_GLOSSARY = [
  { id: 1, term: "Flow", variants: ["workflow", "automation"], definition: "An automation that watches knowledge and does editorial work." },
  { id: 2, term: "Drift", variants: ["staleness", "doc rot"], definition: "When a document falls out of sync with accepted facts." },
  { id: 3, term: "Closure", variants: ["impact set"], definition: "Every document reachable from a node along its lineage edges." },
  { id: 4, term: "Lens", variants: ["view mode"], definition: "A recoloring of the graph by source, staleness, owner, or health." },
  { id: -5, term: "Canonical", variants: ["source of truth"], definition: "The version Mari treats as authoritative." },
];

const ACTIVE_ACTIVITY: ActivityItem[] = [
  { id: "a1", actor: "Aki K.", action: "accepted glossary term “Drift”", time: "May 11, 4:12 PM", icon: <BookOpen size={12} /> },
  { id: "a2", actor: "Priya S.", action: "fixed 3 readability findings", time: "May 11, 2:03 PM", icon: <FileCheck size={12} /> },
  { id: "a3", actor: "Mari", action: "scored 42 documents", time: "May 11, 9:20 AM", icon: <Sparkles size={12} /> },
  { id: "a4", actor: "Dana R.", action: "dismissed a coverage finding", time: "May 10, 5:41 PM" },
  { id: "a5", actor: "Mari", action: "harvested 6 candidate terms", time: "May 10, 11:02 AM", icon: <BookOpen size={12} /> },
  { id: "a6", actor: "Aki K.", action: "re-scored the API docs after edits", time: "May 9, 3:30 PM", icon: <FileCheck size={12} /> },
];

const NO_FRESHNESS: Freshness[] = [];

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <div className="mt-6">
        <EmptyState icon={<Sparkles size={22} />} title="API offline">
          Insights are temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-6">
        <EmptyState icon={<Sparkles size={22} />} title="Nothing to measure yet">
          Sync a source and run a few searches to start collecting insights.
        </EmptyState>
      </div>
    );
  }

  // Per-widget loading: freshness resolved, the stat strip + evidence cards
  // still resolving — inline skeletons hold their place in the grid.
  if (state === "widgets-loading") {
    return (
      <div className="mt-2 space-y-5">
        <InsightsFreshnessChart />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <SkeletonCard lines={5} footer />
          <SkeletonCard lines={4} footer />
        </div>
        <SkeletonCard lines={4} />
      </div>
    );
  }

  const showFreshness = state !== "no-freshness";
  const freshness = state === "freshness-empty" ? NO_FRESHNESS : undefined;

  const widgetProps: Parameters<typeof InsightsWidgets>[0] = {};
  if (state === "readability-spread") widgetProps.readability = SPREAD_READABILITY;
  if (state === "glossary-review") widgetProps.glossary = REVIEW_GLOSSARY;
  if (state === "glossary-clear") widgetProps.glossary = [];
  if (state === "audit-active") widgetProps.activity = ACTIVE_ACTIVITY;
  if (state === "audit-empty") widgetProps.activity = [];

  return (
    <div className="mt-2 space-y-5">
      {showFreshness && <InsightsFreshnessChart freshness={freshness} />}
      <InsightsWidgets {...widgetProps} />
    </div>
  );
}

function InsightsPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("insights")} title="Insights" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="dashboard" />
      ) : (
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <Body state={state} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "insights",
  title: "Insights",
  route: "/insights",
  component: InsightsPage,
  states: STATES.map((s) => ({ ...s })),
};
