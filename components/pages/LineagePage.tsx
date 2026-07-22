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
  DEMO_NODES, NodeGlyph, SOURCE_LABELS, type Lens, type LayoutMode,
} from "../features/LineageDataModel";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { card } from "../tokens/card";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";

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
] as const;

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
      <div className="px-2.5 py-1.5 font-term text-[11px] text-ink/45">{hits.length} results for “{q}”</div>
      {hits.map((n) => (
        <div key={n.id} className="flex items-center gap-2.5 rounded-[3px] px-2 py-1.5 hover:bg-flysch">
          <span className="shrink-0 text-ink/70"><NodeGlyph node={n} size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{n.title}</span>
            <span className="block truncate font-term text-[11px] text-ink/50">
              {[n.owner, SOURCE_LABELS[n.source] ?? n.source, n.date].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="shrink-0 font-term text-[11px] text-ink/45">{n.inbound ?? 0}↩</span>
        </div>
      ))}
    </div>
  );
}

function Drawer({ state }: { state: string }) {
  const cls = "w-full shrink-0 lg:w-[380px]";
  if (state === "inspect") return <div className={cls}><LineageNodeDrawer nodeId="n4" /></div>;
  if (state === "edge") return <div className={cls}><LineageEdgeDrawer edgeId="e3" /></div>;
  if (state === "group") return <div className={cls}><LineageGroupDrawer /></div>;
  if (state === "assert") return <div className="w-full shrink-0 lg:w-[420px]"><LineageAssertDrawer /></div>;
  return null;
}

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Network size={22} />} title="API offline">
          The lineage graph is temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Network size={22} />} title="No lineage yet">
          Connect a source and sync to build the document graph.
        </EmptyState>
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

  return (
    <div className="mt-5 flex flex-col gap-4 lg:flex-row">
      <div className="relative min-w-0 flex-1 space-y-3">
        <LineageToolbar />
        {state === "search" && <SearchResults />}
        <LineageGraph key={`${lens}-${layout}-${state}`} lens={lens} layout={layout} trace={trace} focalId={focalId} />
        <LineageTimeScrubber value={scrubberValue} />
      </div>
      <Drawer state={state} />
    </div>
  );
}

function LineagePage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("lineage")} title="Lineage" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="graph" />
      ) : (
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <PageHeader
            eyebrow="Lineage"
            title="Product lineage"
            description="The document graph: provenance, impact, and drift across every source."
            actions={<Button variant="default">Authentication API ↗</Button>}
          />
          <Body state={state} />
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
