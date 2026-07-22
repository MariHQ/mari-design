import { useState } from "react";
import { Sparkles, Layers } from "lucide-react";
import { DecisionCard as DecisionCardUI, type DecisionStatus } from "../data-display/DecisionCard";
import { ImpactPanel as ImpactPanelUI, type ImpactDoc } from "../data-display/ImpactPanel";
import { SourceMark } from "../icons/marks";
import { Button } from "../actions/Button";

/* DecisionCardFeature — the Decisions ledger column: a timeline of decision
   cards, each composing the data-display <DecisionCard> (aliased DecisionCardUI)
   plus, for ratified rows, the shared <ImpactPanel> (ImpactPanelUI) as the
   inline "blast radius" strip with a Create-N-tasks footer. Interactions
   (ratify, run impact, collapse, create tasks) run against baked-in demo
   state — no network. Source: web/src/pages/decisions/DecisionCard.tsx. */

type ImpactState = {
  open: boolean;
  loading: boolean;
  docs: ImpactDoc[] | null;
  tasksCreated: boolean;
  /** Server-persisted readout shown before this session runs impact. */
  count: number;
  summary: string;
};

type Decision = {
  id: number;
  statement: string;
  context?: string;
  status: DecisionStatus;
  fresh?: boolean;
  source: string;
  provider: string;
  owners: string[];
  decidedOn?: string;
  supersededBy?: string;
  impact: ImpactState;
};

const NO_IMPACT: ImpactState = { open: false, loading: false, docs: null, tasksCreated: false, count: 0, summary: "" };

const IMPACT_DOCS: ImpactDoc[] = [
  { title: "Auth architecture", source: "gdocs · eng", severity: "update-required", reason: "Describes the old session-cookie flow; must move to short-lived JWTs." },
  { title: "Security review", source: "notion · sec", severity: "review", reason: "Threat model references cookie theft — revisit under the new scheme." },
  { title: "SDK quickstart", source: "github · docs", severity: "minor", reason: "Sample uses the legacy header; low-priority copy change." },
];

const DEMO: Decision[] = [
  {
    id: 1,
    statement: "Adopt short-lived JWTs for service-to-service auth",
    context: "Cookie sessions don't survive our move to multi-region. JWTs with a 10-minute TTL and rotating keys close the replay window.",
    status: "proposed",
    fresh: true,
    source: "Mari scan · #eng-security",
    provider: "slack",
    owners: ["Dana Ito", "Reza Okafor"],
    impact: { ...NO_IMPACT },
  },
  {
    id: 2,
    statement: "Standardize on Postgres 16 across all environments",
    context: "Two services still run 13. Aligning removes three migration branches and unlocks logical replication.",
    status: "ratified",
    source: "Architecture sync",
    provider: "gdocs",
    owners: ["Priya Nair"],
    decidedOn: "2026-07-09",
    impact: { ...NO_IMPACT, count: 5, summary: "5 documents reference database version constraints." },
  },
  {
    id: 3,
    statement: "Ship the console as a single-page app, not per-page routes",
    context: "The agent dock and command palette need to survive navigation; an SPA keeps them mounted once.",
    status: "ratified",
    source: "Design review",
    provider: "notion",
    owners: ["Alex Chen", "Wei Zhang"],
    decidedOn: "2026-06-28",
    impact: { ...NO_IMPACT },
  },
  {
    id: 4,
    statement: "Use REST for the public API surface",
    status: "superseded",
    source: "Founders memo",
    provider: "docs",
    owners: ["Sam Rowe"],
    decidedOn: "2025-11-14",
    supersededBy: "Expose a typed GraphQL gateway in front of the internal services",
    impact: { ...NO_IMPACT },
  },
];

export type DecisionCardFeatureProps = {
  decisions?: Decision[];
  className?: string;
};

export function DecisionCardFeature({ decisions = DEMO, className = "" }: DecisionCardFeatureProps) {
  const [items, setItems] = useState<Decision[]>(decisions);
  const [ratifying, setRatifying] = useState<number | null>(null);

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

  return (
    <div className={`max-w-[720px] ${className}`.trim()}>
      <div className="mb-4">
        <h2 className="font-display text-[19px] text-ink">Decision ledger</h2>
        <p className="mt-0.5 text-[13px] text-ink/60">
          Proposals awaiting sign-off, ratified decisions, and their downstream impact.
        </p>
      </div>

      {items.map((d, i) => {
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
            <div className="flex items-center gap-2 text-[12.5px] text-ink/70">
              <Layers size={14} className="shrink-0 text-biscay-2" />
              <span>
                <b className="text-ink">{im.count} documents affected</b> · {im.summary}
              </span>
              <Button variant="link" className="ml-1" onClick={() => runImpact(d)}>
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
            statement={d.statement}
            context={d.context}
            status={d.status}
            fresh={d.fresh}
            sourceLabel={d.source}
            sourceIcon={<SourceMark provider={d.provider} size={13} />}
            owners={d.owners}
            decidedOn={d.decidedOn}
            supersededByStatement={d.supersededBy}
            ratifying={ratifying === d.id}
            onRatify={() => ratify(d.id)}
            onSupersede={() => patch(d.id, { status: "superseded", supersededBy: "(pending replacement)" })}
            impact={impactStrip}
            spine={i < items.length - 1}
          />
        );
      })}
    </div>
  );
}
