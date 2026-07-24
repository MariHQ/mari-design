import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Network } from "lucide-react";
import { LineageToolbar } from "../features/LineageToolbar";
import { Scrollable } from "../data-display/Scrollable";
import { LineageGraph } from "../features/LineageGraph";
import { LineageTimeScrubber } from "../features/LineageTimeScrubber";
import { LineageNodeDrawer } from "../features/LineageNodeDrawer";
import { LineageEdgeDrawer } from "../features/LineageEdgeDrawer";
import { LineageGroupDrawer } from "../features/LineageGroupDrawer";
import { LineageAssertDrawer } from "../features/LineageAssertDrawer";
import {
  NodeGlyph, SOURCE_LABELS,
  type DocHistoryRow, type ImpactResult, type LEdge, type LNode, type LayoutMode, type Lens,
} from "../features/LineageDataModel";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { card } from "../tokens/card";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";

/* Product lineage (pages/lineage.md). The full-height graph "instrument":
   toolbar on top, the lineage canvas in the middle, the as-of time scrubber at
   the bottom, and the mutually-exclusive right drawers.

   This page is a pure presenter. It holds no demo content: the graph, the
   scrubber's event dates, the open drawer and its payload all arrive in
   `data`, so the view the user sees is a function of the data, not of a magic
   state string. `LNode`/`LEdge` are plain JSON end to end (no React elements
   in the data) because mari-cloud serves them from a real GraphQL query. The
   canvas supplies the same shape from `.preview/fixtures/lineage.ts`. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "lens-owner", label: "Lens · Ownership" },
  { id: "lens-stale", label: "Lens · Staleness" },
  { id: "lens-health", label: "Lens · Health (warnings)" },
  { id: "layout-timeline", label: "Layout · Timeline" },
  { id: "as-of", label: "Time travel · as-of past" },
  { id: "trace-impact", label: "Impact trace (downstream)" },
  { id: "trace-provenance", label: "Provenance trace (upstream)" },
  { id: "search", label: "Search active" },
  { id: "inspect", label: "Node drawer open" },
  { id: "edge", label: "Edge drawer open" },
  { id: "group", label: "Roll-up drawer open" },
  { id: "assert", label: "Impact-analysis drawer" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty / no graph" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which drawer is open, and everything that drawer needs. Exactly one at a
    time, which is why this is a tagged union rather than four nullable slots. */
export type LineageDrawer =
  | { kind: "node"; nodeId: string; history: DocHistoryRow[] }
  | { kind: "edge"; edgeId: string }
  | { kind: "group"; groupId: string; totalMembers: number; members: LNode[] }
  | {
      kind: "assert";
      result: ImpactResult;
      analyzed: boolean;
      claim: string;
      owners: { name: string; role: string }[];
      people: string[];
    };

/** A supporting card in the rail, carrying long text. Only the long-text
    states have one, which is why it is nullable. */
export type LineageExtras = {
  title: string;
  hint: string;
  body: string;
  tags: string[];
  people: string[];
  avatarMax: number;
};

/** Everything the lineage instrument renders. */
export type LineageData = {
  nodes: LNode[];
  edges: LEdge[];
  /** Sorted ISO event dates the scrubber snaps to. */
  dates: string[];
  /** Events per date, for the scrubber's density track. */
  activity: { date: string; count: number }[];
  lens: Lens;
  layout: LayoutMode;
  focalId: string | null;
  trace: { originId: string; direction: "down" | "up" } | null;
  /** Scrubber position (index into `dates`); null = live / all time. */
  asOf: number | null;
  /** The toolbar typeahead, open on a query. null = closed. */
  search: { query: string } | null;
  drawer: LineageDrawer | null;
  /** Trail above the instrument. null = none. */
  crumbs: string[] | null;
  extras: LineageExtras | null;
  /** The header's secondary action, e.g. the document being traced. */
  action: string;
};

/** A self-contained search-results dropdown, shown as if the toolbar typeahead
    is active. Composes the shared node glyph + source labels. */
function SearchResults({ nodes, query }: { nodes: LNode[]; query: string }) {
  const q = query.toLowerCase();
  const hits = nodes.filter(
    (n) => !n.macro &&
      (n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.includes("customer")) ||
        n.docKind === "decision"),
  ).slice(0, 6);
  return (
    <div className={`${card} absolute left-2 top-[52px] z-30 w-[320px] p-1 shadow-lg`}>
      <div className="px-2.5 py-1.5 font-term text-[11px] text-ink/65">{hits.length} results for “{query}”</div>
      {hits.map((n) => (
        <div key={n.id} className="flex items-center gap-2.5 rounded-[3px] px-2 py-1.5 hover:bg-flysch">
          <span className="shrink-0 text-ink/70"><NodeGlyph node={n} size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{n.title}</span>
            <span className="block truncate font-term text-[11px] text-ink/65">
              {[n.owner, SOURCE_LABELS[n.source] ?? n.source, n.date].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="shrink-0 font-term text-[11px] text-ink/65">{n.inbound ?? 0}↩</span>
        </div>
      ))}
    </div>
  );
}

/* Which §11 rail width the open drawer takes: standard lineage drawer 420px,
   impact analysis 460px. `null` = no drawer, canvas runs the full container. */
function railFor(data: LineageData): number | null {
  if (data.extras) return 420;
  if (!data.drawer) return null;
  return data.drawer.kind === "assert" ? 460 : 420;
}

function Drawer({ data }: { data: LineageData }) {
  // Fixed desktop widths (CONVENTIONS §10). Mobile-first `w-full … lg:w-[N]`
  // made these drawers render mobile-style in the desktop canvas.
  const d = data.drawer;
  if (!d) return null;
  if (d.kind === "node") {
    return <LineageNodeDrawer nodes={data.nodes} edges={data.edges} nodeId={d.nodeId} history={d.history} />;
  }
  if (d.kind === "edge") {
    return <LineageEdgeDrawer nodes={data.nodes} edges={data.edges} edgeId={d.edgeId} />;
  }
  if (d.kind === "group") {
    return (
      <LineageGroupDrawer
        groupId={d.groupId}
        totalMembers={d.totalMembers}
        members={d.members}
        nodes={data.nodes}
        edges={data.edges}
      />
    );
  }
  return (
    <LineageAssertDrawer
      result={d.result}
      analyzed={d.analyzed}
      claim={d.claim}
      owners={d.owners}
      people={d.people}
    />
  );
}

function Extras({ extras }: { extras: LineageExtras }) {
  return (
    <Card title={extras.title} hint={extras.hint}>
      <p className="text-[12.5px] leading-snug text-ink/70 break-words">{extras.body}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {extras.tags.map((t) => <Chip key={t} label={t} />)}
      </div>
      <div className="mt-3">
        <AvatarGroup people={extras.people.map((initials) => ({ initials }))} max={extras.avatarMax} />
      </div>
    </Card>
  );
}

/* §11 two-column split. The rail keeps its declared width and always sits
   fully inside the container; the main column carries `minmax(0,1fr)` so the
   instrument can never push the drawer off-screen. LineageGraph has a hard
   720px minimum, so on a narrow console the *canvas alone* scrolls sideways
   inside its own column, leaving both outer edges of the page plumb. */
function Rig({ rail, canvas, drawer }: {
  rail: number | null; canvas: React.ReactNode; drawer?: React.ReactNode;
}) {
  // Every branch scrolls, including the full-width one. It used to skip the
  // scroller on the assumption that a rail-less canvas always clears its
  // minimum — true at 1440, false as soon as the window shrinks: at 1024 the
  // column is 741px and the toolbar's own 840px floor spilled 99px out through
  // the page container. Scrolling the column keeps both outer page edges plumb
  // (§11) and matches what the rail branches already do (§16).
  const column = (
    <div className="min-w-0">
      <Scrollable className="pb-1">
        <div className="relative flex min-w-[720px] flex-col gap-5">{canvas}</div>
      </Scrollable>
    </div>
  );
  if (rail === null) return column;
  // Literal class strings so Tailwind can see both rail widths at build time.
  const cols = rail === 460
    ? "grid-cols-[minmax(0,1fr)_460px]"
    : "grid-cols-[minmax(0,1fr)_420px]";
  return (
    <div className={`grid gap-5 ${cols}`}>
      {column}
      <div className="min-w-0">{drawer}</div>
    </div>
  );
}

/** No graph at all. Derived from the data, so it is true in the real app for
    exactly the same reason it is true on the canvas. */
const isEmpty = (d: LineageData) => !d.nodes.length && !d.edges.length && !d.drawer && !d.extras;

function Body({ data, error, mobile }: { data: LineageData; error: string | null; mobile: boolean }) {
  if (error) {
    return (
      <div className="mt-6">
        <Card>
          <EmptyState icon={<Network size={22} />} title="API offline">{error}</EmptyState>
        </Card>
      </div>
    );
  }
  if (isEmpty(data)) {
    return (
      <div className="mt-6">
        <Card>
          <EmptyState icon={<Network size={22} />} title="No lineage yet">
            Connect a source and sync to build the document graph.
          </EmptyState>
        </Card>
      </div>
    );
  }

  // Mobile collapses to one column (§11): the rail drops below the canvas.
  const rail = mobile ? null : railFor(data);
  const railBody = data.extras ? <Extras extras={data.extras} /> : <Drawer data={data} />;

  return (
    <div className="mt-6 flex flex-col gap-5">
      {data.crumbs && <Breadcrumb items={data.crumbs.map((label) => ({ label }))} />}
      <Rig
        rail={rail}
        canvas={(
          <>
            <LineageToolbar nodes={data.nodes} />
            {data.search && <SearchResults nodes={data.nodes} query={data.search.query} />}
            <LineageGraph
              key={`${data.lens}-${data.layout}-${data.focalId}-${data.trace?.direction ?? "none"}`}
              nodes={data.nodes}
              edges={data.edges}
              lens={data.lens}
              layout={data.layout}
              trace={data.trace}
              focalId={data.focalId}
            />
            <LineageTimeScrubber dates={data.dates} activity={data.activity} value={data.asOf} />
          </>
        )}
        drawer={railBody}
      />
      {/* The lineage drawers are desktop-fixed (420/460px, §10). Below the
          canvas on a phone they scroll sideways inside their own row rather
          than spilling past the page gutter. */}
      {mobile && <Scrollable className="pb-1">{railBody}</Scrollable>}
    </div>
  );
}

function LineagePage({ data, loading = false, error = null, mobile = false }: PageProps<LineageData>) {
  const actions = <Button variant="default">{data.action}</Button>;
  return (
    <PageFrame active={navFor("lineage")} title="Lineage" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="graph" />
      ) : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          <PageHeader
            eyebrow="Lineage"
            title="Product lineage"
            description="The document graph: provenance, impact, and drift across every source."
            actions={mobile ? undefined : actions}
          />
          {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
          <Body data={data} error={error} mobile={mobile} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<LineageData> = {
  id: "lineage",
  title: "Lineage",
  route: "/lineage",
  component: LineagePage,
  states: STATES.map((s) => ({ ...s })),
};
