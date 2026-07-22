import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
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

/* Stress states — drive every overview feature from its data props with
   overflow (long natural text) / stress (pathological) content. */
function StressBody({ extreme }: { extreme: boolean }) {
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
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><OverviewStatTiles stats={stats} /></div>
      <div className="space-y-4">
        <OverviewDigestCard topics={digest} />
        <OverviewTodayReview tasks={tasks} />
        <OverviewLiveActivity items={feed} pollMs={0} />
        <OverviewWorkflowStrip flow={flow} run={{ started: extreme ? UNBREAKABLE : LONG_SOURCE, outcome: extreme ? MIXED_SCRIPT : "Passed after a very long retry loop" }} />
      </div>
      <div className="space-y-4">
        <OverviewRecentDocs docs={docs} />
        <OverviewSourcePulse tiles={tiles} />
      </div>
    </div>
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

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <div className="mt-6"><EmptyState title="API offline">The dashboard is temporarily unavailable. Retrying…</EmptyState></div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-6"><EmptyState title="Nothing here yet">Connect a source to start building your knowledge base.</EmptyState></div>
    );
  }
  if (state === "overflow" || state === "stress") return <StressBody extreme={state === "stress"} />;
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><OverviewStatTiles /></div>
      <div className="space-y-4">
        <OverviewDigestCard />
        <OverviewTodayReview />
        <OverviewLiveActivity />
        <OverviewWorkflowStrip />
      </div>
      <div className="space-y-4">
        <OverviewRecentDocs />
        <OverviewSourcePulse />
      </div>
    </div>
  );
}

function OverviewPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("overview")} title="Overview" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="dashboard" />
      ) : (
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <Greeting />
          <Body state={state} />
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
