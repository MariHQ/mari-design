import { useState } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { ImpactPanel as ImpactPanelUI, type ImpactDoc } from "../data-display/ImpactPanel";
import { StatusChip } from "../data-display/Chip";
import { Button } from "../actions/Button";
import { card } from "../tokens/card";
import { fmtAgo } from "../tokens/format";

/* ImpactPanelFeature — the Facts-page context around the shared <ImpactPanel>.
   A verified fact row, expanded, offering "Run impact analysis": Mari traces
   the documents that depend on the claim and lists them with severity chips.
   Composes the data-display <ImpactPanel> (aliased to ImpactPanelUI) inside
   the fact card's chrome. Renders standalone with baked-in demo data.
   Source: web/src/pages/facts.tsx (expanded fact row → ImpactPanel). */

export type ImpactPanelFeatureProps = {
  claim?: string;
  source?: string;
  verifiedAt?: string;
  summary?: string;
  docs?: ImpactDoc[];
  /** Start with the impact strip already resolved (skip the run affordance). */
  analyzed?: boolean;
  className?: string;
};

const DEMO_DOCS: ImpactDoc[] = [
  { title: "Pricing & Plans", source: "gdocs · handbook", severity: "update-required", reason: "States the free tier caps at 3 seats — this claim raises it to 5." },
  { title: "Onboarding checklist", source: "notion · CS", severity: "review", reason: "Mentions seat limits in step 4; may need a wording pass." },
  { title: "Sales one-pager", source: "slack · #gtm", severity: "minor", reason: "References 'small teams' loosely; likely unaffected." },
];

const DEMO_SUMMARY =
  "3 documents reference the free-tier seat limit. Raising it to 5 makes one of them stale and puts another up for review.";

export function ImpactPanelFeature({
  claim = "The free tier includes up to 5 seats per workspace.",
  source = "github · billing/limits.ts",
  verifiedAt = new Date(Date.now() - 26 * 3600_000).toISOString(),
  summary = DEMO_SUMMARY,
  docs = DEMO_DOCS,
  analyzed = false,
  className = "",
}: ImpactPanelFeatureProps) {
  type Phase = "idle" | "loading" | "done";
  const [phase, setPhase] = useState<Phase>(analyzed ? "done" : "idle");

  const run = () => {
    setPhase("loading");
    setTimeout(() => setPhase("done"), 1100);
  };

  return (
    <div className={`max-w-[720px] ${className}`.trim()}>
      <article className={`${card} p-4`}>
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-moss" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              <q className="not-italic">{claim}</q>
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusChip status="verified" />
              <span className="font-term text-[11px] text-ink/50">{source}</span>
              <span className="font-term text-[11px] text-ink/45">verified {fmtAgo(verifiedAt)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 border-t border-ink/10 pt-3.5">
          {phase === "idle" ? (
            <Button compact onClick={run}>
              <Sparkles size={13} /> Run impact analysis
            </Button>
          ) : phase === "loading" ? (
            <ImpactPanelUI loading />
          ) : (
            <ImpactPanelUI
              boxed
              summary={summary}
              docs={docs}
              onClose={() => setPhase("idle")}
              footer={
                <>
                  <Button variant="primary" compact>
                    Create {docs.length} tasks
                  </Button>
                  <span className="font-term text-[11px] text-ink/50">
                    one per affected document
                  </span>
                </>
              }
            />
          )}
        </div>
      </article>
    </div>
  );
}
