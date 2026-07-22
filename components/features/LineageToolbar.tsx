import { useMemo, useState } from "react";
import { Search, Minus, Plus, Maximize2, Sparkles, GitFork, Bookmark, ChevronDown } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { btn } from "../actions/buttons";
import { Button } from "../actions/Button";
import { Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../navigation/Menu";
import { Badge } from "../data-display/Badge";
import { Skeleton, SkeletonButton } from "../data-display/Skeleton";
import {
  REL, REL_ORDER, SOURCE_ORDER, SOURCE_LABELS, LENSES, NodeGlyph,
  DEMO_NODES, type LNode, type Lens, type LayoutMode, type RelKey,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage toolbar (feature: lineage-toolbar)

   The graph card's top control bar: a typeahead graph search on the left, the
   filter / lens / layout / views dropdowns and mode toggles, and on the right
   the assert-impact + find-path modes and zoom controls. In the real console
   it's fully controlled by the page; here it holds its own demo state so it
   renders standalone.
   ──────────────────────────────────────────────────────────────────────── */

type SearchResult = { id: string; node: LNode };

function filterLabel(all: number, on: number) {
  return on >= all ? "All" : `${on}/${all}`;
}

export type LineageToolbarProps = {
  nodes?: LNode[];
  /** Render a content-shaped skeleton silhouette instead of the controls. */
  loading?: boolean;
  className?: string;
};

export function LineageToolbar({ nodes = DEMO_NODES, loading = false, className = "" }: LineageToolbarProps) {
  const docs = useMemo(() => nodes.filter((n) => !n.macro), [nodes]);
  const sources = useMemo(() => Array.from(new Set(docs.map((n) => n.source))), [docs]);

  const [query, setQuery] = useState("");
  const [onSources, setOnSources] = useState<Set<string>>(new Set(sources));
  const [onRels, setOnRels] = useState<Set<RelKey>>(new Set(REL_ORDER));
  const [status, setStatus] = useState<"all" | "warnings">("all");
  const [lens, setLens] = useState<Lens>("source");
  const [layout, setLayout] = useState<LayoutMode>("flow");
  const [scope, setScope] = useState<"focus" | "all">("focus");
  const [deriving, setDeriving] = useState(false);
  const [assertOpen, setAssertOpen] = useState(false);
  const [pathMode, setPathMode] = useState(false);
  const [picks, setPicks] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return docs
      .filter((n) =>
        n.title.toLowerCase().includes(q) ||
        (n.owner ?? "").toLowerCase().includes(q) ||
        n.source.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => (b.inbound ?? 0) - (a.inbound ?? 0))
      .slice(0, 7)
      .map((node) => ({ id: node.id, node }));
  }, [query, docs]);

  const derive = () => {
    if (deriving) return;
    setDeriving(true);
    setTimeout(() => setDeriving(false), 1800);
  };

  const pathLabel = !pathMode ? "Find path" : picks < 2 ? "Pick two nodes… (Esc)" : "Exit path";

  const trigger = (label: string) => (
    <button type="button" className={`${btn} h-8`}>
      {label} <ChevronDown size={13} className="text-ink/40" />
    </button>
  );

  if (loading) {
    return (
      <div className={`${card} flex flex-wrap items-center gap-2 p-2 ${className}`.trim()} aria-hidden="true">
        <Skeleton width={236} height={32} rounded="rounded-[4px]" />
        {Array.from({ length: 6 }).map((_, i) => <SkeletonButton key={i} w={90} />)}
        <span className="ml-auto"><Skeleton width={150} height={32} rounded="rounded-[4px]" /></span>
      </div>
    );
  }

  return (
    <div className={`${card} flex flex-wrap items-center gap-2 p-2 font-display ${className}`.trim()}>
      {/* left group */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* search */}
        <div className="relative">
          <div className="flex h-8 w-[236px] items-center gap-2 rounded-[4px] border border-ink/20 bg-paper px-2.5 focus-within:border-biscay-2/50 focus-within:ring-1 focus-within:ring-biscay-2/40">
            <Search size={14} className="shrink-0 text-ink/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
              placeholder="Search the graph…"
              aria-label="Search the graph"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/40"
            />
          </div>
          {query.trim() && (
            <div className={`${card} absolute left-0 top-9 z-30 w-[320px] max-h-[300px] overflow-y-auto p-1 shadow-lg`}>
              {results.length === 0 ? (
                <div className="px-3 py-3 text-[13px] text-ink/50">No matches in the graph.</div>
              ) : results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
                  className={`flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left hover:bg-flysch ${focusRing}`}
                >
                  <span className="shrink-0 text-ink/70"><NodeGlyph node={r.node} size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{r.node.title}</span>
                    <span className="block truncate font-term text-[11px] text-ink/50">
                      {[r.node.owner, SOURCE_LABELS[r.node.source] ?? r.node.source, r.node.date].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-term text-[11px] text-ink/45">{r.node.inbound ?? 0}↩</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* sources */}
        <Menu align="start" trigger={trigger(`Sources ${filterLabel(sources.length, onSources.size)}`)}>
          {sources.map((s) => (
            <MenuCheckboxItem
              key={s}
              checked={onSources.has(s)}
              onCheckedChange={(c) => setOnSources((prev) => {
                const next = new Set(prev);
                c ? next.add(s) : next.delete(s);
                return next;
              })}
            >
              <span className="flex items-center gap-2">
                <NodeGlyph node={{ source: s }} size={14} /> {SOURCE_LABELS[s] ?? s}
                <span className="ml-auto font-term text-[11px] text-ink/40">{docs.filter((n) => n.source === s).length}</span>
              </span>
            </MenuCheckboxItem>
          ))}
        </Menu>

        {/* relations */}
        <Menu align="start" trigger={trigger(`Relations ${filterLabel(REL_ORDER.length, onRels.size)}`)}>
          {REL_ORDER.map((k) => (
            <MenuCheckboxItem
              key={k}
              checked={onRels.has(k)}
              onCheckedChange={(c) => setOnRels((prev) => {
                const next = new Set(prev);
                c ? next.add(k) : next.delete(k);
                return next;
              })}
            >
              <span className="flex items-center gap-2">
                <svg width={18} height={6} viewBox="0 0 18 6" aria-hidden>
                  <line x1={1} y1={3} x2={17} y2={3} stroke={REL[k].color} strokeWidth={2} strokeLinecap="round" strokeDasharray={REL[k].dash ? "3 3" : undefined} />
                </svg>
                {REL[k].label}
              </span>
            </MenuCheckboxItem>
          ))}
        </Menu>

        {/* status */}
        <Menu align="start" trigger={trigger(`Status ${status === "all" ? "All" : "Warnings"}`)}>
          <MenuRadioGroup value={status} onValueChange={(v) => setStatus(v as "all" | "warnings")}>
            <MenuRadioItem value="all">All</MenuRadioItem>
            <MenuRadioItem value="warnings">Warnings</MenuRadioItem>
          </MenuRadioGroup>
        </Menu>

        {/* lens */}
        <Menu align="start" trigger={trigger(`Lens ${LENSES.find((l) => l.key === lens)?.label}`)}>
          <MenuRadioGroup value={lens} onValueChange={(v) => setLens(v as Lens)}>
            {LENSES.map((l) => <MenuRadioItem key={l.key} value={l.key}>{l.label}</MenuRadioItem>)}
          </MenuRadioGroup>
        </Menu>

        {/* layout */}
        <Menu align="start" trigger={trigger(`Layout ${layout === "flow" ? "Flow" : "Timeline"}`)}>
          <MenuRadioGroup value={layout} onValueChange={(v) => setLayout(v as LayoutMode)}>
            <MenuRadioItem value="flow">Flow</MenuRadioItem>
            <MenuRadioItem value="timeline">Timeline</MenuRadioItem>
          </MenuRadioGroup>
        </Menu>

        {/* scope */}
        <Button
          compact
          onClick={() => setScope((s) => (s === "focus" ? "all" : "focus"))}
          title={scope === "focus" ? "Showing the focal closure — click for everything" : "Showing everything — click to focus"}
        >
          <Maximize2 size={14} /> {scope === "focus" ? "Focus" : "Everything"}
        </Button>

        {/* views */}
        <Menu align="start" trigger={trigger("Views")}>
          <MenuItem icon={<Bookmark size={14} />}>Customer-facing docs</MenuItem>
          <MenuItem icon={<Bookmark size={14} />}>Stale &gt; 45 days</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Plus size={14} />}>Save current view…</MenuItem>
        </Menu>

        {/* derive */}
        <Button compact onClick={derive} disabled={deriving} className={deriving ? "text-clay" : ""}>
          <Sparkles size={14} /> {deriving ? "Mari is reading…" : "Derive links"}
        </Button>
      </div>

      {/* right group */}
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          compact
          onClick={() => setAssertOpen((a) => !a)}
          className={assertOpen ? "border-biscay-2 text-biscay-2" : ""}
        >
          <Sparkles size={14} /> Assert impact
        </Button>
        <Button
          compact
          onClick={() => { setPathMode((p) => !p); setPicks(0); }}
          className={pathMode ? "border-biscay-2 text-biscay-2" : ""}
        >
          <GitFork size={14} /> {pathLabel}
        </Button>

        <div className="ml-1 flex items-center gap-1 rounded-[4px] border border-ink/15 p-0.5">
          <Button icon aria-label="Zoom out" onClick={() => setZoomPct((z) => Math.max(30, z - 20))}><Minus size={15} /></Button>
          <span className="w-10 text-center font-term text-[11px] text-ink/60">{zoomPct}%</span>
          <Button icon aria-label="Zoom in" onClick={() => setZoomPct((z) => Math.min(250, z + 20))}><Plus size={15} /></Button>
          <Button icon aria-label="Fit graph" onClick={() => setZoomPct(100)}><Maximize2 size={15} /></Button>
        </div>
      </div>

      {/* path-mode hint badge — surfaces the pick state in a static gallery */}
      {pathMode && (
        <div className="w-full">
          <Badge tone="info" label={`Path mode · ${picks}/2 picked`} />
          <button type="button" className="ml-2 font-term text-[11px] text-ink/45 underline" onClick={() => setPicks((p) => Math.min(2, p + 1))}>
            simulate pick
          </button>
        </div>
      )}
    </div>
  );
}
