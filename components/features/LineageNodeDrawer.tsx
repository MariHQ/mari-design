import { useMemo, useState } from "react";
import { ExternalLink, Eye, ClipboardCheck, Target, Pin, Link2, Plus } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { CardActions, CardBody, CardMeta, CardSection, CardTitleBlock } from "../layout/CardShell";
import { Tabs } from "../navigation/Tabs";
import { Pill } from "../data-display/Pill";
import { SectionLabel } from "../forms/SectionLabel";
import { EmptyState } from "../data-display/EmptyState";
import { Timeline } from "../data-display/Timeline";
import { SkeletonCircle, SkeletonLine, SkeletonChip, SkeletonText, SkeletonList } from "../data-display/Skeleton";
import { fmtDate } from "../tokens/format";
import {
  REL, staleColor, NodeGlyph, LgDrawerShell, LgResultPanel, LG_DRAWER_W, lgToggleOn, ConnectionRow,
  LgSourceChip, LgNodeStatusChip, LgAuthor, LgOwners,
  DEMO_NODES, DEMO_EDGES, nodeById,
  type LNode, type LEdge, type DocHistoryRow,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage node drawer (feature: lineage-node-drawer)

   The document-node detail panel — a non-modal right drawer (no backdrop, no
   focus trap; the canvas stays live) with four tabs (Overview / Connections /
   History / Impact), a meta pill row, and a footer of node actions. Standalone
   with a baked-in demo document; renders open so it shows in the gallery.
   ──────────────────────────────────────────────────────────────────────── */

type Tab = "overview" | "connections" | "history" | "impact";

const DEMO_HISTORY: DocHistoryRow[] = [
  { at: "2026-07-19", actor: "Dev R", verb: "merged", detail: "PR #482 into main" },
  { at: "2026-07-15", actor: "Mari", verb: "linked", detail: "closes issue #91" },
  { at: "2026-07-11", actor: "Ana K", verb: "reviewed", detail: "approved billing changes" },
  { at: "2026-07-10", actor: "Dev R", verb: "opened", detail: "PR #482 · billing revamp" },
];

export type LineageNodeDrawerProps = {
  nodes?: LNode[];
  edges?: LEdge[];
  /** Which node to open. */
  nodeId?: string;
  onClose?: () => void;
  /** Render a content-shaped skeleton silhouette instead of the drawer body. */
  loading?: boolean;
  className?: string;
};

export function LineageNodeDrawer({
  nodes = DEMO_NODES, edges = DEMO_EDGES, nodeId = "n4", onClose, loading = false, className = "",
}: LineageNodeDrawerProps) {
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [openId, setOpenId] = useState(nodeId);
  const [tab, setTab] = useState<Tab>("overview");
  const [watched, setWatched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focal, setFocal] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [taskMade, setTaskMade] = useState(false);
  /** Inline result for the otherwise-inert trace/export buttons. */
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);

  const node = byId[openId] ?? nodes[0];

  const connections = useMemo(() => {
    const rows: { rel: keyof typeof REL; dir: "out" | "in"; other: LNode; edge: LEdge }[] = [];
    for (const e of edges) {
      if (e.from === node.id && byId[e.to]) rows.push({ rel: e.rel, dir: "out", other: byId[e.to], edge: e });
      if (e.to === node.id && byId[e.from]) rows.push({ rel: e.rel, dir: "in", other: byId[e.from], edge: e });
    }
    return rows;
  }, [edges, node.id, byId]);

  const downstream = connections.filter((c) => c.dir === "out").length;
  const upstream = connections.filter((c) => c.dir === "in").length;
  const showReferences = ["pr", "issue", "commit"].includes(node.docKind);
  const references = connections.filter((c) => c.rel === "references");

  /* Owners block: the document owner plus whoever last approved it. Derived,
     never invented — an unowned document says so. */
  const owners = useMemo(() => {
    const rows: { name: string; role: string }[] = [];
    if (node.owner) rows.push({ name: node.owner, role: "Owner" });
    const approver = DEMO_HISTORY.find((h) => h.verb === "reviewed")?.actor;
    if (approver && approver !== node.owner) rows.push({ name: approver, role: "Approver" });
    return rows;
  }, [node.owner]);

  const metaParts = node.meta.split("·").map((s) => s.trim()).filter(Boolean);

  const copyLink = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  if (loading) {
    return (
      <LgDrawerShell
        className={className}
        onClose={onClose}
        icon={<SkeletonCircle size={19} />}
        title={<SkeletonLine w="70%" h={14} />}
        pills={<><SkeletonChip w={72} /><SkeletonChip w={56} /></>}
      >
        <div className="mb-3"><SkeletonLine w="55%" h={12} /></div>
        <SkeletonText lines={4} />
        <div className="mt-4"><SkeletonList rows={4} /></div>
      </LgDrawerShell>
    );
  }

  return (
    <LgDrawerShell
      className={className}
      onClose={onClose}
      width={LG_DRAWER_W}
      icon={<NodeGlyph node={node} size={19} />}
      title="Document"
      summary="One node in the lineage graph."
      footer={
        <div className="flex w-full flex-col gap-2">
          {/* Secondary controls first; each latches visibly when it is on. */}
          <div className="flex flex-wrap gap-2">
            <Button compact onClick={() => setFocal((f) => !f)} className={focal ? lgToggleOn : ""}>
              <Target size={13} /> {focal ? "Focal" : "Set focal"}
            </Button>
            <Button compact onClick={() => setPinned((p) => !p)} className={pinned ? lgToggleOn : ""}>
              <Pin size={13} /> {pinned ? "Pinned" : "Pin"}
            </Button>
            <Button compact onClick={copyLink} className={copied ? lgToggleOn : ""}>
              <Link2 size={13} /> {copied ? "Copied" : "Copy link"}
            </Button>
            <Button compact onClick={() => setWatched((w) => !w)} className={watched ? lgToggleOn : ""}>
              <Eye size={13} /> {watched ? "Watching" : "Watch"}
            </Button>
          </div>
          {/* CONVENTIONS §2: primary bottom LEFT, secondary to its right. */}
          <CardActions
            primary={
              <Button variant="primary" onClick={() => setTaskMade(true)}>
                <ClipboardCheck size={13} /> {taskMade ? "Review task created" : "Create review task"}
              </Button>
            }
            secondary={
              <a href="#" className={`inline-flex h-9 items-center gap-1 rounded-[4px] border border-ink/25 bg-paper px-3.5 text-[13px] font-medium text-biscay-2 hover:border-ink/45 active:bg-ink/[0.05] ${focusRing}`}>
                Open document <ExternalLink size={12} />
              </a>
            }
          />
        </div>
      }
    >
      <div className="mb-3">
        <Tabs
          ariaLabel="Node detail tabs"
          variant="underline"
          value={tab}
          onChange={setTab}
          options={[
            { id: "overview", label: "Overview" },
            { id: "connections", label: "Connections", count: connections.length },
            { id: "history", label: "History" },
            { id: "impact", label: "Impact" },
          ]}
        />
      </div>

      {tab === "overview" && (
        /* CONVENTIONS §1: title, summary, source + status left with date and
           author right on one line, then References, Connections, Owners. */
        <CardBody>
          <CardTitleBlock
            className="[overflow-wrap:anywhere]"
            title={node.title}
            summary={metaParts.join(" · ")}
          />
          <CardMeta
            source={<LgSourceChip source={node.source} />}
            status={<LgNodeStatusChip node={node} />}
            date={node.date ? fmtDate(node.date) : "No date recorded"}
            author={<LgAuthor name={node.owner} />}
          />

          {node.tags && node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {node.tags.map((t) => <Pill key={t} kind="canonical" text={t} tone="neutral" />)}
            </div>
          )}

          {showReferences && (
            <CardSection label="References" count={references.length}>
              {references.length === 0 ? (
                <p className="text-[12.5px] text-ink/70">No extracted references yet.</p>
              ) : references.map((c, i) => (
                <ConnectionRow
                  key={i}
                  rel={c.rel}
                  dir={c.dir}
                  dashed={c.edge.dashed}
                  title={c.other.title}
                  subline={c.edge.meta?.evidence}
                  onSelect={() => setOpenId(c.other.id)}
                  onFocus={() => setOpenId(c.other.id)}
                />
              ))}
            </CardSection>
          )}

          <CardSection
            label="Connections"
            count={connections.length}
            action={connections.length > 3
              ? <button type="button" onClick={() => setTab("connections")} className={`font-term text-[11px] text-biscay-2 hover:underline ${focusRing}`}>See all</button>
              : undefined}
          >
            {connections.length === 0 ? (
              <p className="text-[12.5px] text-ink/70">No links recorded for this document.</p>
            ) : connections.slice(0, 3).map((c, i) => (
              <ConnectionRow
                key={i}
                rel={c.rel}
                dir={c.dir}
                dashed={c.edge.dashed}
                title={c.other.title}
                subline={c.dir === "out" ? REL[c.rel].out : REL[c.rel].in}
                onSelect={() => setOpenId(c.other.id)}
              />
            ))}
          </CardSection>

          <CardSection label="Owners">
            <LgOwners owners={owners} />
          </CardSection>

          <CardSection label="Verified facts" count={1}>
            <div className="rounded-[4px] border border-ink/10 bg-flysch/50 px-3 py-2 text-[12.5px] text-ink/70">
              “Free-tier limits are enforced per workspace, not per user.”
              <span className="text-ink/65"> Verified, pricing.</span>
            </div>
          </CardSection>

          <CardSection label="Staleness">
            <span className="inline-flex items-center gap-2 text-[13px] text-ink">
              <span className="h-3 w-[3px] rounded-[1px]" style={{ backgroundColor: staleColor(node.staleDays ?? 0) }} aria-hidden />
              {node.staleDays ?? 0} days since the last update
            </span>
          </CardSection>
        </CardBody>
      )}

      {tab === "connections" && (
        <div>
          {connections.length === 0 ? (
            <EmptyState title="No links">No links recorded for this node.</EmptyState>
          ) : (
            connections.map((c, i) => (
              <div key={i}>
                {(i === 0 || connections[i - 1].rel !== c.rel || connections[i - 1].dir !== c.dir) && (
                  <div className="mb-1 mt-3 flex items-center gap-2 first:mt-0">
                    <SectionLabel>{c.dir === "out" ? REL[c.rel].out : REL[c.rel].in}</SectionLabel>
                    <span className="font-term text-[11px] text-ink/65">
                      {connections.filter((x) => x.rel === c.rel && x.dir === c.dir).length}
                    </span>
                  </div>
                )}
                <ConnectionRow
                  rel={c.rel}
                  dir={c.dir}
                  dashed={c.edge.dashed}
                  title={c.other.title}
                  subline={c.edge.meta?.note ?? c.edge.meta?.evidence}
                  onSelect={() => setOpenId(c.other.id)}
                  onFocus={() => setOpenId(c.other.id)}
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <Timeline
          items={DEMO_HISTORY.map((h) => ({
            title: <span><span className="font-semibold text-ink">{h.actor}</span> {h.verb}</span>,
            description: h.detail,
            time: fmtDate(h.at),
            tone: "neutral" as const,
          }))}
        />
      )}

      {tab === "impact" && (
        <div>
          <SectionLabel>Closure</SectionLabel>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <div className="rounded-[4px] border border-ink/12 p-2.5">
              <div className="text-[20px] font-bold text-ink">{downstream}</div>
              <div className="font-term text-[11px] text-ink/65">Downstream, depends on this</div>
            </div>
            <div className="rounded-[4px] border border-ink/12 p-2.5">
              <div className="text-[20px] font-bold text-ink">{upstream}</div>
              <div className="font-term text-[11px] text-ink/65">Upstream, this rests on</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              compact
              disabled={downstream === 0}
              className={result?.title.startsWith("Impact") ? lgToggleOn : ""}
              onClick={() => setResult({
                title: `Impact traced: ${downstream} downstream documents`,
                body: connections.filter((c) => c.dir === "out").map((c) => c.other.title).join(", "),
              })}
            >
              Trace impact
            </Button>
            <Button
              compact
              disabled={upstream === 0}
              className={result?.title.startsWith("Provenance") ? lgToggleOn : ""}
              onClick={() => setResult({
                title: `Provenance traced: ${upstream} upstream documents`,
                body: connections.filter((c) => c.dir === "in").map((c) => c.other.title).join(", "),
              })}
            >
              Trace provenance
            </Button>
            <Button
              compact
              disabled={downstream + upstream === 0}
              className={result?.title.startsWith("Exported") ? lgToggleOn : ""}
              onClick={() => setResult({
                title: `Exported ${connections.length} rows`,
                body: `${node.title.replace(/,/g, "")}-closure.csv is ready to download.`,
              })}
            >
              <Plus size={13} /> Export CSV
            </Button>
          </div>
          {result ? (
            <div className="mt-3">
              <LgResultPanel title={result.title}>{result.body}</LgResultPanel>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] text-ink/70">
              Tracing highlights the closure on the canvas and lists it here.
            </p>
          )}
        </div>
      )}
    </LgDrawerShell>
  );
}
