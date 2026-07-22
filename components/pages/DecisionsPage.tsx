import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Feather } from "lucide-react";
import { DecisionCardFeature, type DecisionCardFeatureProps } from "../features/DecisionCardFeature";
import { DecisionCard } from "../data-display/DecisionCard";
import { type ImpactDoc } from "../data-display/ImpactPanel";
import { SourceMark } from "../icons/marks";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Tabs } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";

/* Decisions (pages/decisions.md). A decision ledger — one decision, one record,
   ratified by the people accountable. The main column is a timeline of decision
   cards (DecisionCardFeature); the right rail carries "Awaiting sign-off",
   "How this works", and a ledger filter. The prerender canvas walks the ratify
   flow, the run-impact phases (loading / docs / collapsed), the capture composer
   (open / saving), superseded + filtered ledgers, and the load/error/empty edges. */

const STATES = [
  { id: "default", label: "Default — ledger timeline" },
  { id: "awaiting", label: "Awaiting sign-off" },
  { id: "ratifying", label: "Ratify — signing off" },
  { id: "ratified", label: "Ratify — ratified" },
  { id: "impact-loading", label: "Run impact — tracing" },
  { id: "impact-docs", label: "Run impact — docs affected" },
  { id: "impact-collapsed", label: "Run impact — collapsed" },
  { id: "composer", label: "Capture decision — open" },
  { id: "composer-saving", label: "Capture decision — saving" },
  { id: "superseded", label: "Superseded decision" },
  { id: "filtered", label: "Filtered · Ratified" },
  { id: "empty", label: "No decisions yet" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
] as const;

const FILTERS = [
  { id: "all", label: "All", count: 6 },
  { id: "proposed", label: "Proposed", count: 2 },
  { id: "ratified", label: "Ratified", count: 3 },
  { id: "superseded", label: "Superseded", count: 1 },
];

type Decisions = NonNullable<DecisionCardFeatureProps["decisions"]>;
type Impact = Decisions[number]["impact"];

const NO_IMPACT: Impact = { open: false, loading: false, docs: null, tasksCreated: false, count: 0, summary: "" };

const DOCS: ImpactDoc[] = [
  { title: "Auth architecture", source: "gdocs · eng", severity: "update-required", reason: "Describes the old session-cookie flow; must move to short-lived JWTs." },
  { title: "Security review", source: "notion · sec", severity: "review", reason: "Threat model references cookie theft — revisit under the new scheme." },
  { title: "SDK quickstart", source: "github · docs", severity: "minor", reason: "Sample uses the legacy header; low-priority copy change." },
];

const AWAITING: Decisions = [
  { id: 1, statement: "Adopt short-lived JWTs for service-to-service auth", context: "Cookie sessions don't survive our move to multi-region. JWTs with a 10-minute TTL and rotating keys close the replay window.", status: "proposed", fresh: true, source: "Mari scan · #eng-security", provider: "slack", owners: ["Dana Ito", "Reza Okafor"], impact: { ...NO_IMPACT } },
  { id: 2, statement: "Freeze the public API surface for v2", context: "Downstream teams need a stable contract before the SDK release.", status: "proposed", source: "Architecture sync", provider: "gdocs", owners: ["Priya Nair"], impact: { ...NO_IMPACT } },
  { id: 3, statement: "Move CI to the shared runner pool", context: "Dedicated runners sit idle 80% of the day.", status: "proposed", source: "Platform review", provider: "notion", owners: ["Alex Chen"], impact: { ...NO_IMPACT } },
];

const RATIFIED: Decisions = [
  { id: 1, statement: "Adopt short-lived JWTs for service-to-service auth", context: "Cookie sessions don't survive our move to multi-region. JWTs with a 10-minute TTL and rotating keys close the replay window.", status: "ratified", fresh: true, source: "Mari scan · #eng-security", provider: "slack", owners: ["Dana Ito", "Reza Okafor"], decidedOn: "2026-07-21", impact: { ...NO_IMPACT } },
  { id: 2, statement: "Standardize on Postgres 16 across all environments", status: "ratified", source: "Architecture sync", provider: "gdocs", owners: ["Priya Nair"], decidedOn: "2026-07-09", impact: { ...NO_IMPACT, count: 5, summary: "5 documents reference database version constraints." } },
];

const impactDecision = (impact: Impact): Decisions => [
  { id: 1, statement: "Adopt short-lived JWTs for service-to-service auth", context: "Cookie sessions don't survive our move to multi-region. JWTs with a 10-minute TTL and rotating keys close the replay window.", status: "ratified", source: "Architecture sync", provider: "gdocs", owners: ["Dana Ito", "Reza Okafor"], decidedOn: "2026-07-14", impact },
];

const RATIFIED_ONLY: Decisions = [
  { id: 2, statement: "Standardize on Postgres 16 across all environments", context: "Two services still run 13. Aligning removes three migration branches.", status: "ratified", source: "Architecture sync", provider: "gdocs", owners: ["Priya Nair"], decidedOn: "2026-07-09", impact: { ...NO_IMPACT, count: 5, summary: "5 documents reference database version constraints." } },
  { id: 3, statement: "Ship the console as a single-page app, not per-page routes", context: "The agent dock and command palette need to survive navigation.", status: "ratified", source: "Design review", provider: "notion", owners: ["Alex Chen", "Wei Zhang"], decidedOn: "2026-06-28", impact: { ...NO_IMPACT } },
];

const SUPERSEDED: Decisions = [
  { id: 4, statement: "Use REST for the public API surface", status: "superseded", source: "Founders memo", provider: "docs", owners: ["Sam Rowe"], decidedOn: "2025-11-14", supersededBy: "Expose a typed GraphQL gateway in front of the internal services", impact: { ...NO_IMPACT } },
  { id: 5, statement: "Expose a typed GraphQL gateway in front of the internal services", context: "Replaces the REST-only decision; unifies typing across clients.", status: "ratified", source: "Architecture sync", provider: "gdocs", owners: ["Sam Rowe", "Wei Zhang"], decidedOn: "2026-05-02", impact: { ...NO_IMPACT } },
];

function Rail({ filter = "all" }: { filter?: string }) {
  return (
    <aside className="hidden w-72 shrink-0 space-y-4 lg:block">
      <Card variant="plain" title="Awaiting sign-off">
        <ul className="space-y-2 text-[12.5px]">
          <li className="rounded-[5px] border border-ink/12 p-2.5">
            <div className="font-medium text-ink">Adopt short-lived JWTs for service auth</div>
            <div className="mt-1.5"><Button variant="success" compact>Ratify</Button></div>
          </li>
          <li className="rounded-[5px] border border-ink/12 p-2.5">
            <div className="font-medium text-ink">Freeze the public API surface for v2</div>
            <div className="mt-1.5"><Button variant="success" compact>Ratify</Button></div>
          </li>
        </ul>
      </Card>
      <Card variant="plain" title="How this works">
        <p className="text-[12.5px] leading-relaxed text-ink/70">
          Decisions are captured from Slack or written by hand, sit “Proposed” until
          ratified, then can have impact run against the corpus. Superseding a decision
          keeps the old record, struck through.
        </p>
      </Card>
      <Card variant="plain" title="Filter the ledger">
        <Tabs ariaLabel="Filter the ledger" options={FILTERS} value={filter} onChange={() => {}} variant="underline" />
      </Card>
    </aside>
  );
}

function Composer({ saving = false }: { saving?: boolean }) {
  return (
    <Card variant="default" title="Capture decision" className="mt-5">
      <div className="space-y-2.5">
        <input
          className="w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/40"
          placeholder="Statement — the decision, in one sentence"
          defaultValue={saving ? "Adopt trunk-based development for the web app" : ""}
        />
        <textarea
          className="min-h-[72px] w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/40"
          placeholder="Context — why, and what it closes off"
          defaultValue={saving ? "Long-lived feature branches keep drifting; short-lived branches behind flags keep main releasable." : ""}
        />
        <input
          className="w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/40"
          placeholder="Source — e.g. slack · #eng-security"
          defaultValue={saving ? "slack · #eng-web" : ""}
        />
        <div className="flex justify-end gap-2">
          <Button variant="default" disabled={saving}>Cancel</Button>
          <Button variant="primary" disabled={saving}>{saving ? "Capturing…" : "Capture"}</Button>
        </div>
      </div>
    </Card>
  );
}

function Ledger({ decisions, filter = "all" }: { decisions?: Decisions; filter?: string }) {
  return (
    <div className="mt-6 flex items-start gap-6">
      <div className="min-w-0 flex-1"><DecisionCardFeature decisions={decisions} /></div>
      <Rail filter={filter} />
    </div>
  );
}

function Body({ state }: { state: string }) {
  if (state === "loading") {
    return <div className="grid place-items-center py-24"><Spinner size="md" label="Loading decisions" /></div>;
  }
  if (state === "error") {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">The decisions ledger is temporarily unavailable. Retrying…</EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-6">
        <EmptyState title="No decisions yet">
          Capture a decision or run “Scan for decisions” to start the ledger.
        </EmptyState>
      </div>
    );
  }
  if (state === "composer") return (<><Composer /><Ledger /></>);
  if (state === "composer-saving") return (<><Composer saving /><Ledger /></>);
  if (state === "awaiting") return <Ledger decisions={AWAITING} filter="proposed" />;
  if (state === "ratified") return <Ledger decisions={RATIFIED} />;
  if (state === "impact-loading") return <Ledger decisions={impactDecision({ ...NO_IMPACT, open: true, loading: true })} filter="ratified" />;
  if (state === "impact-docs") return <Ledger decisions={impactDecision({ ...NO_IMPACT, open: true, docs: DOCS, count: DOCS.length, summary: "3 documents reference the old cookie-session flow." })} filter="ratified" />;
  if (state === "impact-collapsed") return <Ledger decisions={impactDecision({ ...NO_IMPACT, open: false, docs: DOCS, count: DOCS.length, summary: "3 documents reference the old cookie-session flow." })} filter="ratified" />;
  if (state === "superseded") return <Ledger decisions={SUPERSEDED} filter="superseded" />;
  if (state === "filtered") return <Ledger decisions={RATIFIED_ONLY} filter="ratified" />;
  if (state === "ratifying") {
    return (
      <div className="mt-6 flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <h2 className="font-display text-[19px] text-ink">Decision ledger</h2>
            <p className="mt-0.5 text-[13px] text-ink/60">Proposals awaiting sign-off, ratified decisions, and their downstream impact.</p>
          </div>
          <div className="max-w-[720px]">
            <DecisionCard
              statement="Adopt short-lived JWTs for service-to-service auth"
              context="Cookie sessions don't survive our move to multi-region. JWTs with a 10-minute TTL and rotating keys close the replay window."
              status="proposed"
              fresh
              sourceLabel="Mari scan · #eng-security"
              sourceIcon={<SourceMark provider="slack" size={13} />}
              owners={["Dana Ito", "Reza Okafor"]}
              ratifying
              onRatify={() => {}}
              spine={false}
            />
          </div>
        </div>
        <Rail filter="proposed" />
      </div>
    );
  }
  return <Ledger />;
}

function DecisionsPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("decisions")} title="Decisions" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-biscay-2"><Feather size={26} /></span>}
          eyebrow="Ledger"
          title="Decisions"
          description="One decision, one record — ratified by the people accountable, and traceable across the corpus."
          actions={
            <>
              <Button variant="link">Scan for decisions</Button>
              <Button variant="primary">Capture decision</Button>
            </>
          }
        />
        <Body state={state} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "decisions",
  title: "Decisions",
  route: "/decisions",
  component: DecisionsPage,
  states: STATES.map((s) => ({ ...s })),
};
