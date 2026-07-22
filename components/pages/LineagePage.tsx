import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Network } from "lucide-react";
import { LineageToolbar } from "../features/LineageToolbar";
import { LineageGraph } from "../features/LineageGraph";
import { LineageTimeScrubber } from "../features/LineageTimeScrubber";
import { LineageNodeDrawer } from "../features/LineageNodeDrawer";
import { LineageEdgeDrawer } from "../features/LineageEdgeDrawer";
import { LineageGroupDrawer } from "../features/LineageGroupDrawer";
import { LineageAssertDrawer } from "../features/LineageAssertDrawer";
import {
  DEMO_NODES, DEMO_EDGES, NodeGlyph, SOURCE_LABELS, type Lens, type LayoutMode, type LNode,
} from "../features/LineageDataModel";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { card } from "../tokens/card";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Card, Chip, AvatarGroup, Breadcrumb } from "../index";
import {
  LONG_TITLE, LONG_NAME, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT, LONG_SOURCE,
  HUGE_NUMBER, HUGE_NUMBER_STR, HUGE_PERCENT, MANY_TAGS, MANY_INITIALS, LONG_BREADCRUMB,
} from "./stress";

/* Product lineage (pages/lineage.md). The full-height graph "instrument":
   toolbar on top, the lineage canvas in the middle, the as-of time scrubber at
   the bottom, and the mutually-exclusive right drawers.

   The `state` prop drives every reasonable view of the instrument: the four
   recoloring lenses (source / staleness / owner / health), the two layouts,
   the time-scrubber parked in the past vs. live, impact- and provenance-trace
   closures, each of the four drawers (node / edge / roll-up / assert), the
   search-active dropdown, plus loading / offline / empty. */

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

/* Overflow / stress node sets: the graph node cards are fixed-width with
   truncate, so long labels are the key overflow case here. `overflow` uses
   natural long titles; `stress` uses pathological unbreakable tokens. */
function stressNodes(pathological: boolean): LNode[] {
  const titles = pathological
    ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, `${HUGE_NUMBER_STR} unresolved contradictions`]
    : [LONG_TITLE];
  return DEMO_NODES.map((n, i) => {
    if (n.macro) {
      return {
        ...n,
        title: pathological ? `${HUGE_NUMBER_STR} commits` : "Every commit across the entire platform monorepo this quarter",
        repo: pathological ? UNBREAKABLE : LONG_SOURCE,
        count: pathological ? HUGE_NUMBER : n.count,
      };
    }
    return { ...n, title: titles[i % titles.length], owner: pathological ? LONG_WORD : LONG_NAME };
  });
}

const LENS_OF: Record<string, Lens> = {
  "lens-owner": "owner",
  "lens-stale": "stale",
  "lens-health": "health",
};

/** A self-contained search-results dropdown, shown as if the toolbar typeahead
    is active. Composes the shared node glyph + source labels. */
function SearchResults() {
  const q = "pricing";
  const hits = DEMO_NODES.filter(
    (n) => !n.macro &&
      (n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.includes("customer")) ||
        n.docKind === "decision"),
  ).slice(0, 6);
  return (
    <div className={`${card} absolute left-2 top-[52px] z-30 w-[320px] p-1 shadow-lg`}>
      <div className="px-2.5 py-1.5 font-term text-[11px] text-ink/65">{hits.length} results for “{q}”</div>
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
function railFor(state: string): number | null {
  if (state === "inspect" || state === "edge" || state === "group") return 420;
  if (state === "assert") return 460;
  return null;
}

function Drawer({ state }: { state: string }) {
  // Fixed desktop widths (CONVENTIONS §10). Mobile-first `w-full … lg:w-[N]`
  // made these drawers render mobile-style in the desktop canvas.
  if (state === "inspect") return <LineageNodeDrawer nodeId="n4" />;
  if (state === "edge") return <LineageEdgeDrawer edgeId="e3" />;
  if (state === "group") return <LineageGroupDrawer />;
  if (state === "assert") return <LineageAssertDrawer />;
  return null;
}

/* §11 two-column split. The rail keeps its declared width and always sits
   fully inside the container; the main column carries `minmax(0,1fr)` so the
   instrument can never push the drawer off-screen. LineageGraph has a hard
   720px minimum, so on a narrow console the *canvas alone* scrolls sideways
   inside its own column, leaving both outer edges of the page plumb. */
function Rig({ rail, scroll = false, canvas, drawer }: {
  rail: number | null; scroll?: boolean; canvas: React.ReactNode; drawer?: React.ReactNode;
}) {
  // Full-width canvas already clears its 720px minimum, so no scroller (a
  // scroll container would clip the toolbar's search dropdown).
  if (rail === null && !scroll) return <div className="relative flex min-w-0 flex-col gap-5">{canvas}</div>;
  const column = (
    <div className="min-w-0">
      <div className="overflow-x-auto pb-1">
        <div className="relative flex min-w-[720px] flex-col gap-5">{canvas}</div>
      </div>
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

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  if (state === "error") {
    return (
      <div className="mt-6">
        <Card>
          <EmptyState icon={<Network size={22} />} title="API offline">
            The lineage graph is temporarily unavailable. Retrying…
          </EmptyState>
        </Card>
      </div>
    );
  }
  if (state === "empty") {
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

  if (state === "overflow" || state === "stress") {
    const p = state === "stress";
    const nodes = stressNodes(p);
    const sideCard = (
      <Card title={p ? MIXED_SCRIPT : LONG_TITLE} hint={p ? HUGE_PERCENT : `${HUGE_NUMBER_STR} refs`}>
        <p className="text-[12.5px] leading-snug text-ink/70 break-words">{p ? UNBREAKABLE : LONG_NAME}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(p ? MANY_TAGS : MANY_TAGS.slice(0, 10)).map((t) => <Chip key={t} label={t} />)}
        </div>
        <div className="mt-3">
          <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={p ? 4 : 6} />
        </div>
      </Card>
    );
    return (
      <div className="mt-6 flex flex-col gap-5">
        <Breadcrumb items={LONG_BREADCRUMB.map((label) => ({ label }))} />
        <Rig
          rail={mobile ? null : 420}
          scroll={mobile}
          canvas={(
            <>
              <LineageToolbar />
              <LineageGraph key={state} nodes={nodes} edges={DEMO_EDGES} lens="source" layout="flow" trace={null} focalId="n1" />
              <LineageTimeScrubber value={null} />
            </>
          )}
          drawer={sideCard}
        />
        {mobile && sideCard}
      </div>
    );
  }

  const lens: Lens = LENS_OF[state] ?? "source";
  const layout: LayoutMode = state === "layout-timeline" ? "timeline" : "flow";
  const trace =
    state === "trace-impact" ? { originId: "n1", direction: "down" as const } :
    state === "trace-provenance" ? { originId: "n9", direction: "up" as const } :
    null;
  const focalId = trace ? trace.originId : "n1";
  const scrubberValue = state === "as-of" ? 6 : null;

  // Mobile collapses to one column (§11): the drawer drops below the canvas.
  const rail = mobile ? null : railFor(state);
  return (
    <div className="mt-6 flex flex-col gap-5">
      <Rig
        rail={rail}
        scroll={mobile}
        canvas={(
          <>
            <LineageToolbar />
            {state === "search" && <SearchResults />}
            <LineageGraph key={`${lens}-${layout}-${state}`} lens={lens} layout={layout} trace={trace} focalId={focalId} />
            <LineageTimeScrubber value={scrubberValue} />
          </>
        )}
        drawer={<Drawer state={state} />}
      />
      {mobile && <Drawer state={state} />}
    </div>
  );
}

function LineagePage({ state = "default", mobile = false }: PageProps) {
  const actions = <Button variant="default">Authentication API ↗</Button>;
  return (
    <PageFrame active={navFor("lineage")} title="Lineage" mobile={mobile}>
      {state === "loading" ? (
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
          <Body state={state} mobile={mobile} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "lineage",
  title: "Lineage",
  route: "/lineage",
  component: LineagePage,
  states: STATES.map((s) => ({ ...s })),
};
