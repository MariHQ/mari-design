import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, DASH3, SPAN } from "./PageFrame";
import { Sprout } from "lucide-react";
import { OverviewStatTiles } from "../features/OverviewStatTiles";
import { OverviewDigestCard } from "../features/OverviewDigestCard";
import { OverviewRecentDocs } from "../features/OverviewRecentDocs";
import { OverviewTodayReview } from "../features/OverviewTodayReview";
import { OverviewSourcePulse } from "../features/OverviewSourcePulse";
import { OverviewLiveActivity } from "../features/OverviewLiveActivity";
import { OverviewWorkflowStrip } from "../features/OverviewWorkflowStrip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { CardCollapseScope } from "../layout/Card";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_DOC_TITLE, LONG_SOURCE, UNBREAKABLE,
  LONG_WORD, HUGE_NUMBER, HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS, repeat,
} from "./stress";

/* Overview dashboard (pages/overview.md). Composes the overview features into
   the two-track grid, inside the console frame. Demonstrates the per-card
   loading / error / empty states via the `state` prop. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / new workspace" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* §11 dashboard grid. Every widget is a direct child of one shared DASH3, so
   tile edges line up horizontally and vertically and the body fills the whole
   1400px container. The grid drops to two-up below 1280 and one-up below 1024
   (see PageFrame), because a three-up row of console widgets does not fit
   beside the 218px sidebar on a small laptop. Mobile falls out of the same
   classes, never out of component breakpoints (§10). */
function DashGrid({ mobile, children }: { mobile: boolean; children: React.ReactNode }) {
  return <div className={mobile ? "grid grid-cols-1 gap-5" : DASH3}>{children}</div>;
}

/** A dashboard cell. `span` is ignored on mobile (single column). */
function Cell({ mobile, span = 1, children }: { mobile: boolean; span?: 1 | 2 | 3; children: React.ReactNode }) {
  return <div className={mobile ? "min-w-0" : SPAN[span]}>{children}</div>;
}

/* Stress states — drive every overview feature from its data props with
   overflow (long natural text) / stress (pathological) content. */
function StressBody({ extreme, mobile }: { extreme: boolean; mobile: boolean }) {
  const digest = extreme
    ? repeat((i) => ({
        title: `${UNBREAKABLE} ${MIXED_SCRIPT}`,
        summary: `${LONG_WORD} ${UNBREAKABLE} ${MIXED_SCRIPT}`,
        where: [{ source: "github", label: UNBREAKABLE }, { source: "notion", label: LONG_WORD }],
        impact: MANY_TAGS.map((t) => ({ name: t })),
      }), 2)
    : repeat((i) => ({
        title: LONG_TITLE,
        summary: LONG_PARAGRAPH,
        where: [{ source: "github", label: LONG_SOURCE }, { source: "gdocs", label: LONG_DOC_TITLE }],
        impact: MANY_TAGS.slice(0, 8).map((t) => ({ name: t })),
      }), 2);

  const docs = (extreme
    ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT]
    : [LONG_DOC_TITLE, LONG_TITLE, `${LONG_NAME}, ${LONG_SOURCE}`]
  ).map((title, i) => ({ id: 100 + i, source: ["github", "notion", "granola"][i], title, date: "2026-07-20" }));

  const tasks = (extreme
    ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, `${HUGE_NUMBER_STR} ${UNBREAKABLE}`]
    : repeat(() => LONG_PARAGRAPH, 4)
  ).map((text, i) => ({ id: i + 1, text, who: MANY_INITIALS[i % MANY_INITIALS.length], pill: "needs-review", pillText: extreme ? UNBREAKABLE : "Needs review: long editorial label that will not fit" }));

  const feed = (extreme
    ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT]
    : [LONG_NAME, LONG_SOURCE, LONG_DOC_TITLE]
  ).map((s, i) => ({ id: i + 1, kind: ["run", "edit", "deploy"][i], actor: s, text: extreme ? UNBREAKABLE : "completed a very long-running run over", target: extreme ? LONG_WORD : LONG_SOURCE, secondsAgo: (i + 1) * 120 }));

  const tiles = (extreme
    ? [{ key: "github", name: UNBREAKABLE, stat: HUGE_NUMBER_STR, unit: LONG_WORD }, { key: "notion", name: MIXED_SCRIPT, stat: HUGE_NUMBER_STR, unit: UNBREAKABLE }]
    : [{ key: "github", name: LONG_SOURCE, stat: HUGE_NUMBER_STR, unit: "documents indexed this week" }, { key: "notion", name: LONG_DOC_TITLE, stat: HUGE_NUMBER_STR, unit: "revisions" }]
  ).map((t) => ({ ...t, status: "active" as const, bars: [3, 8, 2, 9, 4, 7, 5] }));

  const flow = {
    name: extreme ? UNBREAKABLE : LONG_TITLE,
    status: "active" as const,
    nodes: repeat((i) => ({ kind: ["trigger", "refine", "condition", "notify"][i % 4] as "trigger" | "refine" | "condition" | "notify", label: extreme ? LONG_WORD : LONG_SOURCE }), 8),
  };

  const stats = { changes: HUGE_NUMBER, factsReview: HUGE_NUMBER, flowsRunning: HUGE_NUMBER };

  return (
    <DashGrid mobile={mobile}>
      <Cell mobile={mobile} span={3}><OverviewStatTiles stats={stats} /></Cell>
      {/* Today's review leads the row: timeliest content first (§17). */}
      <Cell mobile={mobile} span={2}><OverviewTodayReview tasks={tasks} /></Cell>
      <Cell mobile={mobile}><OverviewDigestCard topics={digest} /></Cell>
      <Cell mobile={mobile}><OverviewLiveActivity items={feed} pollMs={0} /></Cell>
      <Cell mobile={mobile} span={2}><OverviewRecentDocs docs={docs} /></Cell>
      <Cell mobile={mobile} span={3}><OverviewWorkflowStrip flow={flow} run={{ started: extreme ? UNBREAKABLE : LONG_SOURCE, outcome: extreme ? MIXED_SCRIPT : "Passed after a very long retry loop" }} /></Cell>
      <Cell mobile={mobile} span={3}><OverviewSourcePulse tiles={tiles} /></Cell>
    </DashGrid>
  );
}

function Greeting() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 text-moss"><Sprout size={28} /></span>
      <div>
        <h2 className="font-display text-[24px] font-bold tracking-[-0.01em] text-ink">Good morning, Dana</h2>
        <div className="mt-1 h-[3px] w-24 rounded bg-espelette/60" />
      </div>
    </div>
  );
}

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  if (state === "error") {
    return <EmptyState title="API offline">The dashboard is temporarily unavailable. Retrying…</EmptyState>;
  }
  if (state === "empty") {
    return <EmptyState title="Nothing here yet">Connect a source to start building your knowledge base.</EmptyState>;
  }
  if (state === "overflow" || state === "stress") return <StressBody extreme={state === "stress"} mobile={mobile} />;
  return (
    <DashGrid mobile={mobile}>
      {/* Spans follow each widget's own minimum width. The two table widgets
          take two columns (their title column alone is min-w-[200px] plus four
          no-wrap columns); Source pulse packs a 2 x 250px tile grid and the
          workflow strip a row of 86px nodes, so both take all three. The
          one-column slots hold the two prose widgets, which reflow. */}
      <Cell mobile={mobile} span={3}><OverviewStatTiles /></Cell>
      {/* Today's review sits above/left of the weekly digest: timeliest
          content first (§17). */}
      <Cell mobile={mobile} span={2}><OverviewTodayReview /></Cell>
      <Cell mobile={mobile}><OverviewDigestCard /></Cell>
      <Cell mobile={mobile}><OverviewLiveActivity /></Cell>
      <Cell mobile={mobile} span={2}><OverviewRecentDocs /></Cell>
      <Cell mobile={mobile} span={3}><OverviewWorkflowStrip /></Cell>
      <Cell mobile={mobile} span={3}><OverviewSourcePulse /></Cell>
    </DashGrid>
  );
}

function OverviewPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("overview")} title="Overview" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="dashboard" />
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          <Greeting />
          <div className="mt-6">
            {/* Mobile collapses every titled widget behind its header, so the
                dashboard scans as a list instead of a forever scroll (§17). */}
            <CardCollapseScope.Provider value={mobile}>
              <Body state={state} mobile={mobile} />
            </CardCollapseScope.Provider>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "overview",
  title: "Overview",
  route: "/",
  component: OverviewPage,
  states: STATES.map((s) => ({ ...s })),
};
