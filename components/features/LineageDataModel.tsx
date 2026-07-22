import type { ReactNode } from "react";
import { GithubMark, SourceMark } from "../icons";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Chip } from "../data-display/Chip";
import { SectionLabel } from "../forms/SectionLabel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage data model (feature: lineage-data-model)

   Pure, React-light module: the type definitions, relation/source palettes,
   roll-up constants, severity maps, small helpers, and the baked-in demo
   graph that the lineage graph canvas + drawers + toolbar + scrubber all
   import. Also exports a few shared presentational helpers (glyph, edge
   swatch, connection row, drawer shell) that recur across every lineage
   drawer, plus a `LineageDataModel` legend component so the gallery has
   something to render for the otherwise UI-less model spec.

   Faithful to web/src/pages/lineage/model.ts + glyphs.tsx — retuned from the
   deprecated editorial-notebook (cream/serif) palette to console mode.
   ──────────────────────────────────────────────────────────────────────── */

/* ── Types ──────────────────────────────────────────────────────────────── */

export type RelKey = "references" | "discussed" | "derived" | "translates" | "contradicts";
export type Lens = "source" | "stale" | "owner" | "health";
export type LayoutMode = "flow" | "timeline";
export type DocKind = "page" | "commit" | "pr" | "issue" | "answer" | "decision" | "seed";
export type Severity = "update-required" | "review" | "minor";

export type LNode = {
  id: string;
  docId?: number;
  source: string;
  title: string;
  /** "·"-separated pill string, e.g. "PR · merged · 3d ago". */
  meta: string;
  icon: string;
  docKind: DocKind;
  /** roll-up bucket id, "" = ungrouped; e.g. "gh:MariHQ/web:commits". */
  group: string;
  /** 0..1 normalized position (server auto-layout OR pinned). */
  x: number;
  y: number;
  /** ISO yyyy-mm-dd — last update; powers the time axis. */
  date?: string;
  createdDate?: string;
  pinned?: boolean;
  warn?: boolean;
  owner?: string;
  tags?: string[];
  staleDays?: number;
  orphan?: boolean;
  inbound?: number;
  outbound?: number;
  /** roll-up macro node standing in for a whole bucket. */
  macro?: boolean;
  /** members rolled up into a macro node. */
  count?: number;
  repo?: string;
};

export type LEdge = {
  id: string;
  from: string;
  to: string;
  rel: RelKey;
  date?: string;
  llm?: boolean;
  dashed?: boolean;
  count?: number;
  meta?: {
    derived?: string;
    note?: string;
    evidence?: string;
    status?: string;
  };
};

export type Sel = { kind: "node" | "edge"; id: string } | null;
export type ImpactDoc = { title: string; source: string; severity: Severity; reason: string };
export type ImpactResult = { claim: string; summary: string; docs: ImpactDoc[] };
export type DocHistoryRow = { at: string; actor: string; verb: string; detail: string };
export type GraphView = { id: number; name: string; state: string };

/* ── Relation styles — order matters (drives menu + legend) ──────────────── */

export type RelStyle = { color: string; dash?: string; label: string; out: string; in: string };

export const REL: Record<RelKey, RelStyle> = {
  references: { color: "#35549d", label: "References", out: "References", in: "Referenced by" },
  discussed: { color: "#bf4f2e", label: "Discussed in", out: "Discussed in", in: "Discusses" },
  derived: { color: "#43663c", label: "Derived from", out: "Derived from", in: "Source of" },
  translates: { color: "#6a5a9c", dash: "4 5", label: "Translates", out: "Translates", in: "Translated by" },
  contradicts: { color: "#c8502e", dash: "6 5", label: "Contradicts", out: "Contradicts", in: "Contradicted by" },
};

export const REL_ORDER: RelKey[] = ["references", "discussed", "derived", "translates", "contradicts"];

export const edgeKey = (from: string, to: string, rel: RelKey) => `${from}→${to}:${rel}`;

/* ── Source identity ────────────────────────────────────────────────────── */

export const SOURCE_ORDER = ["github", "slack", "docs", "notion", "granola", "gdocs", "docsite"] as const;

export const SOURCE_LABELS: Record<string, string> = {
  github: "GitHub", slack: "Slack", docs: "Docs", notion: "Notion",
  granola: "Granola", gdocs: "Drive", docsite: "Doc site",
};

/** Text glyph rendered inline in cy node labels (kept for legend/fallbacks). */
export const SOURCE_GLYPH: Record<string, string> = {
  github: "⬡", slack: "✳", docs: "▤", notion: "▣", granola: "✎", gdocs: "▲", docsite: "◍",
};

/** Node underlay tint by source. */
export const SOURCE_ACCENT: Record<string, string> = {
  github: "#6b6353", slack: "#6a5a9c", docs: "#35549d", notion: "#2d2a22",
  granola: "#43663c", gdocs: "#c8973a", docsite: "#4a7d7b",
};

/** Normalize any unknown source to the globe ("docsite") group. */
export const srcKey = (source: string) =>
  (SOURCE_ORDER as readonly string[]).includes(source) ? source : "docsite";

/* ── Roll-up constants ──────────────────────────────────────────────────── */

export const MACRO_PREFIX = "grp:";
export const STUB_PREFIX = "more:";
export const AGG_EDGE_PREFIX = "ge:";
export const GROUP_PAGE_SIZE = 25;

export function groupParts(id: string): { repo: string; kind: string } {
  // "gh:MariHQ/web:commits" → { repo, kind }
  const body = id.replace(/^gh:/, "");
  const lastColon = body.lastIndexOf(":");
  if (lastColon < 0) return { repo: body, kind: "" };
  return { repo: body.slice(0, lastColon), kind: body.slice(lastColon + 1) };
}

export function groupKindWord(kind: string, n: number): string {
  const map: Record<string, [string, string]> = {
    commits: ["commit", "commits"],
    prs: ["PR", "PRs"],
    issues: ["issue", "issues"],
  };
  const pair = map[kind];
  if (!pair) return kind;
  return n === 1 ? pair[0] : pair[1];
}

/* ── Lens palettes / helpers ────────────────────────────────────────────── */

export const LENSES: { key: Lens; label: string }[] = [
  { key: "source", label: "Source" },
  { key: "stale", label: "Staleness" },
  { key: "owner", label: "Ownership" },
  { key: "health", label: "Health" },
];

export const OWNER_PALETTE = ["#35549d", "#6a5a9c", "#43663c", "#b04e2c", "#c8973a", "#4a7d7b", "#8a5a3b", "#a04a6e"];

export function ownerColor(owner: string): string {
  let h = 0;
  for (let i = 0; i < owner.length; i++) h = (h * 31 + owner.charCodeAt(i)) >>> 0;
  return OWNER_PALETTE[h % OWNER_PALETTE.length];
}

export const staleColor = (d: number) => (d <= 14 ? "#43663c" : d <= 45 ? "#c8973a" : "#c0392b");

/* ── Severity (impact analysis) ─────────────────────────────────────────── */

export const SEVERITY_TASK: Record<Severity, { kind: string; kindLabel: string }> = {
  "update-required": { kind: "stale", kindLabel: "Update" },
  review: { kind: "factcheck", kindLabel: "Review" },
  minor: { kind: "approval", kindLabel: "Minor" },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string; tone: string }> = {
  "update-required": { label: "Update required", color: "#c8502e", tone: "blocked" },
  review: { label: "Review", color: "#c8973a", tone: "attention" },
  minor: { label: "Minor", color: "#35549d", tone: "info" },
};

/* ── Pure helpers ───────────────────────────────────────────────────────── */

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function downloadText(name: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Presentational helpers (shared across drawers + graph) ─────────────── */

/** Source/kind node glyph. Brand mark for known sources, GitHub mark for the
    roll-up macro, else a neutral source mark. */
export function NodeGlyph({ node, size = 18 }: { node: Pick<LNode, "source" | "macro">; size?: number }) {
  if (node.macro) return <GithubMark size={size} />;
  return <SourceMark provider={node.source === "gdocs" ? "gdocs" : node.source} size={size} />;
}

/** Inline SVG line swatch colored (and optionally dashed) by relation. */
export function EdgeSwatch({ rel, width = 22, dashed }: { rel: RelKey; width?: number; dashed?: boolean }) {
  const s = REL[rel];
  const dash = dashed ?? Boolean(s.dash);
  return (
    <svg width={width} height={8} viewBox="0 0 22 8" aria-hidden className="shrink-0">
      <line x1={1} y1={4} x2={21} y2={4} stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeDasharray={dash ? "3 3" : undefined} />
    </svg>
  );
}

/** A line-swatch + directional title + subline + trailing focus row.
    Reused across node / edge / group / trace lists. */
export function ConnectionRow({
  rel, dir = "out", dashed, title, subline, onSelect, onFocus,
}: {
  rel: RelKey;
  dir?: "out" | "in";
  dashed?: boolean;
  title: ReactNode;
  subline?: ReactNode;
  onSelect?: () => void;
  onFocus?: () => void;
}) {
  return (
    <div className={`group flex items-center gap-2.5 rounded-[4px] border border-transparent px-2 py-1.5 -mx-2 hover:border-ink/12 hover:bg-flysch/60 ${onSelect ? "cursor-pointer" : ""}`}>
      <EdgeSwatch rel={rel} dashed={dashed} />
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-start gap-1.5 text-left ${focusRing} rounded-[3px]`}
      >
        <span className="mt-[1px] shrink-0 font-term text-[12px] text-ink/40">{dir === "out" ? "→" : "←"}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-ink">{title}</span>
          {subline && <span className="block truncate font-term text-[11px] text-ink/50">{subline}</span>}
        </span>
      </button>
      {onFocus && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFocus(); }}
          className={`shrink-0 rounded-[3px] px-1.5 py-0.5 font-term text-[11px] text-ink/45 opacity-0 hover:text-ink group-hover:opacity-100 ${focusRing}`}
          title="Focus on the canvas"
        >
          ⌖ focus
        </button>
      )}
    </div>
  );
}

/** The bespoke non-modal `.lg-drawer` shell shared by all four lineage
    drawers: paper panel, hairline border, NO backdrop / focus-trap (so the
    canvas stays interactive). Not the catalog `Drawer`. */
export function LgDrawerShell({
  icon, title, pills, footer, onClose, width = 384, children, className = "",
}: {
  icon: ReactNode;
  title: ReactNode;
  pills?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-label={typeof title === "string" ? title : "Lineage detail"}
      style={{ width, maxHeight: 640 }}
      className={`${card} flex max-w-full flex-col overflow-hidden font-display ${className}`.trim()}
    >
      <header className="shrink-0 border-b border-ink/10 px-4 pt-3.5 pb-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-ink/70" aria-hidden>{icon}</span>
          <div className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-ink">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-[4px] text-ink/50 hover:bg-flysch hover:text-ink ${focusRing}`}
          >
            ✕
          </button>
        </div>
        {pills && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{pills}</div>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{children}</div>
      {footer && <footer className="shrink-0 border-t border-ink/10 p-3">{footer}</footer>}
    </aside>
  );
}

/* ── Baked-in demo graph ────────────────────────────────────────────────── */

export const DEMO_NODES: LNode[] = [
  { id: "n1", docId: 101, source: "docs", title: "Pricing policy", meta: "Decision · owner Ana K · 4d ago", icon: "doc", docKind: "decision", group: "", x: 0.06, y: 0.5, date: "2026-07-17", createdDate: "2026-03-02", owner: "Ana K", staleDays: 4, tags: ["customer-facing"], inbound: 6, outbound: 3 },
  { id: "n2", docId: 102, source: "docs", title: "Free-tier limits", meta: "Page · owner Ana K · 9d ago", icon: "doc", docKind: "page", group: "", x: 0.24, y: 0.26, date: "2026-07-12", createdDate: "2026-04-10", owner: "Ana K", staleDays: 9, tags: ["customer-facing"], inbound: 4, outbound: 2 },
  { id: "n3", docId: 103, source: "docsite", title: "Billing FAQ", meta: "Page · owner Sam L · 52d ago", icon: "book", docKind: "page", group: "", x: 0.24, y: 0.74, date: "2026-05-30", createdDate: "2026-01-14", owner: "Sam L", staleDays: 52, warn: true, tags: ["customer-facing"], inbound: 3, outbound: 1 },
  { id: "n4", docId: 104, source: "github", title: "PR #482 · billing revamp", meta: "PR · merged · 2d ago", icon: "github", docKind: "pr", group: "gh:MariHQ/web:prs", x: 0.45, y: 0.16, date: "2026-07-19", createdDate: "2026-07-10", owner: "Dev R", staleDays: 2, inbound: 2, outbound: 4 },
  { id: "n5", docId: 105, source: "slack", title: "#pricing thread", meta: "Answer · owner Mia M · 15d ago", icon: "slack", docKind: "answer", group: "", x: 0.45, y: 0.5, date: "2026-07-06", createdDate: "2026-06-28", owner: "Mia M", staleDays: 15, inbound: 5, outbound: 2 },
  { id: "n6", docId: 106, source: "notion", title: "Onboarding guide", meta: "Page · owner Jo S · 33d ago", icon: "notion", docKind: "page", group: "", x: 0.45, y: 0.84, date: "2026-06-18", createdDate: "2026-02-20", owner: "Jo S", staleDays: 33, inbound: 2, outbound: 1 },
  { id: "n7", docId: 107, source: "github", title: "Issue #91 · stale FAQ", meta: "Issue · open · 61d ago", icon: "github", docKind: "issue", group: "gh:MariHQ/web:issues", x: 0.66, y: 0.28, date: "2026-05-21", createdDate: "2026-05-10", owner: "Sam L", staleDays: 61, warn: true, inbound: 1, outbound: 1 },
  { id: "n8", docId: 108, source: "gdocs", title: "Pricing deck Q3", meta: "Page · owner Mia M · 21d ago", icon: "gdocs", docKind: "page", group: "", x: 0.66, y: 0.62, date: "2026-06-30", createdDate: "2026-06-01", owner: "Mia M", staleDays: 21, inbound: 3, outbound: 2 },
  { id: "n9", docId: 109, source: "granola", title: "Sept launch brief", meta: "Decision · owner Ana K · 1d ago", icon: "granola", docKind: "decision", group: "", x: 0.88, y: 0.46, date: "2026-07-20", createdDate: "2026-07-15", owner: "Ana K", staleDays: 1, inbound: 1, outbound: 0 },
  { id: "grp:gh:MariHQ/web:commits", macro: true, count: 42, repo: "MariHQ/web", source: "github", title: "42 commits", meta: "MariHQ/web", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0.66, y: 0.92, inbound: 0, outbound: 8 },
];

export const DEMO_EDGES: LEdge[] = [
  { id: "e1", from: "n1", to: "n2", rel: "derived", date: "2026-07-12", meta: { note: "Free-tier section derives from the pricing decision." } },
  { id: "e2", from: "n1", to: "n3", rel: "derived", date: "2026-05-30" },
  { id: "e3", from: "n2", to: "n4", rel: "references", date: "2026-07-19", meta: { evidence: "MariHQ/web#482", status: "confirmed" } },
  { id: "e4", from: "n2", to: "n5", rel: "discussed", date: "2026-07-06", meta: { note: "Thread debating the new free-tier cap." } },
  { id: "e5", from: "n3", to: "n7", rel: "contradicts", date: "2026-05-21", dashed: true, meta: { note: "FAQ still quotes the old $0 tier." } },
  { id: "e6", from: "n5", to: "n8", rel: "discussed", date: "2026-06-30" },
  { id: "e7", from: "n4", to: "n7", rel: "references", date: "2026-07-15", meta: { evidence: "closes #91" } },
  { id: "e8", from: "n8", to: "n9", rel: "references", date: "2026-07-20" },
  { id: "e9", from: "n6", to: "n5", rel: "references", date: "2026-06-18" },
  { id: "e10", from: "n2", to: "n6", rel: "references", date: "2026-06-18" },
  { id: "e11", from: "n8", to: "n3", rel: "translates", date: "2026-06-10", dashed: true, llm: true, meta: { derived: "llm" } },
  { id: "ge:grp:gh:MariHQ/web:commits→n8:references", from: "grp:gh:MariHQ/web:commits", to: "n8", rel: "references", count: 42 },
];

/** Sorted unique event dates across nodes + edges (snap targets). */
export const DEMO_DATES: string[] = Array.from(
  new Set([
    ...DEMO_NODES.flatMap((n) => [n.date, n.createdDate].filter(Boolean) as string[]),
    ...DEMO_EDGES.map((e) => e.date).filter(Boolean) as string[],
  ]),
).sort();

export const DEMO_ACTIVITY: { date: string; count: number }[] = [
  { date: "2026-01-14", count: 1 }, { date: "2026-02-20", count: 1 }, { date: "2026-03-02", count: 2 },
  { date: "2026-04-10", count: 3 }, { date: "2026-05-21", count: 2 }, { date: "2026-05-30", count: 4 },
  { date: "2026-06-18", count: 5 }, { date: "2026-06-30", count: 6 }, { date: "2026-07-06", count: 4 },
  { date: "2026-07-12", count: 7 }, { date: "2026-07-17", count: 5 }, { date: "2026-07-19", count: 8 },
  { date: "2026-07-20", count: 6 },
];

export const nodeById = (nodes: LNode[] = DEMO_NODES) =>
  Object.fromEntries(nodes.map((n) => [n.id, n])) as Record<string, LNode>;

/* ── LineageDataModel — visual legend (so the model spec has a gallery view) */

function Swatch({ color, dash }: { color: string; dash?: boolean }) {
  return (
    <svg width={26} height={8} viewBox="0 0 26 8" aria-hidden className="shrink-0">
      <line x1={1} y1={4} x2={25} y2={4} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeDasharray={dash ? "3 3" : undefined} />
    </svg>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

export type LineageDataModelProps = { className?: string };

/** Legend / palette reference for the lineage model: relation types, source
    identities, staleness + health lenses, and impact severities. */
export function LineageDataModel({ className = "" }: LineageDataModelProps) {
  return (
    <div className={`${card} max-w-[640px] p-5 font-display text-ink ${className}`.trim()}>
      <div className="mb-4">
        <div className="text-[15px] font-semibold">Lineage model — legend</div>
        <div className="mt-0.5 text-[12.5px] text-ink/55">The shared palettes every lineage view reads from.</div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <SectionLabel>Relations</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {REL_ORDER.map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-[13px]">
                <Swatch color={REL[k].color} dash={Boolean(REL[k].dash)} />
                <span>{REL[k].label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionLabel>Sources</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {SOURCE_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-[13px]">
                <SourceMark provider={s === "gdocs" ? "gdocs" : s} size={16} />
                <span>{SOURCE_LABELS[s]}</span>
                <span className="font-term text-[11px] text-ink/40">{SOURCE_GLYPH[s]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionLabel>Staleness lens</SectionLabel>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            <li className="flex items-center gap-2.5"><Dot color={staleColor(5)} /> Fresh · ≤ 14 days</li>
            <li className="flex items-center gap-2.5"><Dot color={staleColor(30)} /> Aging · ≤ 45 days</li>
            <li className="flex items-center gap-2.5"><Dot color={staleColor(90)} /> Stale · &gt; 45 days</li>
          </ul>
        </section>

        <section>
          <SectionLabel>Impact severity</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-[13px]">
                <Dot color={SEVERITY_META[s].color} />
                <span>{SEVERITY_META[s].label}</span>
                <Chip label={SEVERITY_TASK[s].kindLabel} tone={SEVERITY_META[s].tone} className="ml-auto" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-3 font-term text-[11px] text-ink/45">
        {DEMO_NODES.filter((n) => !n.macro).length} document nodes · {DEMO_EDGES.length} edges · {DEMO_DATES.length} event dates · virtual space 1600×900
      </div>
    </div>
  );
}
