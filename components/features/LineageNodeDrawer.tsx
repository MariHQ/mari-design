import { useMemo, useState } from "react";
import { ExternalLink, Eye, ClipboardCheck, Target, Pin, Link2, Plus } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { Tabs } from "../navigation/Tabs";
import { Chip } from "../data-display/Chip";
import { Pill } from "../data-display/Pill";
import { Field } from "../forms/Field";
import { SectionLabel } from "../forms/SectionLabel";
import { EmptyState } from "../data-display/EmptyState";
import { Timeline } from "../data-display/Timeline";
import { fmtDate } from "../tokens/format";
import {
  REL, staleColor, NodeGlyph, LgDrawerShell, ConnectionRow, SOURCE_LABELS,
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
  className?: string;
};

export function LineageNodeDrawer({
  nodes = DEMO_NODES, edges = DEMO_EDGES, nodeId = "n4", onClose, className = "",
}: LineageNodeDrawerProps) {
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [openId, setOpenId] = useState(nodeId);
  const [tab, setTab] = useState<Tab>("overview");
  const [watched, setWatched] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const metaParts = node.meta.split("·").map((s) => s.trim()).filter(Boolean);

  const copyLink = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <LgDrawerShell
      className={className}
      onClose={onClose}
      icon={<NodeGlyph node={node} size={19} />}
      title={node.title}
      pills={
        <>
          {metaParts.map((p, i) => <Chip key={i} label={p} tone="neutral" />)}
          {node.warn && <Chip label="Needs attention" tone="blocked" dot />}
          {node.pinned && <Chip label="Pinned" tone="info" />}
          {node.group && <Chip label={`⊖ ${node.repo ?? node.group}`} tone="neutral" />}
        </>
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button compact><Target size={13} /> Set focal</Button>
            <Button compact><Pin size={13} /> Pin</Button>
            <Button compact onClick={copyLink}><Link2 size={13} /> {copied ? "Copied" : "Copy link"}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button compact onClick={() => setWatched((w) => !w)} className={watched ? "border-biscay-2 text-biscay-2" : ""}>
              <Eye size={13} /> {watched ? "Watching" : "Watch"}
            </Button>
            <Button compact><ClipboardCheck size={13} /> Create review task</Button>
            <a href="#" className={`ml-auto inline-flex items-center gap-1 text-[12.5px] text-biscay-2 hover:underline ${focusRing}`}>
              Open document <ExternalLink size={12} />
            </a>
          </div>
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
        <div>
          <SectionLabel>Document</SectionLabel>
          <div className="mt-1">
            <Field label="Owner">{node.owner ?? "Unowned"}</Field>
            <Field label="Updated">{node.date ? fmtDate(node.date) : "—"}</Field>
            <Field label="Source">
              <span className="inline-flex items-center gap-1.5"><NodeGlyph node={node} size={15} /> {SOURCE_LABELS[node.source] ?? node.source}</span>
            </Field>
            <Field label="Staleness">
              <span style={{ color: staleColor(node.staleDays ?? 0) }}>{node.staleDays ?? 0} days</span>
            </Field>
            {node.tags && node.tags.length > 0 && (
              <Field label="Tags">
                <span className="flex flex-wrap gap-1.5">{node.tags.map((t) => <Pill key={t} kind="canonical" text={t} tone="neutral" />)}</span>
              </Field>
            )}
          </div>

          {showReferences && (
            <div className="mt-4">
              <SectionLabel>References</SectionLabel>
              <div className="mt-1.5">
                {connections.filter((c) => c.rel === "references").length === 0 ? (
                  <p className="text-[12.5px] text-ink/45">No extracted references yet.</p>
                ) : connections.filter((c) => c.rel === "references").map((c, i) => (
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
              </div>
            </div>
          )}

          <div className="mt-4">
            <SectionLabel>Verified facts</SectionLabel>
            <div className="mt-1.5 rounded-[4px] border border-ink/10 bg-flysch/50 px-3 py-2 text-[12.5px] text-ink/70">
              “Free-tier limits are enforced per workspace, not per user.” <span className="text-ink/40">— verified · pricing</span>
            </div>
          </div>
        </div>
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
                    <span className="font-term text-[11px] text-ink/40">
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
              <div className="font-term text-[11px] text-ink/50">Downstream · depends on this</div>
            </div>
            <div className="rounded-[4px] border border-ink/12 p-2.5">
              <div className="text-[20px] font-bold text-ink">{upstream}</div>
              <div className="font-term text-[11px] text-ink/50">Upstream · this rests on</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button compact disabled={downstream === 0}>Trace impact</Button>
            <Button compact disabled={upstream === 0}>Trace provenance</Button>
            <Button compact disabled={downstream + upstream === 0}><Plus size={13} /> Export CSV</Button>
          </div>
          <p className="mt-3 text-[12.5px] text-ink/50">
            Tracing highlights the closure on the canvas and lists it here.
          </p>
        </div>
      )}
    </LgDrawerShell>
  );
}
