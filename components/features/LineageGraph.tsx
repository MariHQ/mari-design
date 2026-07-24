import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, Maximize2, Move } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Chip } from "../data-display/Chip";
import { Button } from "../actions/Button";
import { Skeleton, SkeletonLine, SkeletonChip } from "../data-display/Skeleton";
import { Truncate, TruncateInline } from "../data-display/Truncate";
import {
  REL, REL_ORDER, NodeGlyph, staleColor, ownerColor, SOURCE_ACCENT, SOURCE_LABELS,
  NODE_CREAM, clamp, useLineageControls, nodePasses, nodeMatchesQuery,
  nodeById,
  type LNode, type LEdge, type Lens, type LayoutMode,
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
  layout?: LayoutMode;
  lens?: Lens;
  /** Initially selected / focal node id. */
  focalId?: string | null;
  /** Show the "Impact of …" trace summary + dim everything outside it. */
  trace?: { originId: string; direction: "down" | "up" } | null;
  /** Hard cap on how many node cards the canvas will draw at once. Past this
   *  the graph keeps the best-connected nodes and says how many it dropped,
   *  rather than painting an unreadable hairball. */
  maxNodes?: number;
  onSelectNode?: (id: string) => void;
  onSelectEdge?: (id: string) => void;
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
  for (const e of edges) {
    const key = dir === "down" ? e.from : e.to;
    const val = dir === "down" ? e.to : e.from;
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
  nodes, edges, layout, lens, focalId = "n1",
  trace: traceProp = null, maxNodes = DEFAULT_MAX_NODES,
  onSelectNode, onSelectEdge, loading = false, className = "",
}: LineageGraphProps) {
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [controls, setControls] = useLineageControls();
  const [sel, setSel] = useState<{ kind: "node" | "edge"; id: string } | null>(
    focalId ? { kind: "node", id: focalId } : null,
  );
  const [hover, setHover] = useState<string | null>(null);
  const [trace, setTrace] = useState(traceProp);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});

  // An explicit prop wins, and is pushed into the shared store so the toolbar
  // and the canvas never disagree about which lens/layout is showing.
  useEffect(() => { if (lens) setControls({ lens }); }, [lens, setControls]);
  useEffect(() => { if (layout) setControls({ layout }); }, [layout, setControls]);
  useEffect(() => { setTrace(traceProp); }, [traceProp]);

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
    if (controls.scope !== "focus" || !focalId) return null;
    const keep = new Set<string>([focalId]);
    for (const e of edges) {
      if (e.from === focalId) keep.add(e.to);
      if (e.to === focalId) keep.add(e.from);
    }
    return keep;
  }, [controls.scope, focalId, edges]);

  const passing = useMemo(
    () => nodes.filter((n) => nodePasses(n, controls) && (!focusSet || focusSet.has(n.id))),
    [nodes, controls, focusSet],
  );

  const closure = useMemo(
    () => (trace ? traceClosure(trace.originId, trace.direction, edges) : null),
    [trace, edges],
  );

  /* The cap: keep the best-connected nodes, and never drop the focal node, the
     trace origin, or anything inside an active trace closure. */
  const visibleNodes = useMemo(() => {
    if (passing.length <= maxNodes) return passing;
    const deg = degreeMap(edges);
    const keep = [...passing].sort((a, b) => {
      const pin = (n: LNode) => (n.id === focalId || n.id === trace?.originId ? 1 : 0) + (closure?.has(n.id) ? 1 : 0);
      return pin(b) - pin(a) || (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0) || a.id.localeCompare(b.id);
    }).slice(0, maxNodes);
    const kept = new Set(keep.map((n) => n.id));
    // Restore the authored order so the layout is not reshuffled by ranking.
    return passing.filter((n) => kept.has(n.id));
  }, [passing, maxNodes, edges, focalId, trace?.originId, closure]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter((e) =>
      visibleIds.has(e.from) && visibleIds.has(e.to) &&
      (!controls.rels || controls.rels.includes(e.rel))),
    [edges, visibleIds, controls.rels],
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

  const endDrag = () => {
    suppressClick.current = Boolean(drag.current?.moved);
    drag.current = null;
  };

  const selectNode = (id: string) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    setSel({ kind: "node", id });
    onSelectNode?.(id);
  };

  const setZoom = (z: number) => setControls({ zoom: clamp(Number(z.toFixed(2)), 0.3, 2.5) });

  if (loading) {
    return (
      <div className={`${card} min-w-[560px] overflow-hidden ${className}`.trim()} aria-hidden="true">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/10 px-3.5 py-2">
          <SkeletonLine w={70} h={10} />
          <SkeletonChip w={96} /><SkeletonChip w={88} /><SkeletonChip w={104} />
          <span className="ml-auto"><SkeletonLine w={64} h={10} /></span>
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

  return (
    <div className={`${card} min-w-[560px] overflow-hidden font-display ${className}`.trim()}>
      {/* legend: color + dash + code, three channels per relation */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/10 px-3.5 py-2">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Relations</span>
        {REL_ORDER.map((k) => {
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
              const dim = dimmed(e.from) || dimmed(e.to);
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
                    strokeWidth={selEdge ? s.width + 1.6 : s.width}
                    strokeDasharray={s.dash}
                    markerEnd="url(#lg-arrow)"
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
          <div className="absolute inset-0">
            {visibleNodes.map((n) => {
              const p = posOf(n);
              const isSel = sel?.kind === "node" && sel.id === n.id;
              const isFocal = focalId === n.id;
              const dim = dimmed(n.id);
              const accent = accentColor(n, effLens);
              const changed = trace?.direction === "up" && closure?.has(n.id) &&
                n.date && byId[trace.originId]?.date && n.date > (byId[trace.originId].date as string);
              const ring = isSel ? "#35549d" : isFocal ? "#c8502e" : null;
              return (
                <button
                  key={n.id}
                  type="button"
                  onPointerDown={(e) => startNode(e, n)}
                  onPointerMove={onMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={() => selectNode(n.id)}
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

        {/* trace summary */}
        {trace && closure && (() => {
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

        {/* filter readout — proves the toolbar reached the canvas */}
        {(hiddenCount > 0 || controls.query.trim()) && (
          <div className="absolute left-3 top-3 z-20 max-w-[260px] truncate rounded-[4px] border border-ink/20 bg-paper/95 px-2.5 py-1.5 font-term text-[11px] text-ink/70 backdrop-blur">
            {hiddenCount > 0 ? `${hiddenCount} node${hiddenCount === 1 ? "" : "s"} filtered out` : "Filtered"}
            {controls.query.trim() && ` · matching “${controls.query.trim()}”`}
          </div>
        )}

        {/* drag hint */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-[4px] border border-ink/15 bg-paper/90 px-2 py-1 font-term text-[10.5px] text-ink/65 backdrop-blur">
          <Move size={12} /> Drag to pan · drag a node to move it · click to open
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
