import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Sparkles, BookOpen, FileCheck } from "lucide-react";
import { InsightsWidgets } from "../features/InsightsWidgets";
import { InsightsFreshnessChart, type Freshness } from "../features/InsightsFreshnessChart";
import type { ActivityItem } from "../data-display/ActivityFeed";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { SkeletonCard, SkeletonStat } from "../data-display/Skeleton";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
import { PageHeader } from "../layout/PageHeader";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { fmtDateTime } from "../tokens/format";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, UNBREAKABLE, LONG_WORD, MIXED_SCRIPT,
  HUGE_NUMBER, HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS, LONG_BREADCRUMB, repeat,
} from "./stress";

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
  { id: "freshness-empty", label: "Freshness: no sources" },
  { id: "readability-spread", label: "Readability grade spread" },
  { id: "glossary-review", label: "Glossary suggestions" },
  { id: "glossary-clear", label: "Glossary all clear" },
  { id: "audit-active", label: "Audit activity" },
  { id: "audit-empty", label: "Audit: nothing logged" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* Overflow / stress content injected into the Insights widgets via data props:
   long stat labels + huge numbers, long readability titles/notes, glossary
   terms/definitions with many variants, and long audit-activity lines.
   `overflow` = natural long text; `stress` = pathological tokens. */
function stressStats(p: boolean) {
  const TONE = ["ok", "info", "blocked", "attention"] as const;
  const LABELS = p ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, HUGE_NUMBER_STR] : [LONG_TITLE];
  return repeat((i) => ({
    key: `s${i}`,
    value: HUGE_NUMBER + i,
    label: LABELS[i % LABELS.length],
    tone: TONE[i % TONE.length],
    icon: <Sparkles size={16} />,
  }), 4);
}

function stressReadability(p: boolean) {
  const TITLES = p ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT] : [LONG_TITLE];
  const GRADES = ["A", "B", "C", "D"];
  return repeat((i) => ({
    id: i + 1,
    title: TITLES[i % TITLES.length],
    source: "github",
    grade: GRADES[i % GRADES.length],
    note: p ? LONG_WORD : LONG_PARAGRAPH,
  }), 4);
}

function stressGlossary(p: boolean) {
  return repeat((i) => ({
    id: i + 1,
    term: p ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3] : LONG_TITLE,
    variants: p ? MANY_TAGS : MANY_TAGS.slice(0, 8),
    definition: p ? `${MIXED_SCRIPT} ${LONG_WORD}` : LONG_PARAGRAPH,
  }), 3);
}

function stressActivity(p: boolean): ActivityItem[] {
  return repeat((i) => ({
    id: `a${i}`,
    actor: p ? UNBREAKABLE : LONG_NAME,
    action: p ? `${MIXED_SCRIPT} ${HUGE_NUMBER_STR}` : LONG_PARAGRAPH,
    time: fmtDateTime("2026-05-11T16:12:00"),
    icon: <Sparkles size={12} />,
  }), 5);
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
  { id: "a1", actor: "Aki K.", action: "accepted glossary term “Drift”", time: fmtDateTime("2026-05-11T16:12:00"), icon: <BookOpen size={12} /> },
  { id: "a2", actor: "Priya S.", action: "fixed 3 readability findings", time: fmtDateTime("2026-05-11T14:03:00"), icon: <FileCheck size={12} /> },
  { id: "a3", actor: "Mari", action: "scored 42 documents", time: fmtDateTime("2026-05-11T09:20:00"), icon: <Sparkles size={12} /> },
  { id: "a4", actor: "Dana R.", action: "dismissed a coverage finding", time: fmtDateTime("2026-05-10T17:41:00") },
  { id: "a5", actor: "Mari", action: "harvested 6 candidate terms", time: fmtDateTime("2026-05-10T11:02:00"), icon: <BookOpen size={12} /> },
  { id: "a6", actor: "Aki K.", action: "re-scored the API docs after edits", time: fmtDateTime("2026-05-09T15:30:00"), icon: <FileCheck size={12} /> },
];

const NO_FRESHNESS: Freshness[] = [];

/* <InsightsWidgets/> carries the page header (eyebrow, title, "counting
   since…"), so it must be the FIRST thing on the page and the freshness chart
   goes under it. The bare states below have no widgets, so the page supplies
   the same header itself and keeps every Insights state on one rhythm. */
function BareHeader() {
  return (
    <PageHeader
      eyebrow="Insights"
      title="Insights"
      description="Usage, quality, and coverage across your knowledge base."
    />
  );
}

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <>
        <BareHeader />
        <div className="mt-6"><ErrorMessage id="server.unavailable" /></div>
      </>
    );
  }
  if (state === "empty") {
    return (
      <>
        <BareHeader />
        <div className="mt-6">
          <EmptyState icon={<Sparkles size={22} />} title="Nothing to measure yet">
            Sync a source and run a few searches to start collecting insights.
          </EmptyState>
        </div>
      </>
    );
  }

  if (state === "overflow" || state === "stress") {
    const p = state === "stress";
    return (
      <div className="space-y-5">
        <InsightsWidgets
          stats={stressStats(p)}
          readability={stressReadability(p)}
          glossary={stressGlossary(p)}
          activity={stressActivity(p)}
        />
        <InsightsFreshnessChart />
        <StressExtras pathological={p} />
      </div>
    );
  }

  // Per-widget loading: freshness resolved, the stat strip + evidence cards
  // still resolving — inline skeletons hold their place in the grid.
  if (state === "widgets-loading") {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <SkeletonCard lines={5} footer />
          <SkeletonCard lines={4} footer />
        </div>
        <SkeletonCard lines={4} />
        <InsightsFreshnessChart />
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
    <div className="space-y-5">
      <InsightsWidgets {...widgetProps} />
      {showFreshness && <InsightsFreshnessChart freshness={freshness} />}
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
