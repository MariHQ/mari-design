import { useEffect, useMemo, useState, forwardRef, type ButtonHTMLAttributes } from "react";
import type { ReactNode } from "react";
import { Search, Minus, Plus, Maximize2, Sparkles, GitFork, Bookmark, ChevronDown, X } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../navigation/Menu";
import { Badge } from "../data-display/Badge";
import { Input } from "../forms/Input";
import { FieldError } from "../feedback/ErrorMessage";
import { Skeleton, SkeletonButton } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { TruncateInline } from "../data-display/Truncate";
import {
  REL, REL_ORDER, SOURCE_LABELS, LENSES, STATUS_FILTERS, CONTROL_ACCENT, NodeGlyph,
  useLineageControls, clamp, nodeById, tracePath,
  type GraphView, type LEdge, type LineageControlState, type LNode, type Lens,
  type LayoutMode, type RelKey, type StatusFilter,
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

/** Source rows a menu shows before it becomes a bounded scroll region. */
const SOURCE_MENU_ROWS = 9;

/** Which control keys a saved view restores. `path` is a live pick on the
    canvas and `asOf` belongs to the scrubber below the graph, which owns its
    own position — writing either back here would be undone on the next
    render, so neither is saved and neither is restored. */
const VIEW_KEYS = ["query", "sources", "rels", "status", "lens", "layout", "scope", "zoom"] as const;

/** A saved view's state is JSON the server round-trips verbatim, so by the
    time it comes back it may be anything. Read only the control keys, and
    report a state that will not parse rather than half-applying it. */
function parseViewState(state: string): Partial<LineageControlState> | null {
  try {
    const raw: unknown = JSON.parse(state);
    if (!raw || typeof raw !== "object") return null;
    const src = raw as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of VIEW_KEYS) if (k in src) out[k] = src[k];
    return out as Partial<LineageControlState>;
  } catch {
    return null;
  }
}

/** Only the keys a view restores are written, so a saved view never carries a
    stale as-of or a half-finished path pick. */
const viewStateOf = (c: LineageControlState): string =>
  JSON.stringify(Object.fromEntries(VIEW_KEYS.map((k) => [k, c[k]])));

export type LineageToolbarProps = {
  /** The graph the source/owner filters are built from. */
  nodes: LNode[];
  /** The same graph's links. "Find path" resolves against these, so a toolbar
      rendered without them can arm path mode but has nothing to route over. */
  edges?: LEdge[];
  /** Ask Mari to propose new edges across the corpus. Long-running: the button
      says it is reading. May throw; the toolbar shows the message. Return how
      many links were proposed and the toolbar reports that number; return
      nothing and it says only that the run finished, because a count it was
      not given is a count it must not print. Omitted entirely = no Derive
      links button, since there is nothing for it to run (§2). */
  onDeriveLinks?: () => void | number | Promise<void | number>;
  /** Persist the current filter/view state under a name. Omitted = the Views
      menu offers no "Save current view", because nothing would receive it. */
  onSaveView?: (args: { name: string; state: string }) => void | Promise<void>;
  /** The views already saved for this workspace, listed in the Views menu.
      Without them "Save view" wrote into a void: nothing ever read a saved
      view back. */
  views?: GraphView[];
  /** Render a content-shaped skeleton silhouette instead of the controls. */
  loading?: boolean;
  className?: string;
};

/** One filter/view control: accent bar, "Label:", then the live selection.

    forwardRef is required, not stylistic: this is used as a Radix menu
    trigger, and Radix passes a ref to position the popup and to return focus
    on close. A plain function component drops that ref with a console warning
    and the menu loses its anchor. */
const ControlTrigger = forwardRef<
  HTMLButtonElement,
  { accent: string; label: string; value: string } & ButtonHTMLAttributes<HTMLButtonElement>
>(function ControlTrigger({ accent, label, value, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`inline-flex h-8 items-center gap-2 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-2.5 text-[13px] text-ink/85 transition-colors hover:border-ink/45 active:bg-ink/[0.05] data-[state=open]:border-ink/45 data-[state=open]:bg-flysch ${focusRing} ${className}`.trim()}
    >
      <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: accent }} aria-hidden />
      <span className="pl-0.5 shrink-0 text-ink/70">{label}:</span>
      <span className="max-w-[96px] truncate font-medium" style={{ color: accent }} title={value}>{value}</span>
      <ChevronDown size={13} className="text-ink/65" />
    </button>
  );
});

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

export function LineageToolbar({
  nodes, edges = [], onDeriveLinks, onSaveView, views, loading = false, className = "",
}: LineageToolbarProps) {
  const docs = useMemo(() => nodes.filter((n) => !n.macro), [nodes]);
  const sources = useMemo(() => Array.from(new Set(docs.map((n) => n.source))), [docs]);

  const [controls, setControls] = useLineageControls();
  const [view, setView] = useState<string>("All documents");
  const [deriving, setDeriving] = useState(false);
  /** What the last derive run reported. `null` = it has not been run. A number
      only ever comes from the handler; the run itself never counts anything. */
  const [derived, setDerived] = useState<{ count: number | null } | null>(null);
  const [assertOpen, setAssertOpen] = useState(false);
  const [deriveErr, setDeriveErr] = useState<string | null>(null);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [locallySaved, setLocallySaved] = useState<GraphView[]>([]);

  /* The workspace's saved views, plus anything saved in this session that the
     server has not handed back yet. Same name = one row, newest wins. */
  const savedViews = useMemo(() => {
    const byName = new Map<string, GraphView>();
    for (const v of [...(views ?? []), ...locallySaved]) byName.set(v.name, v);
    return [...byName.values()];
  }, [views, locallySaved]);

  const onSources = controls.sources ?? sources;
  const onRels = controls.rels ?? REL_ORDER;

  /* Find path. The picks live in the shared control store because the picking
     happens on the CANVAS: this button used to keep a private counter and
     offered a "simulate pick" link beside it, so the feature could never do
     anything to the graph however many nodes you clicked. Now the button arms
     the mode, the canvas records the two picks, and this row reports what the
     canvas resolved. */
  const picked = controls.path;
  const path = useMemo(() => tracePath(picked, edges), [picked, edges]);
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const titleOf = (id: string) => byId[id]?.title ?? id;

  // Esc leaves path mode, which is the exit the button's own label promises.
  useEffect(() => {
    if (!picked) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setControls({ path: null }); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [picked, setControls]);

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

  /* Mari reads the whole corpus to propose edges, so the button has to say it
     is working rather than sit there looking clicked.

     It reports only what the handler hands back. This used to wait 1600ms with
     nothing wired and then announce "3 links proposed" — three links that no
     one had proposed, printed by a button that had done nothing at all. */
  const derive = async () => {
    if (deriving || !onDeriveLinks) return;
    setDeriving(true);
    setDeriveErr(null);
    try {
      const count = await onDeriveLinks();
      setDerived({ count: typeof count === "number" ? count : null });
    } catch (err) {
      setDeriveErr(err instanceof Error ? err.message : "Mari could not read the graph.");
    } finally {
      setDeriving(false);
    }
  };

  /* Saving a view needs a name, so the menu item opens a name field rather
     than silently writing "Saved view" over the last one. */
  const saveView = async (name: string) => {
    if (!onSaveView) return;
    setSaving(true);
    setSaveErr(null);
    const state = viewStateOf(controls);
    try {
      await onSaveView({ name, state });
      /* A saved view has to appear in the menu it was saved from, before any
         refetch brings it back from the server. Negative ids mark the rows
         this session added; the server's copy replaces them by name. */
      setLocallySaved((rows) => [...rows.filter((r) => r.name !== name), { id: -(rows.length + 1), name, state }]);
      setSavedAs(name);
      setSaveName(null);
      setView(name);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "That view could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  /* Applying one. Without this the Views menu listed four hardcoded presets
     and nothing else, so "Save current view" wrote somewhere no control ever
     read back. */
  const applySaved = (v: GraphView) => {
    const patch = parseViewState(v.state);
    if (!patch) {
      setSaveErr(`“${v.name}” could not be read, so nothing was applied.`);
      return;
    }
    setSaveErr(null);
    applyView(v.name, patch);
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

  const pathLabel = !picked
    ? "Find path"
    : picked.length === 0
      ? "Pick two nodes (Esc)"
      : picked.length === 1
        ? "Pick one more (Esc)"
        : "Exit path";

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
          {/* A workspace with 30 connected sources must not run a menu off the
              bottom of the screen: the list is bounded and scrolls (§20). */}
          <Scrollable axis="y" className={sources.length > SOURCE_MENU_ROWS ? "max-h-[264px] w-[228px]" : ""}>
            {sources.map((s) => (
              <MenuCheckboxItem key={s} checked={onSources.includes(s)} onCheckedChange={(c) => toggleSource(s, c)}>
                <span className="flex min-w-0 items-center gap-2">
                  <NodeGlyph node={{ source: s }} size={14} />
                  <TruncateInline>{SOURCE_LABELS[s] ?? s}</TruncateInline>
                  <span className="ml-auto shrink-0 font-term text-[11px] text-ink/65">{docs.filter((n) => n.source === s).length}</span>
                </span>
              </MenuCheckboxItem>
            ))}
          </Scrollable>
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
          {/* !h-7/!w-7: the icon size prop is w-9 h-9, which outranked the
              plain h-6 override and poked 4px out of this 32px group, reading
              as a stray button behind the control. 28px keeps every control
              in the filter row inside the shared 32px height (§13). */}
          <Button compact icon aria-label="Zoom out" className="!h-7 !w-7" onClick={() => setZoom(controls.zoom - 0.2)}><Minus size={14} /></Button>
          <Button compact icon aria-label="Zoom in" className="!h-7 !w-7" onClick={() => setZoom(controls.zoom + 0.2)}><Plus size={14} /></Button>
          <Button compact icon aria-label="Fit graph" className="!h-7 !w-7" onClick={() => setControls({ zoom: 1 })}><Maximize2 size={14} /></Button>
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
          {savedViews.length > 0 && (
            <>
              <MenuSeparator />
              {/* Saved views, read back from the same store "Save view" writes
                  to. A workspace with dozens of them scrolls (§20). */}
              <Scrollable axis="y" className={savedViews.length > SOURCE_MENU_ROWS ? "max-h-[264px] w-[228px]" : ""}>
                {savedViews.map((v) => (
                  <MenuItem key={v.id} icon={<Bookmark size={14} />} onSelect={() => applySaved(v)}>
                    <TruncateInline>{v.name}</TruncateInline>
                  </MenuItem>
                ))}
              </Scrollable>
            </>
          )}
          {/* Offered only when something can receive it (§2). */}
          {onSaveView && (
            <>
              <MenuSeparator />
              <MenuItem icon={<Plus size={14} />} onSelect={() => { setSaveName(view === "Custom" ? "" : view); setSaveErr(null); }}>
                Save current view
              </MenuItem>
            </>
          )}
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
          onClick={() => setControls({ path: picked ? null : [] })}
          className={picked ? "border-biscay-2 bg-biscay-2/[0.10] text-biscay-2" : ""}
        >
          <GitFork size={14} /> {pathLabel}
        </Button>
        {/* No handler, no button: there is nothing for it to run, and a button
            that only pretends to run is worse than one that is not there. */}
        {onDeriveLinks && (
          <Button onClick={() => void derive()} disabled={deriving}>
            <Sparkles size={14} /> {deriving ? "Mari is reading" : "Derive links"}
          </Button>
        )}
        {derived && !deriving && (
          <Badge
            tone="ok"
            label={derived.count === null
              ? "Mari finished reading the graph"
              : `${derived.count} link${derived.count === 1 ? "" : "s"} proposed`}
          />
        )}
        {assertOpen && <Badge tone="info" label="Impact analysis open" />}
        {savedAs && !saveName && <Badge tone="ok" label={`Saved as ${savedAs}`} />}
      </Row>

      {(deriveErr || saveErr) && (
        <div className="pl-[66px]"><FieldError>{deriveErr ?? saveErr}</FieldError></div>
      )}

      {/* Name-and-save row for "Save current view". */}
      {saveName !== null && (
        <Row label="Save" divide>
          <Input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && saveName.trim()) void saveView(saveName.trim()); }}
            placeholder="Name this view"
            aria-label="Name this view"
            className="w-[220px]"
          />
          {/* Confirm action bottom left of the row, cancel to its right (§2). */}
          <Button variant="primary" disabled={saving || !saveName.trim()} onClick={() => void saveView(saveName.trim())}>
            {saving ? "Saving…" : "Save view"}
          </Button>
          <Button onClick={() => { setSaveName(null); setSaveErr(null); }}>Cancel</Button>
        </Row>
      )}

      {/* path-mode pick state: what the canvas has recorded, and what routing
          the two picks resolved to. */}
      {picked && (
        <div className="flex flex-wrap items-center gap-2 pl-[66px]">
          <Badge tone="info" label={`Path mode · ${picked.length}/2 picked`} />
          {picked.length < 2 ? (
            <span className="min-w-0 font-term text-[11px] text-ink/65">
              {picked.length === 0
                ? "Click a node on the canvas to start."
                : `From “${titleOf(picked[0])}”. Click the other end.`}
            </span>
          ) : path ? (
            <>
              <Badge tone="ok" label={`${path.hops} hop${path.hops === 1 ? "" : "s"}`} />
              <TruncateInline className="font-term text-[11px] text-ink/70">
                {path.ids.map(titleOf).join(" → ")}
              </TruncateInline>
            </>
          ) : (
            <span className="min-w-0 font-term text-[11px] text-ink/70">
              No route links “{titleOf(picked[0])}” to “{titleOf(picked[1])}”.
            </span>
          )}
          {picked.length > 0 && (
            <Button compact onClick={() => setControls({ path: [] })}>Start over</Button>
          )}
        </div>
      )}
    </div>
  );
}
