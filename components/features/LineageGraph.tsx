import { useMemo, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Chip } from "../data-display/Chip";
import { Button } from "../actions/Button";
import {
  REL, NodeGlyph, staleColor, ownerColor, SOURCE_ACCENT,
  DEMO_NODES, DEMO_EDGES, nodeById,
  type LNode, type LEdge, type Lens, type LayoutMode,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage graph canvas (feature: lineage-graph)

   The central instrument of the lineage page: a directed graph of document
   nodes + typed edges. The real console renders this with Cytoscape.js +
   cytoscape-dagre; that engine can't be pulled in here, so this is a faithful
   STATIC representation — inline SVG edges + absolutely-positioned HTML node
   cards over a faint paper grid — that reproduces the design (lens recoloring,
   warn/focal/selection states, roll-up macro node, hover tooltip, trace
   summary, zoom readout) without the layout engine.

   Positions come baked into the demo data (0..1 normalized). A fixed aspect
   box keeps SVG + HTML layers in the same coordinate space with no distortion.
   ──────────────────────────────────────────────────────────────────────── */

const VB_W = 1000;
const VB_H = 560;

export type LineageGraphProps = {
  nodes?: LNode[];
  edges?: LEdge[];
  layout?: LayoutMode;
  lens?: Lens;
  /** Initially selected / focal node id. */
  focalId?: string | null;
  /** Show the "Impact of …" trace summary + dim everything outside it. */
  trace?: { originId: string; direction: "down" | "up" } | null;
  onSelectNode?: (id: string) => void;
  onSelectEdge?: (id: string) => void;
  className?: string;
};

/** Lens → ring color for a node. */
function ringColor(node: LNode, lens: Lens): string {
  if (lens === "source") return SOURCE_ACCENT[node.source] ?? "#cfc4a8";
  if (lens === "stale") return staleColor(node.staleDays ?? 0);
  if (lens === "owner") return node.owner ? ownerColor(node.owner) : "#8a7f68";
  // health
  if (node.warn || node.orphan) return "#c0392b";
  return "#43663c";
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

export function LineageGraph({
  nodes = DEMO_NODES, edges = DEMO_EDGES, layout = "flow", lens = "source",
  focalId = "n1", trace: traceProp = null, onSelectNode, onSelectEdge, className = "",
}: LineageGraphProps) {
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [sel, setSel] = useState<{ kind: "node" | "edge"; id: string } | null>(
    focalId ? { kind: "node", id: focalId } : null,
  );
  const [hover, setHover] = useState<string | null>(null);
  const [trace, setTrace] = useState(traceProp);
  const [zoomPct, setZoomPct] = useState(100);

  const closure = useMemo(
    () => (trace ? traceClosure(trace.originId, trace.direction, edges) : null),
    [trace, edges],
  );

  const px = (n: LNode) => ({ x: n.x * VB_W, y: n.y * VB_H });
  const dimmed = (id: string) => (closure ? !closure.has(id) : false);

  return (
    <div className={`${card} overflow-hidden font-display ${className}`.trim()}>
      {/* legend / lens strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/10 px-3.5 py-2">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Relations</span>
        {(Object.keys(REL) as (keyof typeof REL)[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-ink/70">
            <svg width={18} height={6} viewBox="0 0 18 6" aria-hidden>
              <line x1={1} y1={3} x2={17} y2={3} stroke={REL[k].color} strokeWidth={2} strokeLinecap="round" strokeDasharray={REL[k].dash ? "3 3" : undefined} />
            </svg>
            {REL[k].label}
          </span>
        ))}
        <span className="ml-auto font-term text-[11px] text-ink/45">Lens: {lens}</span>
      </div>

      {/* canvas */}
      <div className="relative" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
        {/* paper grid */}
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

        {/* edges */}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden>
          {edges.map((e) => {
            const a = byId[e.from], b = byId[e.to];
            if (!a || !b) return null;
            const p1 = px(a), p2 = px(b);
            const agg = e.id.startsWith("ge:") || (e.count ?? 0) > 1;
            const s = REL[e.rel];
            const selEdge = sel?.kind === "edge" && sel.id === e.id;
            const dim = dimmed(e.from) || dimmed(e.to);
            const midX = (p1.x + p2.x) / 2;
            const c1 = `${midX} ${p1.y}`, c2 = `${midX} ${p2.y}`;
            return (
              <g key={e.id} style={{ color: s.color, opacity: dim ? 0.15 : 1 }}>
                <path
                  d={`M ${p1.x} ${p1.y} C ${c1}, ${c2}, ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={selEdge ? 3 : agg ? 2.4 : 1.6}
                  strokeDasharray={e.dashed || s.dash ? "5 5" : undefined}
                  markerEnd="url(#lg-arrow)"
                  vectorEffect="non-scaling-stroke"
                  className={agg ? "" : "cursor-pointer"}
                  onClick={agg ? undefined : () => { setSel({ kind: "edge", id: e.id }); onSelectEdge?.(e.id); }}
                />
                {agg && e.count && e.count > 1 && (
                  <text x={midX} y={(p1.y + p2.y) / 2 - 4} textAnchor="middle" fontSize="11" fill={s.color} className="font-term">
                    {s.label.split(" ")[0]} ×{e.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* nodes */}
        <div className="absolute inset-0">
          {nodes.map((n) => {
            const p = { left: `${n.x * 100}%`, top: `${n.y * 100}%` };
            const isSel = sel?.kind === "node" && sel.id === n.id;
            const isFocal = focalId === n.id;
            const dim = dimmed(n.id);
            const ring = ringColor(n, lens);
            const changed = trace?.direction === "up" && closure?.has(n.id) &&
              n.date && byId[trace.originId]?.date && n.date > (byId[trace.originId].date as string);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => { setSel({ kind: "node", id: n.id }); onSelectNode?.(n.id); }}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
                style={{ ...p, transform: "translate(-50%, -50%)", opacity: dim ? 0.2 : 1 }}
                className={`absolute z-10 flex w-[136px] items-center gap-2 rounded-[5px] border bg-[#fdfaf2] px-2 py-1.5 text-left transition-shadow ${focusRing} ${
                  n.macro ? "border-2 shadow-[3px_3px_0_0_rgba(16,38,59,0.08)]" : "border"
                } ${isSel || isFocal ? "ring-2 ring-offset-1" : ""}`}
              >
                {/* lens ring accent */}
                <span
                  className="absolute inset-x-0 top-0 h-[3px] rounded-t-[4px]"
                  style={{ backgroundColor: ring }}
                  aria-hidden
                />
                <span className="shrink-0 text-ink/70"><NodeGlyph node={n} size={17} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-medium leading-tight text-ink">{n.title}</span>
                  <span className="block truncate font-term text-[9.5px] leading-tight text-ink/45">
                    {n.macro ? n.repo : n.owner}
                  </span>
                </span>
                {n.warn && !n.macro && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-paper bg-[#c8502e]" aria-hidden />}
                {changed && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border border-paper bg-[#c0392b]" aria-hidden />}
                <span
                  className="pointer-events-none absolute inset-0 rounded-[4px]"
                  style={isSel || isFocal ? { boxShadow: `0 0 0 2px ${isFocal ? "#c8502e" : "#35549d"}` } : undefined}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {/* hover tooltip */}
        {hover && byId[hover] && (() => {
          const n = byId[hover];
          return (
            <div
              className="pointer-events-none absolute z-20 max-w-[240px] -translate-x-1/2 rounded-[4px] border border-ink/15 bg-paper px-2.5 py-1.5 shadow-lg"
              style={{ left: `${n.x * 100}%`, top: `calc(${n.y * 100}% - 46px)` }}
            >
              <div className="text-[12px] font-semibold text-ink">{n.title}</div>
              <div className="font-term text-[10.5px] text-ink/55">
                {[n.meta, typeof n.staleDays === "number" ? `${n.staleDays}d stale` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
          );
        })()}

        {/* trace summary */}
        {trace && closure && (() => {
          const origin = byId[trace.originId];
          const groups = new Map<string, number>();
          for (const e of edges) {
            const inClosure = closure.has(e.from) && closure.has(e.to);
            if (inClosure) groups.set(e.rel, (groups.get(e.rel) ?? 0) + 1);
          }
          return (
            <div className="absolute bottom-3 left-3 z-20 max-w-[300px] rounded-[5px] border border-ink/15 bg-paper/95 p-3 shadow-lg backdrop-blur">
              <div className="text-[12.5px] font-semibold text-ink">
                {trace.direction === "down" ? "Impact of" : "Provenance of"} {origin?.title}
              </div>
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

        {/* zoom controls */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-[5px] border border-ink/15 bg-paper/95 p-1 backdrop-blur">
          <Button icon aria-label="Zoom out" onClick={() => setZoomPct((z) => Math.max(30, z - 20))}><Minus size={15} /></Button>
          <span className="w-10 text-center font-term text-[11px] text-ink/60">{zoomPct}%</span>
          <Button icon aria-label="Zoom in" onClick={() => setZoomPct((z) => Math.min(250, z + 20))}><Plus size={15} /></Button>
          <Button icon aria-label="Fit" onClick={() => setZoomPct(100)}><Maximize2 size={15} /></Button>
        </div>
      </div>
    </div>
  );
}
