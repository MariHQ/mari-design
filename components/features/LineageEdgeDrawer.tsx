import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Chip } from "../data-display/Chip";
import { Field } from "../forms/Field";
import { SectionLabel } from "../forms/SectionLabel";
import { fmtDate } from "../tokens/format";
import { GithubMark } from "../icons";
import { SkeletonCircle, SkeletonLine, SkeletonChip, SkeletonText, SkeletonList } from "../data-display/Skeleton";
import {
  REL, EdgeSwatch, NodeGlyph, LgDrawerShell, SOURCE_LABELS,
  DEMO_NODES, DEMO_EDGES, nodeById,
  type LNode, type LEdge,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage edge drawer (feature: lineage-edge-drawer)

   The relationship (edge) detail panel — the same non-modal `.lg-drawer` shell
   as the node drawer, in an "edge flavor." Opens when a passthrough (non-
   aggregated) edge is tapped. Describes one typed link between two documents,
   its provenance status, evidence, and both endpoints (each jumps to the node
   drawer). Fully derived, no queries. Standalone with a baked-in demo edge.
   ──────────────────────────────────────────────────────────────────────── */

export type LineageEdgeDrawerProps = {
  nodes?: LNode[];
  edges?: LEdge[];
  /** Which edge to open (defaults to a demo edge with evidence + note). */
  edgeId?: string;
  onSelectNode?: (id: string) => void;
  onClose?: () => void;
  /** Render a content-shaped skeleton silhouette instead of the drawer body. */
  loading?: boolean;
  className?: string;
};

export function LineageEdgeDrawer({
  nodes = DEMO_NODES, edges = DEMO_EDGES, edgeId = "e3", onSelectNode, onClose, loading = false, className = "",
}: LineageEdgeDrawerProps) {
  const byId = useMemo(() => nodeById(nodes), [nodes]);
  const [openId] = useState(edgeId);
  const edge = edges.find((e) => e.id === openId) ?? edges[0];
  const from = byId[edge.from];
  const to = byId[edge.to];
  const s = REL[edge.rel];
  const confirmed = edge.meta?.status === "confirmed";
  const statusLabel = confirmed ? "Confirmed" : edge.llm ? "Derived by Mari" : "Observed";

  if (loading) {
    return (
      <LgDrawerShell
        className={className}
        onClose={onClose}
        icon={<SkeletonCircle size={19} />}
        title={<SkeletonLine w="75%" h={14} />}
        pills={<><SkeletonChip w={80} /><SkeletonChip w={64} /></>}
      >
        <div className="mb-3"><SkeletonLine w="40%" h={12} /></div>
        <SkeletonText lines={3} />
        <div className="mt-4"><SkeletonList rows={2} /></div>
      </LgDrawerShell>
    );
  }

  return (
    <LgDrawerShell
      className={className}
      onClose={onClose}
      icon={<EdgeSwatch rel={edge.rel} width={24} dashed={edge.dashed} />}
      title={
        <span className="inline-flex items-center gap-1.5">
          <span className="truncate">{from?.title}</span>
          <span className="text-ink/40">→</span>
          <span className="truncate">{to?.title}</span>
        </span>
      }
      pills={
        <>
          <Chip label={s.label} tone="neutral" icon={<EdgeSwatch rel={edge.rel} width={16} dashed={edge.dashed} />} />
          {edge.llm && <Chip label="Derived by Mari" tone="info" />}
        </>
      }
      footer={
        <a href="#" className={`inline-flex items-center gap-1 text-[12.5px] text-biscay-2 hover:underline ${focusRing}`}>
          Open source document <ExternalLink size={12} />
        </a>
      }
    >
      <SectionLabel>Link</SectionLabel>
      <div className="mt-1">
        <Field label="Relation">
          <span style={{ color: s.color }}>{s.label.toLowerCase()}</span>
        </Field>
        <Field label="Status">
          <Chip label={statusLabel} tone={confirmed ? "ok" : edge.llm ? "info" : "neutral"} dot={confirmed} />
        </Field>
        {edge.meta?.evidence && (
          <Field label="Evidence">
            <span className="inline-flex items-center gap-1.5">
              <GithubMark size={14} /> <span className="font-term text-[12px]">{edge.meta.evidence}</span>
            </span>
          </Field>
        )}
        {edge.date && <Field label="Last seen">{fmtDate(edge.date)}</Field>}
        {edge.meta?.note && <Field label="Summary">{edge.meta.note}</Field>}
      </div>

      <div className="mt-4">
        <SectionLabel>Endpoints</SectionLabel>
        <div className="mt-1.5">
          {from && (
            <div className="flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 -mx-2 hover:bg-flysch/60">
              <span className="shrink-0 text-ink/70"><NodeGlyph node={from} size={17} /></span>
              <button type="button" onClick={() => onSelectNode?.(from.id)} className={`min-w-0 flex-1 text-left ${focusRing} rounded-[3px]`}>
                <span className="block truncate text-[13px] text-ink"><span className="text-ink/40">→ </span>{from.title}</span>
                <span className="block truncate font-term text-[11px] text-ink/50">{[from.owner, SOURCE_LABELS[from.source]].filter(Boolean).join(" · ")}</span>
              </button>
            </div>
          )}
          {to && (
            <div className="flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 -mx-2 hover:bg-flysch/60">
              <span className="shrink-0 text-ink/70"><NodeGlyph node={to} size={17} /></span>
              <button type="button" onClick={() => onSelectNode?.(to.id)} className={`min-w-0 flex-1 text-left ${focusRing} rounded-[3px]`}>
                <span className="block truncate text-[13px] text-ink"><span className="text-ink/40">← </span>{to.title}</span>
                <span className="block truncate font-term text-[11px] text-ink/50">{[to.owner, SOURCE_LABELS[to.source]].filter(Boolean).join(" · ")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </LgDrawerShell>
  );
}
