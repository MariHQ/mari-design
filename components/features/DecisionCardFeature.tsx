import { useState } from "react";
import { Sparkles, Layers } from "lucide-react";
import { DecisionCard as DecisionCardUI, type DecisionStatus } from "../data-display/DecisionCard";
import { ImpactPanel as ImpactPanelUI, type ImpactDoc } from "../data-display/ImpactPanel";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SourceMark } from "../icons/marks";
import { Button } from "../actions/Button";
import { Skeleton, SkeletonLine } from "../data-display/Skeleton";

/* DecisionCardFeature — the Decisions ledger column: a timeline of decision
   cards, each composing the data-display <DecisionCard> (aliased DecisionCardUI)
   plus, for ratified rows, the shared <ImpactPanel> (ImpactPanelUI) as the
   inline "blast radius" strip with a Create-N-tasks footer. Interactions
   (ratify, run impact, collapse, create tasks) run against baked-in demo
   state — no network. Source: web/src/pages/decisions/DecisionCard.tsx. */

/** The impact readout carried on a ledger entry. */
export type ImpactState = {
  open: boolean;
  loading: boolean;
  docs: ImpactDoc[] | null;
  tasksCreated: boolean;
  /** Server-persisted readout shown before this session runs impact. */
  count: number;
  summary: string;
};

/** One ledger entry. Exported so pages and fixtures compose this shape
    rather than redeclaring it. */
export type Decision = {
  id: number;
  statement: string;
  context?: string;
  status: DecisionStatus;
  fresh?: boolean;
  source: string;
  provider: string;
  owners: string[];
  decidedOn?: string;
  /** The decision this one was set aside for. */
  ignoredFor?: string;
  /** @deprecated Use `ignoredFor`. Kept so existing pages keep compiling. */
  supersededBy?: string;
  impact: ImpactState;
};

/* The ledger calls setting a decision aside "Ignored", never "superseded".
   These labels drive the facet chips so the copy and the cards agree. */
type Facet = "all" | "proposed" | "ratified" | "ignored";
const FACETS: { value: Facet; label: string }[] = [
  { value: "all", label: "All decisions" },
  { value: "proposed", label: "Proposed" },
  { value: "ratified", label: "Ratified" },
  { value: "ignored", label: "Ignored" },
];

/** A decision with no impact run against it yet. Zero values, not content. */
export const NO_IMPACT: ImpactState = { open: false, loading: false, docs: null, tasksCreated: false, count: 0, summary: "" };

const IMPACT_DOCS: ImpactDoc[] = [
  { title: "Auth architecture", source: "gdocs · eng", severity: "update-required", reason: "Describes the old session-cookie flow; it must move to short-lived JWTs." },
  { title: "Security review", source: "notion · sec", severity: "review", reason: "Threat model references cookie theft, so revisit it under the new scheme." },
  { title: "SDK quickstart", source: "github · docs", severity: "minor", reason: "Sample uses the legacy header; low-priority copy change." },
];

export type DecisionCardFeatureProps = {
  decisions: Decision[];
  /** Render a content-shaped skeleton timeline while the ledger loads. */
  loading?: boolean;
  className?: string;
};

export function DecisionCardFeature({ decisions, loading = false, className = "" }: DecisionCardFeatureProps) {
  const [items, setItems] = useState<Decision[]>(decisions);
  const [ratifying, setRatifying] = useState<number | null>(null);
  const [filter, setFilter] = useState<Facet>("all");

  const resolved = (d: Decision) => (d.status === "superseded" ? "ignored" : d.status);
  const counts: Record<Facet, number> = {
    all: items.length,
    proposed: items.filter((d) => resolved(d) === "proposed").length,
    ratified: items.filter((d) => resolved(d) === "ratified").length,
    ignored: items.filter((d) => resolved(d) === "ignored").length,
  };
  const shown = filter === "all" ? items : items.filter((d) => resolved(d) === filter);

  const patch = (id: number, next: Partial<Decision>) =>
    setItems((cur) => cur.map((d) => (d.id === id ? { ...d, ...next } : d)));
  const patchImpact = (id: number, next: Partial<ImpactState>) =>
    setItems((cur) => cur.map((d) => (d.id === id ? { ...d, impact: { ...d.impact, ...next } } : d)));

  const ratify = (id: number) => {
    if (ratifying !== null) return;
    setRatifying(id);
    setTimeout(() => {
      patch(id, { status: "ratified", decidedOn: new Date().toISOString() });
      setRatifying(null);
    }, 800);
  };

  const runImpact = (d: Decision) => {
    if (d.impact.docs) {
      patchImpact(d.id, { open: !d.impact.open });
      return;
    }
    patchImpact(d.id, { open: true, loading: true });
    setTimeout(() => patchImpact(d.id, { loading: false, docs: IMPACT_DOCS }), 1100);
  };

  const createTasks = (d: Decision) => {
    if (!d.impact.docs || d.impact.tasksCreated) return;
    patchImpact(d.id, { tasksCreated: true });
  };

  if (loading) {
    return (
      <div className={`max-w-[720px] ${className}`.trim()} aria-hidden="true">
        <div className="mb-4 space-y-2">
          <Skeleton width={170} height={19} />
          <SkeletonLine w={420} h={11} />
        </div>
        {[0, 1, 2].map((i) => (
          <DecisionCardUI key={i} loading spine={i < 2} statement="" status="proposed" />
        ))}
      </div>
    );
  }

  return (
    <div className={`max-w-[720px] ${className}`.trim()}>
      <div className="mb-4">
        <h2 className="font-display text-[19px] text-ink">Decision ledger</h2>
        <p className="mt-0.5 text-[13px] text-ink/70">
          Proposals awaiting sign-off, ratified decisions, the ones the team set aside, and their downstream impact.
        </p>
        {/* Facet counts read from the live ledger, so the labels and the
            numbers can never drift apart. The old copy still said
            "superseded" while the cards already rendered "Ignored". */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {FACETS.map((f) => (
            <Chip
              key={f.value}
              label={`${f.label} ${counts[f.value]}`}
              tone={f.value === filter ? "info" : "neutral"}
              selected={f.value === filter}
              onClick={() => setFilter(f.value)}
            />
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <EmptyState title="Nothing in this filter">No decisions match the {FACETS.find((f) => f.value === filter)?.label.toLowerCase()} filter yet.</EmptyState>
      )}

      {shown.map((d, i) => {
        const im = d.impact;
        const impactStrip =
          d.status !== "ratified" ? undefined : im.loading ? (
            <ImpactPanelUI loading loadingText="Mari is tracing the blast radius…" />
          ) : im.open && im.docs ? (
            <ImpactPanelUI
              summary={im.summary || undefined}
              docs={im.docs}
              onClose={() => patchImpact(d.id, { open: false })}
              footer={
                im.tasksCreated ? (
                  <span className="font-term text-[11.5px] text-moss">{im.docs.length} tasks created</span>
                ) : (
                  <Button variant="primary" compact onClick={() => createTasks(d)}>
                    Create {im.docs.length} tasks
                  </Button>
                )
              }
            />
          ) : im.docs ? (
            <Button variant="link" onClick={() => patchImpact(d.id, { open: true })}>
              Show impact analysis
            </Button>
          ) : im.count > 0 ? (
            /* flex-wrap + shrink-0: in a narrow card the summary squeezed the
               "Re-run" link to one character per line. */
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink/70">
              <Layers size={14} className="shrink-0 text-biscay-2" />
              <span className="min-w-0 flex-1">
                <b className="text-ink">{im.count} documents affected</b> · {im.summary}
              </span>
              <Button variant="link" className="shrink-0" onClick={() => runImpact(d)}>
                Re-run
              </Button>
            </div>
          ) : (
            <Button compact onClick={() => runImpact(d)}>
              <Sparkles size={13} /> Run impact analysis
            </Button>
          );

        return (
          <DecisionCardUI
            key={d.id}
            /* Every nowrap box in the card (the source chip, the date/owner
               group) has to be allowed to shrink, or one long source label
               pins the meta row at its full width and the card spills past
               its own border. Chips shrink on their own now; CardMeta keeps
               its own min-width floor on the tag block, so no child override. */
            className="[&_.whitespace-nowrap]:min-w-0 [&_.whitespace-nowrap]:overflow-hidden"
            statement={d.statement}
            context={d.context}
            status={d.status}
            fresh={d.fresh}
            sourceLabel={d.source}
            sourceIcon={<SourceMark provider={d.provider} size={13} />}
            owners={d.owners}
            decidedOn={d.decidedOn}
            ignoredForStatement={d.ignoredFor ?? d.supersededBy}
            ratifying={ratifying === d.id}
            onRatify={() => ratify(d.id)}
            onIgnore={() => patch(d.id, { status: "ignored", ignoredFor: "(pending replacement)" })}
            impact={impactStrip}
            spine={i < shown.length - 1}
          />
        );
      })}
    </div>
  );
}
