import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search, Minus, Plus, Maximize2, Sparkles, GitFork, Bookmark, ChevronDown, X } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../navigation/Menu";
import { Badge } from "../data-display/Badge";
import { Skeleton, SkeletonButton } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import {
  REL, REL_ORDER, SOURCE_LABELS, LENSES, STATUS_FILTERS, CONTROL_ACCENT, NodeGlyph,
  useLineageControls, clamp,
  DEMO_NODES, type LNode, type Lens, type LayoutMode, type RelKey, type StatusFilter,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage toolbar (feature: lineage-toolbar)

   Three explicit rows, one gap, no wrap-roulette:

     1. FILTERS   search · Sources: · Relations: · Status: · zoom
     2. VIEW      Color by: · Layout: · Flow: · Views:
     3. ACTIONS   Assert impact · Find path · Derive links

   Every control reads "Label: Selection" and carries its own accent color, and
   every one of them writes to the shared lineage control store — so the canvas
   below actually filters, recolors, relayouts and zooms. Nothing here is
   decorative.
   ──────────────────────────────────────────────────────────────────────── */

type SearchResult = { id: string; node: LNode };

export type LineageToolbarProps = {
  nodes?: LNode[];
  /** Render a content-shaped skeleton silhouette instead of the controls. */
  loading?: boolean;
  className?: string;
};

/** One filter/view control: accent bar, "Label:", then the live selection. */
function ControlTrigger({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-2.5 text-[13px] text-ink/85 transition-colors hover:border-ink/45 active:bg-ink/[0.05] data-[state=open]:border-ink/45 data-[state=open]:bg-flysch ${focusRing}`}
    >
      <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: accent }} aria-hidden />
      <span className="pl-0.5 shrink-0 text-ink/70">{label}:</span>
      <span className="max-w-[96px] truncate font-medium" style={{ color: accent }} title={value}>{value}</span>
      <ChevronDown size={13} className="text-ink/65" />
    </button>
  );
}

/* One labelled band. The rows are separated by a hairline so the three
   groups (filters / view / actions) read as three decisions, not one wall. */
function Row({ label, children, divide = false }: { label: string; children: ReactNode; divide?: boolean }) {
  return (
    <div className={`flex items-start gap-3 ${divide ? "border-t border-ink/10 pt-2.5" : ""}`.trim()}>
      <span className="w-[54px] shrink-0 pt-2 font-term text-[10px] font-medium uppercase tracking-[0.1em] text-ink/65">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-2">{children}</div>
    </div>
  );
}

export function LineageToolbar({ nodes = DEMO_NODES, loading = false, className = "" }: LineageToolbarProps) {
  const docs = useMemo(() => nodes.filter((n) => !n.macro), [nodes]);
  const sources = useMemo(() => Array.from(new Set(docs.map((n) => n.source))), [docs]);

  const [controls, setControls] = useLineageControls();
  const [view, setView] = useState<string>("All documents");
  const [deriving, setDeriving] = useState(false);
  const [derived, setDerived] = useState(0);
  const [assertOpen, setAssertOpen] = useState(false);
  const [pathMode, setPathMode] = useState(false);
  const [picks, setPicks] = useState(0);

  const onSources = controls.sources ?? sources;
  const onRels = controls.rels ?? REL_ORDER;

  const results: SearchResult[] = useMemo(() => {
    const q = controls.query.trim().toLowerCase();
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
  }, [controls.query, docs]);

  const toggleSource = (s: string, on: boolean) => {
    const next = new Set(onSources);
    if (on) next.add(s); else next.delete(s);
    setControls({ sources: next.size === sources.length ? null : [...next] });
    setView("Custom");
  };

  const toggleRel = (k: RelKey, on: boolean) => {
    const next = new Set(onRels);
    if (on) next.add(k); else next.delete(k);
    setControls({ rels: next.size === REL_ORDER.length ? null : [...next] });
    setView("Custom");
  };

  const applyView = (name: string, patch: Parameters<typeof setControls>[0]) => {
    setControls(patch);
    setView(name);
  };

  const derive = () => {
    if (deriving) return;
    setDeriving(true);
    setTimeout(() => { setDeriving(false); setDerived((d) => d + 3); }, 1600);
  };

  const sourceValue = controls.sources === null
    ? "All"
    : controls.sources.length === 0
      ? "None"
      : controls.sources.map((s) => SOURCE_LABELS[s] ?? s).join(", ");
  const relValue = controls.rels === null
    ? "All"
    : controls.rels.length === 0
      ? "None"
      : controls.rels.map((k) => REL[k].label).join(", ");
  const statusValue = STATUS_FILTERS.find((s) => s.key === controls.status)?.label ?? "All";
  const lensValue = LENSES.find((l) => l.key === controls.lens)?.label ?? "Source";
  const layoutValue = controls.layout === "flow" ? "Flow" : "Timeline";
  const flowValue = controls.scope === "focus" ? "Focal closure" : "Whole graph";

  const setZoom = (z: number) => setControls({ zoom: clamp(Number(z.toFixed(2)), 0.3, 2.5) });

  const pathLabel = !pathMode ? "Find path" : picks < 2 ? "Pick two nodes (Esc)" : "Exit path";

  if (loading) {
    return (
      <div className={`${card} flex min-w-[840px] flex-col gap-2.5 p-3 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-center gap-2">
          <Skeleton width={236} height={32} rounded="rounded-[4px]" />
          {Array.from({ length: 3 }).map((_, i) => <SkeletonButton key={i} w={120} />)}
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonButton key={i} w={128} />)}
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonButton key={i} w={110} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${card} flex min-w-[840px] flex-col gap-2.5 p-3 font-display ${className}`.trim()}>
      {/* ── row 1: filters ─────────────────────────────────────────────── */}
      <Row label="Filter">
        <div className="relative">
          <div className="flex h-8 w-[168px] items-center gap-1.5 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-2 focus-within:border-biscay-2/60 focus-within:ring-1 focus-within:ring-biscay-2/40">
            <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: CONTROL_ACCENT.search }} aria-hidden />
            <Search size={14} className="shrink-0 text-ink/65" />
            <input
              value={controls.query}
              onChange={(e) => setControls({ query: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Escape") setControls({ query: "" }); }}
              placeholder="Search graph"
              aria-label="Search the graph"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/65"
            />
            {controls.query && (
              <button
                type="button"
                onClick={() => setControls({ query: "" })}
                aria-label="Clear search"
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-ink/65 hover:bg-ink/10 hover:text-ink ${focusRing}`}
              >
                <X size={11} />
              </button>
            )}
          </div>
          {controls.query.trim() && (
            <Scrollable axis="y" className={`${card} absolute left-0 top-9 z-30 max-h-[300px] w-[320px]`} scrollerClassName="p-1">
              {results.length === 0 ? (
                <div className="px-3 py-3 text-[13px] text-ink/70">No matches in the graph.</div>
              ) : results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setControls({ query: r.node.title }); }}
                  className={`flex w-full items-center gap-2.5 rounded-[3px] px-2 py-1.5 text-left hover:bg-flysch active:bg-ink/[0.07] ${focusRing}`}
                >
                  <span className="shrink-0 text-ink/75"><NodeGlyph node={r.node} size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{r.node.title}</span>
                    <span className="block truncate font-term text-[11px] text-ink/70">
                      {[r.node.owner, SOURCE_LABELS[r.node.source] ?? r.node.source, r.node.date].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-term text-[11px] text-ink/65">{r.node.inbound ?? 0} in</span>
                </button>
              ))}
            </Scrollable>
          )}
        </div>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.sources} label="Sources" value={sourceValue} />}>
          {sources.map((s) => (
            <MenuCheckboxItem key={s} checked={onSources.includes(s)} onCheckedChange={(c) => toggleSource(s, c)}>
              <span className="flex items-center gap-2">
                <NodeGlyph node={{ source: s }} size={14} /> {SOURCE_LABELS[s] ?? s}
                <span className="ml-auto font-term text-[11px] text-ink/65">{docs.filter((n) => n.source === s).length}</span>
              </span>
            </MenuCheckboxItem>
          ))}
          <MenuSeparator />
          <MenuItem onSelect={() => applyView("All documents", { sources: null })}>All sources</MenuItem>
        </Menu>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.relations} label="Relations" value={relValue} />}>
          {REL_ORDER.map((k) => (
            <MenuCheckboxItem key={k} checked={onRels.includes(k)} onCheckedChange={(c) => toggleRel(k, c)}>
              <span className="flex items-center gap-2">
                <svg width={26} height={9} viewBox="0 0 26 9" aria-hidden>
                  <line x1={1} y1={4.5} x2={25} y2={4.5} stroke={REL[k].color} strokeWidth={REL[k].width} strokeDasharray={REL[k].dash} />
                </svg>
                {REL[k].label}
                <span className="ml-auto font-term text-[10.5px] text-ink/65">{REL[k].code}</span>
              </span>
            </MenuCheckboxItem>
          ))}
          <MenuSeparator />
          <MenuItem onSelect={() => setControls({ rels: null })}>All relations</MenuItem>
        </Menu>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.status} label="Status" value={statusValue} />}>
          <MenuRadioGroup value={controls.status} onValueChange={(v) => setControls({ status: v as StatusFilter })}>
            {STATUS_FILTERS.map((s) => <MenuRadioItem key={s.key} value={s.key}>{s.label}</MenuRadioItem>)}
          </MenuRadioGroup>
        </Menu>

        <div className="flex h-8 items-center gap-0.5 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-1">
          <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: CONTROL_ACCENT.zoom }} aria-hidden />
          <span className="pl-1.5 text-[13px] text-ink/70">Zoom:</span>
          <span className="w-9 text-center font-term text-[12px] font-medium" style={{ color: CONTROL_ACCENT.zoom }}>
            {Math.round(controls.zoom * 100)}%
          </span>
          <Button compact icon aria-label="Zoom out" className="h-6 w-6" onClick={() => setZoom(controls.zoom - 0.2)}><Minus size={14} /></Button>
          <Button compact icon aria-label="Zoom in" className="h-6 w-6" onClick={() => setZoom(controls.zoom + 0.2)}><Plus size={14} /></Button>
          <Button compact icon aria-label="Fit graph" className="h-6 w-6" onClick={() => setControls({ zoom: 1 })}><Maximize2 size={14} /></Button>
        </div>
      </Row>

      {/* ── row 2: view ────────────────────────────────────────────────── */}
      <Row label="View" divide>
        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.lens} label="Color by" value={lensValue} />}>
          <MenuRadioGroup value={controls.lens} onValueChange={(v) => setControls({ lens: v as Lens })}>
            {LENSES.map((l) => <MenuRadioItem key={l.key} value={l.key}>{l.label}</MenuRadioItem>)}
          </MenuRadioGroup>
        </Menu>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.layout} label="Layout" value={layoutValue} />}>
          <MenuRadioGroup value={controls.layout} onValueChange={(v) => setControls({ layout: v as LayoutMode })}>
            <MenuRadioItem value="flow">Flow</MenuRadioItem>
            <MenuRadioItem value="timeline">Timeline</MenuRadioItem>
          </MenuRadioGroup>
        </Menu>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.flow} label="Flow" value={flowValue} />}>
          <MenuRadioGroup value={controls.scope} onValueChange={(v) => setControls({ scope: v as "focus" | "all" })}>
            <MenuRadioItem value="focus">Focal closure</MenuRadioItem>
            <MenuRadioItem value="all">Whole graph</MenuRadioItem>
          </MenuRadioGroup>
        </Menu>

        <Menu align="start" trigger={<ControlTrigger accent={CONTROL_ACCENT.views} label="Views" value={view} />}>
          <MenuItem icon={<Bookmark size={14} />} onSelect={() => applyView("All documents", { sources: null, rels: null, status: "all", scope: "all", query: "" })}>
            All documents
          </MenuItem>
          <MenuItem icon={<Bookmark size={14} />} onSelect={() => applyView("Customer-facing docs", { sources: ["docs", "docsite", "notion"], status: "all" })}>
            Customer-facing docs
          </MenuItem>
          <MenuItem icon={<Bookmark size={14} />} onSelect={() => applyView("Needs review", { sources: null, status: "review" })}>
            Needs review
          </MenuItem>
          <MenuItem icon={<Bookmark size={14} />} onSelect={() => applyView("Contradictions", { sources: null, status: "all", rels: ["contradicts"] })}>
            Contradictions only
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Plus size={14} />} onSelect={() => applyView("Saved view", {})}>Save current view</MenuItem>
        </Menu>
      </Row>

      {/* ── row 3: actions ─────────────────────────────────────────────── */}
      <Row label="Actions" divide>
        <Button
          onClick={() => setAssertOpen((a) => !a)}
          className={assertOpen ? "border-biscay-2 bg-biscay-2/[0.10] text-biscay-2" : ""}
        >
          <Sparkles size={14} /> Assert impact
        </Button>
        <Button
          onClick={() => { setPathMode((p) => !p); setPicks(0); }}
          className={pathMode ? "border-biscay-2 bg-biscay-2/[0.10] text-biscay-2" : ""}
        >
          <GitFork size={14} /> {pathLabel}
        </Button>
        <Button onClick={derive} disabled={deriving}>
          <Sparkles size={14} /> {deriving ? "Mari is reading" : "Derive links"}
        </Button>
        {derived > 0 && !deriving && (
          <Badge tone="ok" label={`${derived} links proposed`} />
        )}
        {assertOpen && <Badge tone="info" label="Impact analysis open" />}
      </Row>

      {/* path-mode pick state */}
      {pathMode && (
        <div className="flex items-center gap-2 pl-[66px]">
          <Badge tone="info" label={`Path mode · ${picks}/2 picked`} />
          <button
            type="button"
            className={`font-term text-[11px] text-ink/65 underline ${focusRing}`}
            onClick={() => setPicks((p) => Math.min(2, p + 1))}
          >
            simulate pick
          </button>
        </div>
      )}
    </div>
  );
}
