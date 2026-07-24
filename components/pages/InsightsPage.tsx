import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, DASH3, SPAN } from "./PageFrame";
import { Sparkles } from "lucide-react";
import {
  InsightsWidgets,
  type InsightStat, type ReadRow, type GlossRow, type InsightsActivity, type InsightsWidgetsActions,
} from "../features/InsightsWidgets";
import { InsightsFreshnessChart, type Freshness } from "../features/InsightsFreshnessChart";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
import { PageHeader } from "../layout/PageHeader";
import { ErrorMessage } from "../feedback/ErrorMessage";

/* Insights (pages/insights.md). Read-mostly dashboard proving the knowledge
   cloud is working: the headline stat row + evidence panels (readability,
   glossary health, recent audit) from InsightsWidgets, with the freshness-by-
   source stacked-bar card composed alongside as the dashboard grid.

   This page is a pure presenter. It holds no demo content: every value it
   renders arrives in `data`, and what it shows is derived from that data —
   widgets still resolving are `widgets: null`, a freshness query that could
   not answer is `freshness: null`, and a workspace with nothing measured yet
   falls out of `isEmpty`. The canvas supplies the same shape from
   `.preview/fixtures/insights.ts`. */

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

/** The four widgets that resolve together from the insights query. */
export type InsightsWidgetData = {
  stats: InsightStat[];
  readability: ReadRow[];
  glossary: GlossRow[];
  activity: InsightsActivity[];
  /** ISO date the counts are measured from. */
  since: string;
};

/** A supporting card beside the dashboard. Only the long-text states carry
    one, which is why it is nullable rather than always present. */
export type InsightsExtras = {
  title: string;
  crumbs: string[];
  tags: string[];
  people: string[];
  avatarMax: number;
};

/** What Insights can DO. Every handler may throw; the widget that owns the
    control shows the message beside it. Optional: without actions the controls
    keep the local echo the library ships (the canvas has no server). */
export type InsightsActions = InsightsWidgetsActions;

/** Everything the Insights dashboard renders. */
export type InsightsData = {
  /** `null` while the widget queries are still in flight: the widgets render
      their own skeleton, holding their exact places, while freshness shows. */
  widgets: InsightsWidgetData | null;
  /** `null` when the freshness query is unavailable, so the card is not
      rendered at all. `[]` is a real answer: no sources yet. */
  freshness: Freshness[] | null;
  extras: InsightsExtras | null;
};

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

function Extras({ extras }: { extras: InsightsExtras }) {
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

/* §11 dashboard grid: one grid for the whole body so every tile shares the
   same left/right edges and the same vertical rhythm. Widgets span the columns
   they need, and the shared DASH3/SPAN pair drops the row from three-up to
   two-up to one-up as the window narrows (see PageFrame) so a widget is never
   squeezed to a gutter. */
const GRID = `${DASH3} items-start [&>*]:min-w-0`;
const GRID_M = "flex flex-col gap-5 [&>*]:min-w-0";

/** Nothing measured yet. Derived from the data, so it is true in the real app
    for exactly the same reason it is true on the canvas. */
function isEmpty(d: InsightsData): boolean {
  const w = d.widgets;
  return !d.extras && !d.freshness?.length
    && (!w || (!w.stats.length && !w.readability.length && !w.glossary.length && !w.activity.length));
}

function Body({ data, error, actions, mobile }: {
  data: InsightsData; error: string | null; actions?: InsightsActions; mobile: boolean;
}) {
  const grid = mobile ? GRID_M : GRID;
  const full = mobile ? "" : SPAN[3];

  if (error) {
    return (
      <>
        <BareHeader />
        {/* Error copy is catalogued, not composed per page (§8). */}
        <div className="mt-6"><ErrorMessage id="server.unavailable" /></div>
      </>
    );
  }
  if (isEmpty(data)) {
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

  const w = data.widgets;
  return (
    <div className={grid}>
      {w
        ? <InsightsWidgets className={full} actions={actions} {...w} />
        : <InsightsWidgets className={full} loading stats={[]} readability={[]} glossary={[]} activity={[]} since="" />}
      {data.freshness && (
        <div className={mobile ? "" : data.extras ? SPAN[2] : SPAN[3]}>
          <InsightsFreshnessChart freshness={data.freshness} />
        </div>
      )}
      {data.extras && <div className={mobile ? "" : SPAN[1]}><Extras extras={data.extras} /></div>}
    </div>
  );
}

function InsightsPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<InsightsData, InsightsActions>) {
  return (
    <PageFrame chrome={chrome} active={navFor("insights")} title="Insights" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="dashboard" />
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          <Body data={data} error={error} actions={actions} mobile={mobile} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<InsightsData, InsightsActions> = {
  id: "insights",
  title: "Insights",
  route: "/insights",
  component: InsightsPage,
  states: STATES.map((s) => ({ ...s })),
};
