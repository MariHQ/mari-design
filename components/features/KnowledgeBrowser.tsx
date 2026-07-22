import { useMemo, useState, type ReactNode } from "react";
import { Search, X, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Avatar } from "../data-display/Avatar";
import { Pill } from "../data-display/Pill";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Tabs } from "../navigation/Tabs";
import { Menu, MenuRadioGroup, MenuRadioItem, MenuLabel } from "../navigation/Menu";
import { SourceMark } from "../icons/marks";
import { fmtDate } from "../tokens/format";

/* KnowledgeBrowser — the filter rail + results feed of the Knowledge page.
   A faceted filter rail, a debounced search box, result-type tabs, sort, and
   a scrollable feed of result cards, closed by a live corpus-stats strip.
   Slack results render as thread-sized "decision chunks". Fully local +
   standalone with baked demo corpus. */

type Kind = "page" | "thread" | "pr";

type Result = {
  id: string;
  kind: Kind;
  source: string;
  title: string;
  snippet: string;
  author: string;
  date: string;
  tags: string[];
  status?: string;
  messageCount?: number;
  participantCount?: number;
};

const DEMO: Result[] = [
  { id: "r1", kind: "page", source: "notion", title: "Payments incident runbook", snippet: "When the settlement queue backs up, drain it before restarting workers. Escalate to on-call if depth exceeds 10k.", author: "Priya Nair", date: "2026-07-16", tags: ["canonical"], status: "canonical" },
  { id: "r2", kind: "thread", source: "slack", title: "Decision: move webhooks to the new gateway", snippet: "We agreed to cut over webhook delivery to the gateway on the 24th, with a rollback window through EOD.", author: "#eng-platform", date: "2026-07-15", tags: [], status: "verified", messageCount: 22, participantCount: 6 },
  { id: "r3", kind: "pr", source: "github", title: "feat: retry settlement on transient gateway errors", snippet: "Adds exponential backoff for 5xx from the settlement gateway; caps at 5 attempts, emits a metric per retry.", author: "Marcus Vale", date: "2026-07-14", tags: ["needs-review"], status: "needs-review" },
  { id: "r4", kind: "page", source: "docs", title: "Sign-in and session model", snippet: "Sessions are 30-day rolling tokens. Signing in from a new device revokes the oldest session past the cap.", author: "Dana Osei", date: "2026-07-11", tags: ["customer-facing"], status: "verified" },
  { id: "r5", kind: "thread", source: "slack", title: "Decision chunk: deprecate the v1 export API", snippet: "v1 export is superseded by the streaming endpoint; we'll keep it read-only for one quarter, then remove it.", author: "#product", date: "2026-07-08", tags: [], status: "stale", messageCount: 14, participantCount: 4 },
  { id: "r6", kind: "pr", source: "github", title: "fix: correct freshness rollup for archived sources", snippet: "Archived sources were dragging the fresh-% down; exclude them from the denominator in the rollup job.", author: "Priya Nair", date: "2026-06-30", tags: [], status: "stale" },
  { id: "r7", kind: "page", source: "notion", title: "Evidence policy — how tags drive ranking", snippet: "Canonical outranks verified; needs-review is excluded from evidence entirely until a person clears it.", author: "Dana Osei", date: "2026-07-02", tags: ["canonical"], status: "canonical" },
];

const SORTS = [
  { id: "best", label: "Best match" },
  { id: "newest", label: "Newest" },
  { id: "title", label: "Title" },
];

const KNOWN_OWNERS = ["Priya Nair", "Marcus Vale", "Dana Osei"];

/* ── local sub-components ─────────────────────────────────────────────── */

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2.5 h-9 px-3 rounded-md border border-ink/20 bg-paper text-ink/50 focus-within:border-biscay-2 focus-within:ring-1 focus-within:ring-biscay-2/40">
      <Search size={15} className="shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search knowledge…" className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-ink/40" />
      {value && <button type="button" aria-label="Clear" onClick={() => onChange("")} className="shrink-0 text-ink/40 hover:text-ink"><X size={14} /></button>}
    </label>
  );
}

type FacetRowData = { label: string; icon?: ReactNode; count: number; active: boolean; onToggle: () => void; single?: boolean };

function FacetRow({ row }: { row: FacetRowData }) {
  return (
    <label className="flex items-center gap-2.5 py-[3px] cursor-pointer group">
      {row.icon ? (
        <span className={`grid place-items-center w-4 h-4 shrink-0 ${row.active ? "" : "opacity-70"}`}>{row.icon}</span>
      ) : (
        <span className={`grid place-items-center w-[15px] h-[15px] shrink-0 ${row.single ? "rounded-full" : "rounded-[3px]"} border ${row.active ? "border-biscay bg-biscay" : "border-ink/25 bg-paper"}`}>
          {row.active && <span className={row.single ? "w-1.5 h-1.5 rounded-full bg-white" : "w-2 h-2 bg-white rounded-[1px]"} />}
        </span>
      )}
      <input type="checkbox" className="sr-only" checked={row.active} onChange={row.onToggle} />
      <span className={`flex-1 text-[12.5px] ${row.active ? "text-ink font-medium" : "text-ink/70 group-hover:text-ink"}`}>{row.label}</span>
      <span className="font-term text-[11px] text-ink/45">{row.count}</span>
    </label>
  );
}

function FacetGroup({ name, rows }: { name: string; rows: FacetRowData[] }) {
  const [open, setOpen] = useState(rows.length <= 4);
  const shown = open ? rows : rows.slice(0, 4);
  return (
    <div>
      <h4 className="font-term text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink/55 mb-1.5">{name}</h4>
      <div>{shown.map((r) => <FacetRow key={r.label} row={r} />)}</div>
      {rows.length > 4 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 inline-flex items-center gap-1 font-term text-[11px] text-biscay-2 hover:text-ink">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{open ? "Show fewer" : "Show more"}
        </button>
      )}
    </div>
  );
}

function FooterStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[18px] font-bold text-ink leading-none">{value}</span>
      <span className="font-term text-[11px] text-ink/55 mt-0.5">{label}</span>
    </div>
  );
}

const SOURCE_LABELS: { key: string; label: string }[] = [
  { key: "slack", label: "Slack" },
  { key: "github", label: "GitHub" },
  { key: "notion", label: "Notion" },
  { key: "docs", label: "Google Docs" },
];
const TYPE_ROWS: { label: string; match: (r: Result) => boolean }[] = [
  { label: "Documents", match: (r) => r.kind === "page" },
  { label: "Conversations", match: (r) => r.kind === "thread" },
  { label: "Pull requests", match: (r) => r.kind === "pr" },
];
const STATUS_ROWS = ["canonical", "verified", "needs-review", "stale"];

export type KnowledgeBrowserProps = {
  results?: Result[];
  className?: string;
};

export function KnowledgeBrowser({ results = DEMO, className = "" }: KnowledgeBrowserProps) {
  const [q, setQ] = useState("");
  const [srcSel, setSrcSel] = useState<Set<string>>(new Set());
  const [typeSel, setTypeSel] = useState<Set<string>>(new Set());
  const [ownerSel, setOwnerSel] = useState<Set<string>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState("Any time");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("best");
  const [selId, setSelId] = useState<string | null>("r1");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n);
  };

  const count = (pred: (r: Result) => boolean) => results.filter(pred).length;

  const baseFiltered = useMemo(() => results.filter((r) => {
    if (q && !`${r.title} ${r.snippet} ${r.author}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (srcSel.size && !srcSel.has(r.source)) return false;
    if (typeSel.size) {
      const t = r.kind === "page" ? "Documents" : r.kind === "thread" ? "Conversations" : "Pull requests";
      if (!typeSel.has(t)) return false;
    }
    if (ownerSel.size) {
      const owner = KNOWN_OWNERS.includes(r.author) ? r.author : "Other people";
      if (!ownerSel.has(owner)) return false;
    }
    if (statusSel.size && !(r.status && statusSel.has(r.status))) return false;
    return true;
  }), [results, q, srcSel, typeSel, ownerSel, statusSel]);

  const tabMatch = (r: Result) => tab === "all"
    || (tab === "docs" && r.kind === "page")
    || (tab === "conv" && r.kind === "thread")
    || (tab === "pages" && (r.source === "docs" || r.source === "notion"))
    || (tab === "prs" && r.kind === "pr");

  const sorted = useMemo(() => {
    const rows = baseFiltered.filter(tabMatch);
    if (sort === "newest") return [...rows].sort((a, b) => b.date.localeCompare(a.date));
    if (sort === "title") return [...rows].sort((a, b) => a.title.localeCompare(b.title));
    return rows;
  }, [baseFiltered, tab, sort]);

  const owners = [...KNOWN_OWNERS, "Other people"];
  const sortLabel = SORTS.find((s) => s.id === sort)?.label ?? "Best match";

  return (
    <div className={`grid gap-4 lg:grid-cols-[220px_1fr] items-start ${className}`.trim()}>
      {/* Filter rail */}
      <Card className="flex flex-col gap-4">
        <FacetGroup name="Source" rows={SOURCE_LABELS.map((s) => ({ label: s.label, icon: <SourceMark provider={s.key} size={15} />, count: count((r) => r.source === s.key), active: srcSel.has(s.key), onToggle: () => toggle(srcSel, setSrcSel, s.key) }))} />
        <FacetGroup name="Content type" rows={TYPE_ROWS.map((t) => ({ label: t.label, count: count(t.match), active: typeSel.has(t.label), onToggle: () => toggle(typeSel, setTypeSel, t.label) }))} />
        <FacetGroup name="Owner" rows={owners.map((o) => ({ label: o, count: count((r) => (o === "Other people" ? !KNOWN_OWNERS.includes(r.author) : r.author === o)), active: ownerSel.has(o), onToggle: () => toggle(ownerSel, setOwnerSel, o) }))} />
        <FacetGroup name="Freshness" rows={["Any time", "Past week", "Past month"].map((f) => ({ label: f, single: true, count: results.length, active: fresh === f, onToggle: () => setFresh(f) }))} />
        <FacetGroup name="Status" rows={STATUS_ROWS.map((s) => ({ label: s, count: count((r) => r.status === s), active: statusSel.has(s), onToggle: () => toggle(statusSel, setStatusSel, s) }))} />
      </Card>

      {/* Results column */}
      <div className="flex flex-col gap-3">
        <SearchBox value={q} onChange={setQ} />

        <div className="flex items-start gap-2.5 rounded-md border border-biscay-2/25 bg-biscay-2/[0.04] px-3 py-2 text-[12px] text-ink/70">
          Slack results are conversation-aware — threads are grouped into thread-sized decision chunks with message and participant counts.
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Tabs
            ariaLabel="Result type"
            variant="underline"
            value={tab}
            onChange={setTab}
            options={[
              { id: "all", label: "All" },
              { id: "docs", label: "Documents", count: count((r) => r.kind === "page") },
              { id: "conv", label: "Conversations", count: count((r) => r.kind === "thread") },
              { id: "pages", label: "Pages", count: count((r) => r.source === "docs" || r.source === "notion") },
              { id: "prs", label: "PRs", count: count((r) => r.kind === "pr") },
            ]}
          />
          <div className="ml-auto">
            <Menu trigger={<Button compact>Sort: {sortLabel} <ChevronDown size={13} /></Button>}>
              <MenuLabel>Sort by</MenuLabel>
              <MenuRadioGroup value={sort} onValueChange={setSort}>
                {SORTS.map((s) => <MenuRadioItem key={s.id} value={s.id}>{s.label}</MenuRadioItem>)}
              </MenuRadioGroup>
            </Menu>
          </div>
        </div>

        <div className="font-term text-[11.5px] text-ink/55">{sorted.length} result{sorted.length === 1 ? "" : "s"}</div>

        {sorted.length === 0 ? (
          <Card><EmptyState icon={<Search size={20} />} title="No results">No results match these filters.</EmptyState></Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sorted.map((r) => {
              const selected = selId === r.id;
              const isSaved = saved.has(r.id);
              const slack = r.kind === "thread";
              return (
                <Card
                  key={r.id}
                  variant="flush"
                  onClick={() => setSelId(r.id)}
                  className={`p-4 cursor-pointer transition-colors ${selected ? "ring-1 ring-biscay-2/50 border-biscay-2/40" : "hover:border-ink/25"}`}
                >
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1 w-12 shrink-0 pt-0.5">
                      <SourceMark provider={r.source} size={20} />
                      <span className="font-term text-[9px] uppercase tracking-[0.06em] text-ink/45 text-center">{r.source}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="text-[14px] font-semibold text-ink hover:text-biscay-2 min-w-0 flex-1">{r.title}</h3>
                        {slack && <Chip label="Decision chunk" tone="info" />}
                        <button
                          type="button"
                          aria-label={isSaved ? "Remove bookmark" : "Bookmark"}
                          onClick={(e) => { e.stopPropagation(); setSaved((prev) => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; }); }}
                          className="shrink-0 text-ink/35 hover:text-ink"
                        >
                          <Bookmark size={15} className={isSaved ? "fill-espelette text-espelette" : ""} />
                        </button>
                      </div>
                      <p className="mt-1 text-[12.5px] text-ink/70">{r.snippet}</p>
                      <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                        {slack ? (
                          <span className="font-term text-[11px] text-ink/55">{r.messageCount} messages · {r.participantCount} participants · {fmtDate(r.date)}</span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5">
                              <Avatar initials={r.author.split(" ").map((w) => w[0]).slice(0, 2).join("")} />
                              <span className="text-[12px] text-ink/70">{r.author}</span>
                            </span>
                            <span className="font-term text-[11px] text-ink/45">· {fmtDate(r.date)}</span>
                            {r.tags.map((t) => <Pill key={t} kind={t} />)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer strip */}
        <Card variant="plain">
          <div className="flex items-center gap-8 flex-wrap">
            <FooterStat value={results.length.toLocaleString()} label="documents" />
            <FooterStat value="1,284" label="verified facts" />
            <FooterStat value="87%" label="fresh" />
            <span className="ml-auto inline-flex items-center gap-2 font-term text-[11.5px] text-ink/60">
              <span className="relative inline-flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-moss opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-moss" />
              </span>
              Live ingestion · 6 sources
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default KnowledgeBrowser;
