import { useMemo, useState, type ReactNode } from "react";
import { Search, X, Bookmark, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "../layout/Card";
import { CardBody, CardTitleBlock, CardMeta } from "../layout/CardShell";
import { Button } from "../actions/Button";
import { Avatar } from "../data-display/Avatar";
import { Pill } from "../data-display/Pill";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Tabs } from "../navigation/Tabs";
import { Menu, MenuRadioGroup, MenuRadioItem, MenuLabel } from "../navigation/Menu";
import { SourceMark } from "../icons/marks";
import { fmtDate } from "../tokens/format";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { Truncate } from "../data-display/Truncate";
import { Scrollable } from "../data-display/Scrollable";

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
  { id: "r5", kind: "thread", source: "slack", title: "Decision excerpt: deprecate the v1 export API", snippet: "v1 export is superseded by the streaming endpoint; we'll keep it read-only for one quarter, then remove it.", author: "#product", date: "2026-07-08", tags: [], status: "stale", messageCount: 14, participantCount: 4 },
  { id: "r6", kind: "pr", source: "github", title: "fix: correct freshness rollup for archived sources", snippet: "Archived sources were dragging the fresh-% down; exclude them from the denominator in the rollup job.", author: "Priya Nair", date: "2026-06-30", tags: [], status: "stale" },
  { id: "r7", kind: "page", source: "notion", title: "Evidence policy, how tags drive ranking", snippet: "Canonical outranks verified; needs-review is excluded from evidence entirely until a person clears it.", author: "Dana Osei", date: "2026-07-02", tags: ["canonical"], status: "canonical" },
];

const SORTS = [
  { id: "best", label: "Best match" },
  { id: "newest", label: "Newest" },
  { id: "title", label: "Title" },
];

const KNOWN_OWNERS = ["Priya Nair", "Marcus Vale", "Dana Osei"];

/** Result cards rendered per page. */
const PAGE = 25;

/* ── local sub-components ─────────────────────────────────────────────── */

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2.5 h-9 px-3 rounded-md border border-ink/20 bg-paper text-ink/65 focus-within:border-biscay-2 focus-within:ring-1 focus-within:ring-biscay-2/40">
      <Search size={15} className="shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search knowledge…" className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-ink/65" />
      {value && <button type="button" aria-label="Clear" onClick={() => onChange("")} className="shrink-0 text-ink/65 hover:text-ink"><X size={14} /></button>}
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
      <span className="font-term text-[11px] text-ink/65">{row.count}</span>
    </label>
  );
}

function FacetGroup({ name, rows }: { name: string; rows: FacetRowData[] }) {
  const [open, setOpen] = useState(rows.length <= 4);
  const shown = open ? rows : rows.slice(0, 4);
  return (
    <div>
      <h4 className="font-term text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink/65 mb-1.5">{name}</h4>
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
      <span className="font-term text-[11px] text-ink/65 mt-0.5">{label}</span>
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
/* Sentence case, like every other filter label (CONVENTIONS.md §3/§5) — the
   raw tag keys ("needs-review") were the only lower-case strings in the rail. */
const STATUS_ROWS: { key: string; label: string }[] = [
  { key: "canonical", label: "Canonical" },
  { key: "verified", label: "Verified" },
  { key: "needs-review", label: "Needs review" },
  { key: "stale", label: "Stale" },
];

export type KnowledgeBrowserProps = {
  results?: Result[];
  loading?: boolean;
  /** Stack the facet rail above the results instead of beside them. Pages own
      this (CONVENTIONS.md §10) — the component never breakpoints itself. */
  stacked?: boolean;
  className?: string;
};

/* One grid for the browser and its skeleton: a fixed 220px facet rail beside
   the results, or a single column when the page asks for the stacked layout. */
const shell = (stacked: boolean, className: string) =>
  /* The rail track is minmax(0,220px), not a hard 220px: on a frame narrower
     than the rail plus a usable results column the rail gives way instead of
     pushing the feed past the page edge (§17). */
  `grid gap-4 items-start ${stacked ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[minmax(0,220px)_minmax(0,1fr)]"} ${className}`.replace(/\s+/g, " ").trim();

/** Content-shaped skeleton for the browser: filter rail + search + result cards. */
function KnowledgeBrowserSkeleton({ stacked = false, className = "" }: { stacked?: boolean; className?: string }) {
  return (
    <div className={shell(stacked, className)} aria-hidden="true">
      <Card className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine w="50%" h={9} />
            <SkeletonLine w="82%" /><SkeletonLine w="66%" /><SkeletonLine w="74%" />
          </div>
        ))}
      </Card>
      <div className="flex flex-col gap-3">
        <Skeleton height={36} rounded="rounded-md" />
        <SkeletonLine w={120} h={10} />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} variant="flush" className="p-4">
              <div className="flex gap-3">
                <SkeletonCircle size={28} />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine w="68%" h={13} />
                  <SkeletonText lines={2} />
                  <div className="flex gap-2"><SkeletonChip w={60} /><SkeletonChip w={48} /></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KnowledgeBrowser({ results = DEMO, loading = false, stacked = false, className = "" }: KnowledgeBrowserProps) {
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
  const [limit, setLimit] = useState(PAGE);

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
  const visible = sorted.slice(0, limit);

  if (loading) return <KnowledgeBrowserSkeleton stacked={stacked} className={className} />;

  return (
    <div className={shell(stacked, className)}>
      {/* Filter rail */}
      <Card className="flex flex-col gap-4">
        <FacetGroup name="Source" rows={SOURCE_LABELS.map((s) => ({ label: s.label, icon: <SourceMark provider={s.key} size={15} />, count: count((r) => r.source === s.key), active: srcSel.has(s.key), onToggle: () => toggle(srcSel, setSrcSel, s.key) }))} />
        <FacetGroup name="Content type" rows={TYPE_ROWS.map((t) => ({ label: t.label, count: count(t.match), active: typeSel.has(t.label), onToggle: () => toggle(typeSel, setTypeSel, t.label) }))} />
        <FacetGroup name="Owner" rows={owners.map((o) => ({ label: o, count: count((r) => (o === "Other people" ? !KNOWN_OWNERS.includes(r.author) : r.author === o)), active: ownerSel.has(o), onToggle: () => toggle(ownerSel, setOwnerSel, o) }))} />
        <FacetGroup name="Freshness" rows={["Any time", "Past week", "Past month"].map((f) => ({ label: f, single: true, count: results.length, active: fresh === f, onToggle: () => setFresh(f) }))} />
        <FacetGroup name="Status" rows={STATUS_ROWS.map((s) => ({ label: s.label, count: count((r) => r.status === s.key), active: statusSel.has(s.key), onToggle: () => toggle(statusSel, setStatusSel, s.key) }))} />
      </Card>

      {/* Results column */}
      <div className="flex flex-col gap-3">
        <SearchBox value={q} onChange={setQ} />

        <div className="flex items-start gap-2.5 rounded-md border border-biscay-2/25 bg-biscay-2/[0.04] px-3 py-2 text-[12px] text-ink/70">
          Slack results are conversation-aware. A thread that records a decision is grouped into a single
          <b className="font-semibold"> decision excerpt</b>: the passage of the conversation where the call was made,
          with its message and participant counts.
        </div>

        {/* No flex-wrap: the sort control shares this line with the tabs and
            never drops to its own row (§13). The tab row scrolls inside
            itself; the sort button keeps its content width. */}
        <div className="flex items-center gap-3">
          {/* min-w-0 + its own scroll box: without it the 5-tab row sets the
              min-content width of the whole results column and pushes the feed
              past the card edge on a narrow viewport. */}
          <Scrollable className="flex-1">
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
          </Scrollable>
          <div className="ml-auto shrink-0">
            {/* The label collapses to just "Sort" so it can never cover the
                tabs on its line; the dropdown carries the options and shows
                the active one (§13). Standard ArrowUpDown sort glyph (§3). */}
            <Menu trigger={<Button compact aria-label={`Sort results, currently ${sortLabel}`}><ArrowUpDown size={13} /> Sort</Button>}>
              <MenuLabel>Sort by</MenuLabel>
              <MenuRadioGroup value={sort} onValueChange={setSort}>
                {SORTS.map((s) => <MenuRadioItem key={s.id} value={s.id}>{s.label}</MenuRadioItem>)}
              </MenuRadioGroup>
            </Menu>
          </div>
        </div>

        {/* Corpus stats strip: above the results it describes, below the
            search/tabs/sort bar, never at the bottom of the list (§13). */}
        <Card variant="plain">
          {/* gap-y keeps the stats off the live-ingestion line when the strip
              wraps; without it the wrapped row sat on top of the labels. */}
          <div className="flex items-center gap-x-8 gap-y-3 flex-wrap">
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

        {/* Result count above the list (§13). A real corpus returns hundreds of
            documents, so the feed renders one page at a time and says how many
            of how many it is showing rather than laying out 400 cards. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-term text-[11.5px] text-ink/65">
            {sorted.length === 0
              ? "No results"
              : visible.length < sorted.length
                ? `Showing ${visible.length} of ${sorted.length.toLocaleString()} results`
                : `Showing all ${sorted.length.toLocaleString()} result${sorted.length === 1 ? "" : "s"}`}
          </span>
          {visible.length < sorted.length && (
            <Button variant="link" onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, sorted.length - visible.length)} more
            </Button>
          )}
          {limit > PAGE && (
            <Button variant="link" onClick={() => setLimit(PAGE)}>Show fewer</Button>
          )}
        </div>

        {sorted.length === 0 ? (
          <Card><EmptyState icon={<Search size={20} />} title="No results">No results match these filters.</EmptyState></Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((r) => {
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
                  {/* Content order per CONVENTIONS.md §1: title, summary, then
                      source + status chips on the left with date + author
                      right-aligned on the same line. The source used to be a
                      separate left gutter and the status chip rode next to the
                      bookmark, which collided on narrow cards. */}
                  <CardBody className="gap-3">
                    <div className="flex items-start gap-3">
                      <CardTitleBlock
                        className="flex-1"
                        title={<Truncate className="hover:text-biscay-2">{r.title}</Truncate>}
                        summary={<Truncate lines={2}>{r.snippet}</Truncate>}
                      />
                      <button
                        type="button"
                        aria-label={isSaved ? "Remove bookmark" : "Bookmark"}
                        onClick={(e) => { e.stopPropagation(); setSaved((prev) => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; }); }}
                        className="shrink-0 mt-0.5 text-ink/65 hover:text-ink"
                      >
                        <Bookmark size={15} className={isSaved ? "fill-espelette text-espelette" : ""} />
                      </button>
                    </div>
                    <CardMeta
                      /* The date/author group is whitespace-nowrap and carries no
                         min-width of its own, so a long author name pinned the
                         row at full width and the card spilled past its border.
                         Letting the nowrap boxes shrink is what makes the
                         truncation fire (CONVENTIONS.md §12). */
                      className="min-w-0 [&_.whitespace-nowrap]:min-w-0"
                      source={
                        <Chip
                          className="min-w-0"
                          label={SOURCE_LABELS.find((s) => s.key === r.source)?.label ?? r.source}
                          tone="neutral"
                          icon={<SourceMark provider={r.source} size={13} />}
                        />
                      }
                      status={
                        <>
                          {r.status && <Pill kind={r.status} />}
                          {slack && <Chip label="Decision excerpt" tone="info" />}
                          {/* Tags render in the same bottom-left block as the
                              status, deduped against it; overflow stacks and
                              the date/author line rides the bottom row (§14). */}
                          {r.tags.filter((t) => t !== r.status).map((t) => <Pill key={t} kind={t} />)}
                        </>
                      }
                      date={fmtDate(r.date)}
                      author={
                        /* min-w-0 + truncate: the meta line is whitespace-nowrap,
                           so an unbreakable author name or a 7-digit message
                           count set the row's min-content width and dragged the
                           card past its own border. */
                        slack ? (
                          <span className="min-w-0 truncate">{r.messageCount} messages · {r.participantCount} participants</span>
                        ) : (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Avatar initials={r.author.split(" ").map((w) => w[0]).slice(0, 2).join("")} />
                            <span className="min-w-0 truncate text-[12px] text-ink/70">{r.author}</span>
                          </span>
                        )
                      }
                    />
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default KnowledgeBrowser;
