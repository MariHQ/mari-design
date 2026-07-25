import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, DASH3, SPAN } from "./PageFrame";
import { Sprout } from "lucide-react";
import { OverviewStatTiles, type OverviewStats } from "../features/OverviewStatTiles";
import { OverviewDigestCard, type DigestTopic } from "../features/OverviewDigestCard";
import { OverviewRecentDocs, type RecentDoc } from "../features/OverviewRecentDocs";
import { OverviewTodayReview, type ReviewTask } from "../features/OverviewTodayReview";
import { OverviewSourcePulse, type PulseTileData } from "../features/OverviewSourcePulse";
import { OverviewLiveActivity, type FeedItem } from "../features/OverviewLiveActivity";
import { OverviewWorkflowStrip, type WfFlow, type WfRun } from "../features/OverviewWorkflowStrip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { CardCollapseScope } from "../layout/Card";
import { Truncate } from "../data-display/Truncate";
import { DateRangePicker, type DateRange } from "../data-display/DateRangePicker";

/* Overview dashboard (pages/overview.md). Composes the overview features into
   the two-track grid, inside the console frame.

   This page is a pure presenter. It holds no demo content: every value it
   renders arrives in `data`, so a real workspace with nothing in it renders
   the empty state rather than someone's invented numbers. The design canvas
   supplies the same shape from `.preview/fixtures/overview.ts`. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / new workspace" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Everything the Overview dashboard renders. One object, so an app can build
    it from a single query and hand it over whole. */
export type OverviewData = {
  /** Shown in the greeting. Empty string drops the name, never a placeholder. */
  personName: string;
  /** IANA zone the greeting reads the clock in (the one Preferences collects).
      Omitted = the browser's own zone, which is still the reader's real local
      time. Never a fixed hour. */
  timeZone?: string;
  /** The window the dashboard counts over, when the app can change it. */
  range?: DateRange;
  stats: OverviewStats;
  tasks: ReviewTask[];
  digest: DigestTopic[];
  activity: FeedItem[];
  docs: RecentDoc[];
  flow: WfFlow | null;
  run: WfRun;
  sources: PulseTileData[];
  /** Poll interval for the live feed, ms. 0 disables it (canvas + tests). */
  activityPollMs?: number;
};

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

/* The greeting used to read "Good morning" at every hour of the day, in every
   zone. It is a claim about the reader's clock, so it is read off the reader's
   clock: the zone Preferences collects when the app supplies one, the
   browser's own otherwise. A zone the runtime does not know falls back to
   local time rather than to a guess. */
function hourIn(timeZone: string | undefined, now: Date): number {
  if (!timeZone) return now.getHours();
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now),
    );
  } catch {
    return now.getHours();
  }
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Greeting({ personName, timeZone }: { personName: string; timeZone?: string }) {
  const hello = greetingFor(hourIn(timeZone, new Date()));
  return (
    /* min-w-0 + Truncate: a display name is user data and can be arbitrarily
       long (§12). Without the floor override the greeting pushed 159px out
       through the page container. */
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-1 shrink-0 text-moss"><Sprout size={28} /></span>
      <div className="min-w-0">
        <Truncate as="h2" className="font-display text-[24px] font-bold tracking-[-0.01em] text-ink">
          {personName ? `${hello}, ${personName}` : hello}
        </Truncate>
        <div className="mt-1 h-[3px] w-24 rounded bg-espelette/60" />
      </div>
    </div>
  );
}

/** Nothing has happened in this workspace yet. Deliberately NOT "every
    collection is empty": that test required `sources` to be empty too, so a
    workspace whose only content was one connected source that had never synced
    fell through to the full dashboard and rendered six widgets of zeros
    instead of saying what to do next. What makes the dashboard worth drawing
    is content, not connections. */
function hasContent(d: OverviewData): boolean {
  return Boolean(d.tasks.length || d.digest.length || d.activity.length || d.docs.length || d.flow);
}

/** What the Overview can DO. */
export type OverviewActions = {
  /** Change the window the dashboard counts over. Without it the page draws no
      range control at all — a picker that cannot re-query is decoration (§2). */
  setRange?: (range: DateRange) => void;
};

function OverviewPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<OverviewData, OverviewActions>) {
  const range = data.range ?? { preset: "30d" as const };
  const rangeControl = actions?.setRange ? (
    <DateRangePicker value={range} onChange={actions.setRange} align="end" compact />
  ) : null;

  return (
    <PageFrame chrome={chrome} active={navFor("overview")} title="Overview" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="dashboard" />
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          <div className={mobile ? "flex flex-col gap-3" : "flex items-start justify-between gap-4"}>
            <Greeting personName={data.personName} timeZone={data.timeZone} />
            {/* The stats and digest carried no period label at all, so a number
                on this page was a count over an unstated window. The label only
                appears where the window is a real, changeable thing. */}
            {rangeControl && (
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-term text-[11.5px] text-ink/65">Counting</span>
                {rangeControl}
              </div>
            )}
          </div>
          <div className="mt-6">
            {/* Mobile collapses every titled widget behind its header, so the
                dashboard scans as a list instead of a forever scroll (§17). */}
            <CardCollapseScope.Provider value={mobile}>
              {error ? (
                <EmptyState title="API offline">{error}</EmptyState>
              ) : !hasContent(data) ? (
                /* Two different nothings, and they need two different next
                   steps. No sources: connect one. Sources but nothing indexed:
                   the pulse tiles below say which source is quiet, so they
                   still render — that is the whole answer to "why is this
                   dashboard blank?". */
                data.sources.length ? (
                  <div className="flex flex-col gap-5">
                    <EmptyState title="Nothing indexed yet">
                      Your sources are connected but have not produced any documents,
                      tasks, or activity yet. Check the sync status below.
                    </EmptyState>
                    <OverviewSourcePulse tiles={data.sources} />
                  </div>
                ) : (
                  <EmptyState title="Nothing here yet">
                    Connect a source to start building your knowledge base.
                  </EmptyState>
                )
              ) : (
                <DashGrid mobile={mobile}>
                  {/* Spans follow each widget's own minimum width. The two table
                      widgets take two columns (their title column alone is
                      min-w-[200px] plus four no-wrap columns); Source pulse packs
                      a 2 x 250px tile grid and the workflow strip a row of 86px
                      nodes, so both take all three. The one-column slots hold the
                      two prose widgets, which reflow. */}
                  <Cell mobile={mobile} span={3}><OverviewStatTiles stats={data.stats} /></Cell>
                  {/* Today's review sits above/left of the weekly digest:
                      timeliest content first (§17). */}
                  <Cell mobile={mobile} span={2}><OverviewTodayReview tasks={data.tasks} /></Cell>
                  <Cell mobile={mobile}><OverviewDigestCard topics={data.digest} /></Cell>
                  <Cell mobile={mobile}><OverviewLiveActivity items={data.activity} pollMs={data.activityPollMs ?? 0} /></Cell>
                  <Cell mobile={mobile} span={2}><OverviewRecentDocs docs={data.docs} /></Cell>
                  {data.flow && (
                    <Cell mobile={mobile} span={3}><OverviewWorkflowStrip flow={data.flow} run={data.run} /></Cell>
                  )}
                  <Cell mobile={mobile} span={3}><OverviewSourcePulse tiles={data.sources} /></Cell>
                </DashGrid>
              )}
            </CardCollapseScope.Provider>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<OverviewData, OverviewActions> = {
  id: "overview",
  title: "Overview",
  route: "/",
  component: OverviewPage,
  states: STATES.map((s) => ({ ...s })),
};
