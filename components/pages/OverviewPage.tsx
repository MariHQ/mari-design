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

/* Overview dashboard (pages/overview.md). Composes the overview features into
   the two-track grid, inside the console frame. Demonstrates the per-card
   loading / error / empty states via the `state` prop. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / new workspace" },
] as const;

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
