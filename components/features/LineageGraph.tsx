import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, Maximize2, Move } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Chip } from "../data-display/Chip";
import { Button } from "../actions/Button";
import { Skeleton, SkeletonLine } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { Truncate, TruncateInline } from "../data-display/Truncate";
import { WriteError } from "../feedback/WriteError";
import { useWrite } from "../actions/useWrite";
import { fmtDate } from "../tokens/format";
import {
  REL, REL_ORDER, NodeGlyph, staleColor, ownerColor, SOURCE_ACCENT, SOURCE_LABELS,
  NODE_CREAM, clamp, useLineageControls, nodePasses, nodeMatchesQuery,
  nodeById, tracePath, nodeEditedAfter, edgeCreatedAfter, nodeStatusKey,
  buildOverviewGraph, buildFocusedGraph, isLineageRelation,
  LINEAGE_RELATIONS,
  type LNode, type LEdge, type Lens, type LayoutMode, type LineageMode,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage graph canvas (feature: lineage-graph)

   The central instrument of the lineage page: a directed graph of document
   nodes + typed edges. The real console renders this with Cytoscape.js +
   cytoscape-dagre; that engine can't be pulled in here, so this is a faithful
   representation — inline SVG edges + absolutely-positioned HTML node cards
   over a faint paper grid.

   The canvas is live, not a picture: drag the background to pan, drag a node to
   move it, click to select, and the zoom controls drive a real scale transform.
   Filters, lens, layout and zoom come from the shared control store, so the
   toolbar above actually operates this canvas.

   Node design: FLAT cream cards. The type/source is a solid bar down the LEFT
   edge, backed by an icon and a mono source label, so color is never the only
   distinguisher. Relations differ by color AND dash pattern AND weight AND the
   code printed on the edge.
   ──────────────────────────────────────────────────────────────────────── */

const VB_W = 1000;
const VB_H = 560;

export type LineageGraphProps = {
  nodes: LNode[];
  edges: LEdge[];
  /** Seeds the shared control store's layout. The store is the single source
      of truth after that, so the toolbar's own Layout control keeps working;
      passing this again with the same value does not undo a reader's choice. */
  layout?: LayoutMode;
  /** Seeds the shared control store's lens. Same contract as `layout`. */
  lens?: Lens;
  /** Initially selected / focal node id. */
  focalId?: string | null;
  /** Show the "Impact of …" trace summary + dim everything outside it. */
  trace?: { originId: string; direction: "down" | "up" } | null;
  /** The user question this canvas answers. Overview aggregates; the two
      focused modes traverse only directional lineage relations. */
  mode?: LineageMode;
  /** Maximum dependency hops in provenance / impact mode. */
  hopDepth?: number;
  /** Hard cap on how many node cards the canvas will draw at once. Past this
   *  the graph keeps the best-connected nodes and says how many it dropped,
   *  rather than painting an unreadable hairball. */
  maxNodes?: number;
  onSelectNode?: (id: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onSelectEdge?: (id: string) => void;
  /** Persist where a node was dragged to, so the position survives a reload.
      May throw; the canvas shows the message over the graph. Omitted = the
      move stays local, which is what the design canvas renders. */
  onPinNode?: (args: { docId: number; x: number; y: number }) => void | Promise<void>;
  /** Render a content-shaped skeleton silhouette instead of the graph. */
  loading?: boolean;
  className?: string;
};

/** Lens → accent color for a node's left bar. */
function accentColor(node: LNode, lens: Lens): string {
  if (lens === "source") return SOURCE_ACCENT[node.source] ?? "#6b6353";
  if (lens === "stale") return staleColor(node.staleDays ?? 0);
  if (lens === "owner") return node.owner ? ownerColor(node.owner) : "#8a7f68";
  if (node.warn || node.orphan) return "#c0392b";
  return "#43663c";
}

/** Second, non-color channel for the left bar: what the lens is saying. */
function accentWord(node: LNode, lens: Lens): string {
  if (lens === "source") return (SOURCE_LABELS[node.source] ?? node.source).toUpperCase();
  if (lens === "stale") return `${node.staleDays ?? 0}D`;
  if (lens === "owner") return (node.owner ?? "Unowned").toUpperCase();
  return node.warn || node.orphan ? "WARN" : "OK";
}

/** Directed BFS closure over edges (down = impact, up = provenance). */
function traceClosure(originId: string, dir: "down" | "up", edges: LEdge[]): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges.filter((edge) => isLineageRelation(edge.rel))) {
    // Stored direction is dependent -> source. Provenance follows it; impact
    // walks it backwards from a source to the documents that depend on it.
    const key = dir === "up" ? e.from : e.to;
    const val = dir === "up" ? e.to : e.from;
    (adj.get(key) ?? adj.set(key, []).get(key)!).push(val);
  }
  const seen = new Set<string>([originId]);
  const stack = [originId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nxt of adj.get(cur) ?? []) if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt); }
  }
  return seen;
}

/* ── Volume defences ──────────────────────────────────────────────────────
   A real lineage graph is hundreds of nodes and edges. Drawn literally, 150
   cards over a 1000×560 canvas overlap into a hairball, every edge code stacks
   on top of its neighbours, and nothing is readable. Three defences, in order:

   1. CAP     — draw at most `maxNodes` cards, keeping the best-connected ones
                (plus the focal / trace origin) and reporting the remainder.
   2. GRID    — past DECLUTTER_AT cards, snap positions onto a lane grid so no
                two cards can overlap. Small graphs keep their authored layout.
   3. QUIET   — past LABEL_LIMIT edges, drop the per-edge relation codes; the
                legend still carries them and the dash patterns still read. */

const DEFAULT_MAX_NODES = 35;
/** Above this many drawn cards the authored positions are replaced by lanes. */
const DECLUTTER_AT = 18;
/** Above this many drawn edges the per-edge codes stop being painted. */
const LABEL_LIMIT = 40;
/** Lane grid: 5 columns × 7 rows fits DEFAULT_MAX_NODES 152px cards with air
    between them on a 900px canvas. More columns and the cards touch. The rows
    start below the zoom controls and stop above the drag hint so the canvas
    overlays never sit on a card. */
const GRID_COLS = 5;
const GRID_ROWS = 7;
const GRID_TOP = 0.14;
const GRID_BOTTOM = 0.85;

/** Total edge count per node id, used to rank which nodes survive the cap. */
function degreeMap(edges: LEdge[]): Map<string, number> {
  const d = new Map<string, number>();
  for (const e of edges) {
    d.set(e.from, (d.get(e.from) ?? 0) + 1);
    d.set(e.to, (d.get(e.to) ?? 0) + 1);
  }
  return d;
}

/** Lane layout: left-to-right by authored x, so the flow reading survives the
    declutter, but on a fixed grid so cards never sit on top of each other. */
function gridPositions(nodes: LNode[], pos: (n: LNode) => { x: number; y: number }) {
  const out: Record<string, { x: number; y: number }> = {};
  const order = [...nodes].sort((a, b) => pos(a).x - pos(b).x || pos(a).y - pos(b).y);
  const cols = Math.min(GRID_COLS, Math.max(1, Math.ceil(order.length / GRID_ROWS)));
  const perCol = Math.ceil(order.length / cols);
  const colX = (i: number) => (cols === 1 ? 0.5 : 0.09 + (0.81 * i) / (cols - 1));
  const span = GRID_BOTTOM - GRID_TOP;
  for (let c = 0; c < cols; c++) {
    const lane = order.slice(c * perCol, (c + 1) * perCol).sort((a, b) => pos(a).y - pos(b).y);
    for (let r = 0; r < lane.length; r++) {
      const y = lane.length === 1 ? 0.5 : GRID_TOP + (span * r) / (lane.length - 1);
      out[lane[r].id] = { x: colX(c), y };
    }
  }
  return out;
}

/** Timeline layout: x by event date rank, y kept from the flow layout. */
function timelinePositions(nodes: LNode[]): Record<string, { x: number; y: number }> {
  const dated = nodes.filter((n) => n.date).map((n) => n.date as string);
  const ranks = Array.from(new Set(dated)).sort();
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    const i = n.date ? ranks.indexOf(n.date) : -1;
    const x = i < 0 || ranks.length < 2 ? 0.5 : 0.07 + (0.86 * i) / (ranks.length - 1);
    out[n.id] = { x, y: n.y };
  }
  return out;
}

export function LineageGraph({
  nodes: rawNodes, edges: rawEdges, layout, lens, focalId = "n1",
  trace: traceProp = null, maxNodes = DEFAULT_MAX_NODES,
  mode, hopDepth = 1,
  onSelectNode, onSelectGroup, onSelectEdge, onPinNode, loading = false, className = "",
}: LineageGraphProps) {
  const graph = useMemo(() => {
    if (mode === "overview") return buildOverviewGraph(rawNodes, rawEdges);
    if (mode === "provenance" || mode === "impact") {
      return buildFocusedGraph(rawNodes, rawEdges, focalId, mode, hopDepth);
    }
    return { nodes: rawNodes, edges: rawEdges };
  }, [rawNodes, rawEdges, focalId, mode, hopDepth]);
  const nodes = graph.nodes;
  const edges = graph.edges;
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [controls, setControls] = useLineageControls();
  const [sel, setSel] = useState<{ kind: "node" | "edge"; id: string } | null>(
    focalId ? { kind: "node", id: focalId } : null,
  );
  const [hover, setHover] = useState<string | null>(null);
  const [trace, setTrace] = useState(traceProp);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  /* Dropping a node writes its position, so the drop goes through the one
     write hook rather than a local busy/failed pair (actions/useWrite.ts). */
  const pinWrite = useWrite();

  /* ONE source of truth for lens/layout: the shared control store. The props
     only seed it, and only when they change — the page used to both pass them
     and remount this component on every change, which threw away pan, drag
     positions and selection, and reset a reader's "Color by" choice back to
     whatever the data shipped. */
  useEffect(() => { if (lens) setControls({ lens }); }, [lens, setControls]);
  useEffect(() => { if (layout) setControls({ layout }); }, [layout, setControls]);
  useEffect(() => { setTrace(traceProp); }, [traceProp]);
  // Selection follows the focal node when the page moves it. This used to
  // arrive via a remount, which is why it cost the whole canvas state.
  useEffect(() => { if (focalId) setSel({ kind: "node", id: focalId }); }, [focalId]);

  // Read from the store, not the prop: the prop seeds the store above, and the
  // toolbar can then change it. Reading the prop directly would make the
  // toolbar's lens/layout controls dead on any page that passes one.
  const effLens = controls.lens;
  const effLayout = controls.layout;
  const zoom = controls.zoom;

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    mode: "pan" | "node"; id?: string; startX: number; startY: number;
    origin: { x: number; y: number }; moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  /* ── which nodes/edges survive the toolbar filters ─────────────────── */
  const timeline = useMemo(() => timelinePositions(nodes), [nodes]);

  const focusSet = useMemo(() => {
    if (mode) return null;
    if (controls.scope !== "focus" || !focalId) return null;
    const keep = new Set<string>([focalId]);
    for (const e of edges) {
      if (e.from === focalId) keep.add(e.to);
      if (e.to === focalId) keep.add(e.from);
    }
    return keep;
  }, [controls.scope, focalId, edges, mode]);

  const passing = useMemo(
    () => nodes.filter((n) => nodePasses(n, controls) && (!focusSet || focusSet.has(n.id))),
    [nodes, controls, focusSet],
  );

  const closure = useMemo(
    () => (trace ? traceClosure(trace.originId, trace.direction, edges) : null),
    [trace, edges],
  );

  /* The toolbar's "Find path" arms `controls.path`; the picking happens here,
     because the two ends are nodes on this canvas. Two picks resolve to a
     route, which is drawn and holds everything else back. */
  const pathMode = controls.path !== null;
  const path = useMemo(() => tracePath(controls.path, edges), [controls.path, edges]);

  /* The cap: keep the best-connected nodes, and never drop the focal node, the
     trace origin, or anything inside an active trace closure. */
  const visibleNodes = useMemo(() => {
    if (passing.length <= maxNodes) return passing;
    const deg = degreeMap(edges);
    const keep = [...passing].sort((a, b) => {
      // A node on the current path is never capped away: dropping one end (or
      // a hop in the middle) would draw a route with a hole in it.
      const pin = (n: LNode) => (n.id === focalId || n.id === trace?.originId ? 1 : 0) +
        (closure?.has(n.id) ? 1 : 0) + (path?.nodes.has(n.id) ? 2 : 0);
      return pin(b) - pin(a) || (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0) || a.id.localeCompare(b.id);
    }).slice(0, maxNodes);
    const kept = new Set(keep.map((n) => n.id));
    // Restore the authored order so the layout is not reshuffled by ranking.
    return passing.filter((n) => kept.has(n.id));
  }, [passing, maxNodes, edges, focalId, trace?.originId, closure, path]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter((e) =>
      visibleIds.has(e.from) && visibleIds.has(e.to) &&
      (!controls.rels || controls.rels.includes(e.rel)) &&
      // Time travel: a link that had not been made yet on the as-of date is
      // not drawn, which is half of what the scrubber's caption promises.
      !edgeCreatedAfter(e, controls.asOf)),
    [edges, visibleIds, controls.rels, controls.asOf],
  );

  const basePos = (n: LNode) => (effLayout === "timeline" ? timeline[n.id] ?? { x: n.x, y: n.y } : { x: n.x, y: n.y });

  /* Declutter: a dense canvas gets lanes instead of authored coordinates, so
     no two cards can overlap. Small graphs keep the layout they were given. */
  const lanes = useMemo(
    () => (visibleNodes.length > DECLUTTER_AT ? gridPositions(visibleNodes, basePos) : null),
    // basePos is derived from effLayout + timeline, both listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleNodes, effLayout, timeline],
  );

  const posOf = (n: LNode) => moved[n.id] ?? lanes?.[n.id] ?? basePos(n);
  const px = (n: LNode) => { const p = posOf(n); return { x: p.x * VB_W, y: p.y * VB_H }; };
  const dimmed = (id: string) => {
    // A resolved path is the strongest statement on the canvas: everything off
    // it recedes, including whatever the search or a trace was spotlighting.
    if (path) return !path.nodes.has(id);
    if (closure && !closure.has(id)) return true;
    const n = byId[id];
    return n ? !nodeMatchesQuery(n, controls.query) : false;
  };

  /* ── pointer: drag the background to pan, drag a node to move it ────── */
  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, origin: pan, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const startNode = (e: ReactPointerEvent<HTMLElement>, n: LNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    drag.current = { mode: "node", id: n.id, startX: e.clientX, startY: e.clientY, origin: posOf(n), moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    if (d.mode === "pan") {
      setPan({ x: d.origin.x + dx, y: d.origin.y + dy });
      return;
    }
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    setMoved((m) => ({
      ...m,
      [d.id!]: {
        x: clamp(d.origin.x + dx / (r.width * zoom), 0.04, 0.96),
        y: clamp(d.origin.y + dy / (r.height * zoom), 0.05, 0.95),
      },
    }));
  };

  /* Dropping a node is the pin gesture: the position it was dragged to is
     persisted, so the layout the reader arranged survives a reload instead of
     snapping back to the auto-layout. */
  const endDrag = () => {
    const d = drag.current;
    suppressClick.current = Boolean(d?.moved);
    drag.current = null;
    if (!d?.moved || d.mode !== "node" || !d.id || !onPinNode) return;
    const at = moved[d.id];
    const node = byId[d.id];
    if (!at || !node || node.docId == null) return;
    void pinWrite.run(() => onPinNode({ docId: node.docId as number, x: at.x, y: at.y }));
  };

  const selectNode = (id: string) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    /* In path mode a click is a pick, not an inspection: opening the drawer
       over the canvas would hide the very route the pick is meant to reveal.
       A third pick starts a new pair from the node just clicked. */
    if (pathMode) {
      const picks = controls.path ?? [];
      if (picks.length === 1 && picks[0] === id) return; // same node twice is not a path
      setControls({ path: picks.length >= 2 ? [id] : [...picks, id] });
      return;
    }
    const node = byId[id];
    if (node?.macro) {
      setSel({ kind: "node", id });
      onSelectGroup?.(node.group);
      return;
    }
    setSel({ kind: "node", id });
    onSelectNode?.(id);
  };

  const setZoom = (z: number) => setControls({ zoom: clamp(Number(z.toFixed(2)), 0.3, 2.5) });

  /* ── keyboard traversal ─────────────────────────────────────────────────
     The canvas was mouse-only: pointer handlers everywhere and no way to walk
     the graph without one. Every node card is a real button (so Tab reaches
     them in reading order and Enter opens one), and the arrow keys move focus
     to the nearest card in that direction, which is how a reader follows a
     lineage without dragging. */
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const ARROWS: Record<string, "left" | "right" | "up" | "down"> = {
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  };

  const moveFocus = (from: LNode, dir: "left" | "right" | "up" | "down") => {
    const p = posOf(from);
    const horizontal = dir === "left" || dir === "right";
    const best = visibleNodes
      .filter((n) => n.id !== from.id)
      .map((n) => ({ n, q: posOf(n) }))
      .filter(({ q }) =>
        dir === "left" ? q.x < p.x : dir === "right" ? q.x > p.x : dir === "up" ? q.y < p.y : q.y > p.y)
      // Distance along the travel axis counts double against distance across
      // it, so "right" lands on the next card over rather than the far corner.
      .sort((a, b) => {
        const cost = (q: { x: number; y: number }) => (horizontal
          ? Math.abs(q.x - p.x) + 2 * Math.abs(q.y - p.y)
          : Math.abs(q.y - p.y) + 2 * Math.abs(q.x - p.x));
        return cost(a.q) - cost(b.q);
      })[0];
    if (!best) return;
    nodeRefs.current[best.n.id]?.focus();
  };

  /** What a screen reader is told about one card: everything the card's own
      colors and glyphs say, in words. */
  const nodeLabel = (n: LNode, editedAfter: boolean) => [
    n.title,
    n.macro ? `${n.count ?? 0} rolled-up documents from ${n.repo ?? "a repository"}` : SOURCE_LABELS[n.source] ?? n.source,
    n.macro ? null : n.owner ? `owned by ${n.owner}` : "unowned",
    n.macro ? null : nodeStatusKey(n) === "warning" ? "needs attention" : nodeStatusKey(n) === "review" ? "needs review" : "verified",
    typeof n.staleDays === "number" ? `${n.staleDays} days since the last update` : null,
    editedAfter ? "edited after the as-of date" : null,
  ].filter(Boolean).join(", ");

  if (loading) {
    return (
      /* The relation LEGEND is the graph's key, and it is the same four
         relations whatever the graph turns out to contain: colour, dash and
         code all come from REL. Drawing it as three grey pills hid the one
         thing that would have let the reader read the canvas the moment it
         appeared, and it was the wrong number of pills besides. Only the node
         volume on the right is a count, so only that waits. */
      <div className={`${card} min-w-[560px] overflow-hidden font-display ${className}`.trim()} aria-busy="true">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/10 px-3.5 py-2">
          <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Relations</span>
          {REL_ORDER.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-ink/75">
              <svg width={26} height={9} viewBox="0 0 26 9" aria-hidden>
                <line x1={1} y1={4.5} x2={25} y2={4.5} stroke={REL[k].color} strokeWidth={REL[k].width} strokeDasharray={REL[k].dash} />
              </svg>
              <span className="font-term text-[10px] font-medium tracking-[0.06em] text-ink/65">{REL[k].code}</span>
              {REL[k].label}
            </span>
          ))}
          <span className="ml-auto"><SkeletonLine w={64} h={11} /></span>
        </div>
        <div className="relative" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <Skeleton className="absolute inset-0 h-full w-full" rounded="rounded-none" />
        </div>
      </div>
    );
  }

  const hiddenCount = nodes.length - passing.length;
  const cappedCount = passing.length - visibleNodes.length;
  const quietEdges = visibleEdges.length > LABEL_LIMIT;
  const legendRelations = mode === "overview"
    ? REL_ORDER.filter((rel) => visibleEdges.some((edge) => edge.rel === rel))
    : mode ? LINEAGE_RELATIONS : REL_ORDER;

  return (
    <div className={`${card} min-w-[560px] overflow-hidden font-display ${className}`.trim()}>
      {/* legend: color + dash + code, three channels per relation */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/10 px-3.5 py-2">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Relations</span>
        {legendRelations.map((k) => {
          const on = !controls.rels || controls.rels.includes(k);
          return (
            <span key={k} className={`inline-flex items-center gap-1.5 text-[12px] ${on ? "text-ink/75" : "text-ink/35 line-through"}`}>
              <svg width={26} height={9} viewBox="0 0 26 9" aria-hidden>
                <line x1={1} y1={4.5} x2={25} y2={4.5} stroke={on ? REL[k].color : "#9aa4ae"} strokeWidth={REL[k].width} strokeDasharray={REL[k].dash} />
              </svg>
              <span className="font-term text-[10px] font-medium tracking-[0.06em] text-ink/65">{REL[k].code}</span>
              {REL[k].label}
            </span>
          );
        })}
        {legendRelations.length === 0 && (
          <span className="text-[12px] text-ink/65">No cross-group dependencies</span>
        )}
        {/* The volume readout lives in the header, not over the canvas: a badge
            floating top-left would sit on the first lane of cards. */}
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {cappedCount > 0 && (
            <span className="shrink-0 rounded-[3px] border border-clay/45 bg-clay/[0.10] px-1.5 py-0.5 font-term text-[10px] font-medium uppercase tracking-[0.06em] text-ink/80">
              Capped
            </span>
          )}
          <TruncateInline className="font-term text-[11px] text-ink/65">
            {cappedCount > 0
              ? `Lens: ${effLens} · showing ${visibleNodes.length} of ${nodes.length} nodes, ${visibleEdges.length} of ${edges.length} links, best-connected first`
              : `Lens: ${effLens} · showing ${visibleNodes.length} of ${nodes.length} nodes`}
          </TruncateInline>
        </span>
      </div>

      {/* canvas */}
      <div
        ref={canvasRef}
        role="group"
        // The whole page is this canvas, so it needs to describe itself: what
        // it is, how big it is, and what state it is in. Nothing else on the
        // page tells a reader who cannot see it what is on screen.
        aria-label={`Lineage graph${controls.asOf ? ` as of ${fmtDate(controls.asOf)}` : ""}: ${visibleNodes.length} documents, ${visibleEdges.length} links, colored by ${effLens}`}
        className="relative touch-none select-none"
        style={{ aspectRatio: `${VB_W} / ${VB_H}`, cursor: "grab" }}
        onPointerDown={startPan}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* paper grid — stays put so panning reads against a stable ground */}
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <pattern id="lg-grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M26 0H0V26" fill="none" stroke="#10263B" strokeOpacity="0.05" strokeWidth="1" />
            </pattern>
            <marker id="lg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#lg-grid)" />
        </svg>

        {/* the viewport: pan + zoom transform over both layers */}
        <div
          className="absolute inset-0"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
        >
          {/* edges */}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none">
            {visibleEdges.map((e) => {
              const a = byId[e.from], b = byId[e.to];
              if (!a || !b) return null;
              const p1 = px(a), p2 = px(b);
              const agg = e.id.startsWith("ge:") || (e.count ?? 0) > 1;
              const s = REL[e.rel];
              const selEdge = sel?.kind === "edge" && sel.id === e.id;
              const onPath = path?.edges.has(e.id) ?? false;
              // Two nodes on the route can also be joined by a link the route
              // does not use; that link is not the answer, so it recedes too.
              const dim = path ? !onPath : dimmed(e.from) || dimmed(e.to);
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const c1 = `${midX} ${p1.y}`, c2 = `${midX} ${p2.y}`;
              const d = `M ${p1.x} ${p1.y} C ${c1}, ${c2}, ${p2.x} ${p2.y}`;
              return (
                <g key={e.id} style={{ color: s.color, opacity: dim ? 0.15 : 1 }}>
                  {!agg && (
                    /* fat invisible hit line — a 2px stroke is a hard click target */
                    <path
                      d={d} fill="none" stroke="transparent" strokeWidth={14}
                      vectorEffect="non-scaling-stroke" className="cursor-pointer"
                      onClick={() => { setSel({ kind: "edge", id: e.id }); onSelectEdge?.(e.id); }}
                    />
                  )}
                  <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={selEdge || onPath ? s.width + 1.6 : s.width}
                    strokeDasharray={s.dash}
                    markerEnd={isLineageRelation(e.rel) ? "url(#lg-arrow)" : undefined}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  {/* Past LABEL_LIMIT edges these codes stack into an
                      illegible smear; the legend keeps carrying them. */}
                  {!quietEdges && (
                    <text
                      x={midX} y={midY - 5} textAnchor="middle" fontSize="9.5"
                      fill={s.color} stroke="#ffffff" strokeWidth={3} paintOrder="stroke"
                      className="font-term" pointerEvents="none"
                    >
                      {agg && e.count && e.count > 1 ? `${s.code} ×${e.count}` : s.code}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* nodes */}
          <div className="absolute inset-0" role="group" aria-label="Documents. Use the arrow keys to move between them.">
            {visibleNodes.map((n) => {
              const p = posOf(n);
              const isSel = sel?.kind === "node" && sel.id === n.id;
              const isFocal = focalId === n.id;
              const dim = dimmed(n.id);
              const accent = accentColor(n, effLens);
              const changed = trace?.direction === "up" && closure?.has(n.id) &&
                n.date && byId[trace.originId]?.date && n.date > (byId[trace.originId].date as string);
              // A picked end of a path outranks selection and focus: while the
              // path finder is armed, "which two did I click" is the question.
              const isPick = controls.path?.includes(n.id) ?? false;
              const ring = isPick ? "#1E6FA8" : isSel && !pathMode ? "#35549d" : isFocal ? "#c8502e" : null;
              // Time travel: this document existed on the as-of date but its
              // latest edit is still in the future, so it is drawn dashed —
              // the other half of the scrubber caption's promise.
              const editedAfter = nodeEditedAfter(n, controls.asOf);
              return (
                <button
                  key={n.id}
                  ref={(el) => { nodeRefs.current[n.id] = el; }}
                  type="button"
                  aria-label={nodeLabel(n, editedAfter)}
                  aria-pressed={isSel && !pathMode}
                  onPointerDown={(e) => startNode(e, n)}
                  onPointerMove={onMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={() => selectNode(n.id)}
                  onKeyDown={(e) => {
                    const dir = ARROWS[e.key];
                    if (!dir) return;
                    e.preventDefault();
                    moveFocus(n, dir);
                  }}
                  onFocus={() => setHover(n.id)}
                  onBlur={() => setHover((h) => (h === n.id ? null : h))}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
                  style={{
                    // The card is 152px wide and centred on its position, so
                    // its centre is held at least half a card inside the
                    // canvas. Without this the rightmost timeline column hung
                    // 26px past the canvas on a narrow console.
                    left: `clamp(76px, ${p.x * 100}%, calc(100% - 76px))`,
                    top: `${p.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    opacity: dim ? 0.22 : 1,
                    backgroundColor: NODE_CREAM,
                    borderColor: ring ?? "rgba(16,38,59,0.22)",
                    borderStyle: editedAfter ? "dashed" : undefined,
                    boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
                    cursor: "grab",
                  }}
                  // FLAT: no drop shadow, no gradient. Depth is not the signal.
                  className={`absolute z-10 flex w-[152px] items-stretch overflow-hidden rounded-[4px] text-left ${focusRing} ${
                    n.macro ? "border-2" : "border"
                  }`}
                >
                  {/* type/topic distinguisher: a solid bar down the LEFT edge */}
                  <span className="w-[5px] shrink-0" style={{ backgroundColor: accent }} aria-hidden />
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5">
                    <span className="shrink-0 text-ink/75"><NodeGlyph node={n} size={16} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-medium leading-tight text-ink">{n.title}</span>
                      {/* the same information the bar carries, in words, plus a
                          high-contrast owner name (was text-ink/65) */}
                      <span className="block truncate font-term text-[9.5px] leading-tight text-ink/70">
                        {accentWord(n, effLens)} · {n.macro ? n.repo : n.owner ?? "Unowned"}
                      </span>
                    </span>
                  </span>
                  {n.warn && !n.macro && (
                    <span
                      className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-[2px] border border-paper bg-[#c8502e] font-term text-[9px] font-bold leading-none text-white"
                      aria-label="Needs attention"
                    >
                      !
                    </span>
                  )}
                  {changed && (
                    <span
                      className="absolute -left-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-[2px] border border-paper bg-[#c0392b] font-term text-[9px] font-bold leading-none text-white"
                      aria-label="Changed after the origin"
                    >
                      ∆
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Edges are SVG paths with a click handler, which no keyboard and no
            screen reader can reach. The same links are offered here as real
            buttons: off-screen until one takes focus, then a plain panel, so a
            reader tabbing through never lands on something invisible. */}
        {visibleEdges.length > 0 && (
          <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-3 focus-within:bottom-12 focus-within:z-30 focus-within:rounded-[5px] focus-within:border focus-within:border-ink/20 focus-within:bg-paper/95 focus-within:p-2 focus-within:backdrop-blur">
            <div className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">
              Links, {visibleEdges.length}
            </div>
            {/* Bounded and visibly scrolling once it overflows (§20). */}
            <Scrollable axis="y" className="max-h-[152px]">
              <ul>
                {visibleEdges.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => { setSel({ kind: "edge", id: e.id }); onSelectEdge?.(e.id); }}
                      className={`block w-full truncate rounded-[3px] px-1.5 py-1 text-left text-[12.5px] text-ink/85 hover:bg-flysch ${focusRing}`}
                    >
                      {`${byId[e.from]?.title ?? e.from} ${REL[e.rel].out.toLowerCase()} ${byId[e.to]?.title ?? e.to}`}
                    </button>
                  </li>
                ))}
              </ul>
            </Scrollable>
          </div>
        )}

        {/* nothing to draw: say so rather than showing blank paper */}
        {visibleNodes.length === 0 && (
          <div className="absolute inset-0 z-20 grid place-items-center">
            <div className="max-w-[320px] rounded-[5px] border border-ink/15 bg-paper/95 px-4 py-3 text-center backdrop-blur">
              <div className="text-[13px] font-semibold text-ink">
                {nodes.length === 0 ? "No documents in this graph" : "No documents match these filters"}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink/70">
                {nodes.length === 0
                  ? "Connect a source, or widen the time range, to see lineage here."
                  : "Clear a source, relation or status filter in the toolbar above."}
              </p>
            </div>
          </div>
        )}

        {/* hover tooltip — outside the transform so it stays legible at any zoom */}
        {hover && byId[hover] && visibleIds.has(hover) && (() => {
          const n = byId[hover];
          const p = posOf(n);
          return (
            <div
              className="pointer-events-none absolute z-20 max-w-[240px] -translate-x-1/2 rounded-[4px] border border-ink/20 bg-paper px-2.5 py-1.5"
              style={{ left: `clamp(76px, ${p.x * 100}%, calc(100% - 76px))`, top: `calc(${p.y * 100}% - 48px)` }}
            >
              <Truncate lines={2} className="text-[12px] font-semibold text-ink">{n.title}</Truncate>
              <div className="truncate font-term text-[10.5px] text-ink/70">
                {[n.meta, typeof n.staleDays === "number" ? `${n.staleDays}d stale` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
          );
        })()}

        {/* trace summary — stood down while the path finder owns this corner */}
        {trace && closure && !pathMode && (() => {
          const origin = byId[trace.originId];
          const groups = new Map<string, number>();
          for (const e of visibleEdges) {
            if (closure.has(e.from) && closure.has(e.to)) groups.set(e.rel, (groups.get(e.rel) ?? 0) + 1);
          }
          return (
            <div className="absolute bottom-3 left-3 z-20 max-w-[300px] rounded-[5px] border border-ink/20 bg-paper/95 p-3 backdrop-blur">
              <Truncate lines={2} className="text-[12.5px] font-semibold text-ink" title={origin?.title}>
                {`${trace.direction === "down" ? "Impact of" : "Provenance of"} ${origin?.title ?? ""}`}
              </Truncate>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Chip label={`${closure.size - 1} docs`} tone="info" />
                {[...groups].map(([rel, count]) => (
                  <Chip key={rel} label={`${REL[rel as keyof typeof REL].label} ${count}`} tone="neutral" />
                ))}
              </div>
              <div className="mt-2">
                <Button compact onClick={() => setTrace(null)}>Clear</Button>
              </div>
            </div>
          );
        })()}

        {/* path readout — the answer sits on the canvas the picks were made on,
            not only in the toolbar row that armed the mode */}
        {pathMode && (
          <div className="absolute bottom-3 left-3 z-20 max-w-[320px] rounded-[5px] border border-biscay-2/45 bg-paper/95 p-3 backdrop-blur">
            <div className="text-[12.5px] font-semibold text-ink">
              {!controls.path?.length
                ? "Find path: click the first document"
                : controls.path.length === 1
                  ? "Find path: click the second document"
                  : path
                    ? `${path.hops} hop${path.hops === 1 ? "" : "s"} between them`
                    : "No route between those two"}
            </div>
            {path && (
              <Truncate lines={3} className="mt-1 font-term text-[11px] text-ink/70">
                {path.ids.map((id) => byId[id]?.title ?? id).join(" → ")}
              </Truncate>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              <Button compact onClick={() => setControls({ path: [] })}>Start over</Button>
              <Button compact onClick={() => setControls({ path: null })}>Exit</Button>
            </div>
          </div>
        )}

        {/* filter readout — proves the toolbar and the scrubber reached the canvas */}
        {(hiddenCount > 0 || controls.query.trim() || controls.asOf) && (
          <div className="absolute left-3 top-3 z-20 max-w-[260px] truncate rounded-[4px] border border-ink/20 bg-paper/95 px-2.5 py-1.5 font-term text-[11px] text-ink/70 backdrop-blur">
            {[
              controls.asOf ? `As of ${fmtDate(controls.asOf)}` : null,
              hiddenCount > 0 ? `${hiddenCount} node${hiddenCount === 1 ? "" : "s"} hidden` : null,
              controls.query.trim() ? `matching “${controls.query.trim()}”` : null,
            ].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* A rejected pin says so over the canvas, where the drag happened. It
            is a failed WRITE with no input to accuse, so it is the banner (§8),
            not a 12px field caption. */}
        {pinWrite.failed && (
          <div className="absolute bottom-3 left-3 z-20 max-w-[320px]">
            <WriteError onDismiss={() => pinWrite.setFailed(null)}>{pinWrite.failed}</WriteError>
          </div>
        )}

        {/* drag hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-[4px] border border-ink/15 bg-paper/90 px-2 py-1 font-term text-[10.5px] text-ink/65 backdrop-blur">
          <Move size={12} /> Drag to pan · arrow keys walk the graph · click to {pathMode ? "pick" : "open"}
        </div>

        {/* zoom controls */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-[5px] border border-ink/20 bg-paper/95 p-1 backdrop-blur">
          <Button icon aria-label="Zoom out" onClick={() => setZoom(zoom - 0.2)}><Minus size={15} /></Button>
          <span className="w-11 text-center font-term text-[11px] text-ink/70">{Math.round(zoom * 100)}%</span>
          <Button icon aria-label="Zoom in" onClick={() => setZoom(zoom + 0.2)}><Plus size={15} /></Button>
          <Button
            icon
            aria-label="Fit graph"
            onClick={() => { setControls({ zoom: 1 }); setPan({ x: 0, y: 0 }); setMoved({}); }}
          >
            <Maximize2 size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
