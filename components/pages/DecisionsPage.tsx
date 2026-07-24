import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Feather } from "lucide-react";
import { DecisionCardFeature, type Decision } from "../features/DecisionCardFeature";
import { DecisionCard } from "../data-display/DecisionCard";
import { SourceMark } from "../icons/marks";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Tabs } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Chip } from "../index";
import { AvatarGroup } from "../index";
import { Breadcrumb } from "../index";

/* Decisions (pages/decisions.md). A decision ledger — one decision, one record,
   ratified by the people accountable. The main column is a timeline of decision
   cards (DecisionCardFeature); the right rail carries "Awaiting sign-off",
   "How this works", and a ledger filter.

   This page is a pure presenter: it holds no demo content. The ledger, the
   rail, and the composer all arrive in `data`, so a workspace that has never
   recorded a decision renders the empty state rather than someone's invented
   ledger. The design canvas supplies the same shape from
   `.preview/fixtures/decisions.ts`. */

const STATES = [
  { id: "default", label: "Default: ledger timeline" },
  { id: "awaiting", label: "Awaiting sign-off" },
  { id: "ratifying", label: "Ratify: signing off" },
  { id: "ratified", label: "Ratify: ratified" },
  { id: "impact-loading", label: "Run impact: tracing" },
  { id: "impact-docs", label: "Run impact: docs affected" },
  { id: "impact-collapsed", label: "Run impact: collapsed" },
  { id: "composer", label: "Capture decision: open" },
  { id: "composer-saving", label: "Capture decision: saving" },
  { id: "superseded", label: "Superseded decision" },
  { id: "filtered", label: "Filtered · Ratified" },
  { id: "empty", label: "No decisions yet" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** One tab of the ledger filter, with the number of records behind it. */
export type LedgerFilterTab = { id: string; label: string; count: number };

/** The capture composer, prefilled with whatever the user has typed so far. */
export type DecisionComposer = {
  statement: string;
  context: string;
  source: string;
  /** The capture is in flight: the buttons lock and the primary reads
      "Capturing…". */
  saving: boolean;
};

/** A single decision pulled out for sign-off, in place of the timeline. */
export type RatifyCard = {
  statement: string;
  context: string;
  status: Decision["status"];
  fresh: boolean;
  sourceLabel: string;
  /** Source key, e.g. "slack". The page draws the mark; data stays JSON. */
  provider: string;
  owners: string[];
};

/** The accountability strip above the timeline: where a decision sits in the
    knowledge base, its tags, and everyone signed on to it. */
export type DecisionExtras = {
  breadcrumb: string[];
  tags: string[];
  /** Initials of the accountable people. */
  people: string[];
  /** Avatars shown before the stack rolls up into a "+N". */
  avatarMax: number;
};

/** Everything the Decisions page renders. */
export type DecisionsData = {
  decisions: Decision[];
  /** Which ledger filter tab is selected. */
  filter: string;
  filters: LedgerFilterTab[];
  /** Rail: statements still waiting for a signature. */
  awaiting: string[];
  /** Rail: the explainer paragraph. */
  howItWorks: string;
  composer: DecisionComposer | null;
  ratify: RatifyCard | null;
  extras: DecisionExtras | null;
};

/** A ledger with nothing in it at all. Derived from the data, not from a state
    flag, so it is true in the real app for exactly the same reason it is true
    on the canvas. */
function isEmpty(d: DecisionsData): boolean {
  return !d.decisions.length && !d.ratify && !d.composer && !d.extras && !d.awaiting.length;
}

function StressExtras({ extras }: { extras: DecisionExtras }) {
  return (
    <Card variant="plain" title="Accountable & tags">
      <div className="space-y-3">
        <Breadcrumb items={extras.breadcrumb.map((label) => ({ label }))} />
        <div className="flex flex-wrap gap-1.5">
          {extras.tags.map((t, i) => <Chip key={i} label={t} tone="info" />)}
        </div>
        <AvatarGroup people={extras.people.map((initials) => ({ initials }))} max={extras.avatarMax} />
      </div>
    </Card>
  );
}

/** Main column + the standard 320px rail (§11). One plumb line for every
    ledger view: `minmax(0,1fr)` keeps long content from pushing the rail out,
    and mobile drops the rail below the main column. */
function Shell({ data, mobile, children }: { data: DecisionsData; mobile: boolean; children: React.ReactNode }) {
  return (
    <div className={mobile ? "flex flex-col gap-5" : SPLIT[320]}>
      <div className="flex min-w-0 flex-col gap-5">
        {data.composer && <Composer composer={data.composer} />}
        <LedgerFilter filters={data.filters} filter={data.filter} />
        {data.extras && <StressExtras extras={data.extras} />}
        {children}
      </div>
      <Rail awaiting={data.awaiting} howItWorks={data.howItWorks} />
    </div>
  );
}

function Rail({ awaiting, howItWorks }: { awaiting: string[]; howItWorks: string }) {
  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Card variant="plain" title="Awaiting sign-off">
        <ul className="space-y-2 text-[12.5px]">
          {awaiting.map((statement) => (
            <li key={statement} className="rounded-[5px] border border-ink/12 p-2.5">
              <div className="font-medium text-ink">{statement}</div>
              <div className="mt-1.5"><Button variant="success" compact>Ratify</Button></div>
            </li>
          ))}
        </ul>
      </Card>
      <Card variant="plain" title="How this works">
        <p className="text-[12.5px] leading-relaxed text-ink/70">{howItWorks}</p>
      </Card>
    </aside>
  );
}

/** The ledger filter lives in the main column, above the timeline: the same
    place Facts puts its status filter, and wide enough that no tab clips. */
function LedgerFilter({ filters, filter }: { filters: LedgerFilterTab[]; filter: string }) {
  return <Tabs ariaLabel="Filter the ledger" options={filters} value={filter} onChange={() => {}} />;
}

/* The composer sits at the top of the main column, not above the whole layout:
   otherwise it runs edge-to-edge while the ledger below it stops at the rail
   (§11 "cards share the same left and right edge"). */
function Composer({ composer }: { composer: DecisionComposer }) {
  const { saving } = composer;
  return (
    <Card variant="default" title="Capture decision">
      <div className="space-y-2.5">
        <input
          className="w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/65"
          placeholder="Statement: the decision, in one sentence"
          defaultValue={composer.statement}
        />
        <textarea
          className="min-h-[72px] w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/65"
          placeholder="Context: why, and what it closes off"
          defaultValue={composer.context}
        />
        <input
          className="w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/65"
          placeholder="Source: e.g. slack · #eng-security"
          defaultValue={composer.source}
        />
        <div className="flex items-center gap-2">
          <Button variant="primary" disabled={saving}>{saving ? "Capturing…" : "Capture"}</Button>
          <Button variant="default" disabled={saving}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function Body({ data, error, mobile }: { data: DecisionsData; error: string | null; mobile: boolean }) {
  if (error) return <EmptyState title="API offline">{error}</EmptyState>;
  if (isEmpty(data)) {
    return (
      <EmptyState title="No decisions yet">
        Capture a decision or run “Scan for decisions” to start the ledger.
      </EmptyState>
    );
  }
  if (data.ratify) {
    const r = data.ratify;
    return (
      <Shell data={data} mobile={mobile}>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-[19px] text-ink">Decision ledger</h2>
            <p className="mt-0.5 text-[13px] text-ink/70">Proposals awaiting sign-off, ratified decisions, and their downstream impact.</p>
          </div>
          <div>
            <DecisionCard
              statement={r.statement}
              context={r.context}
              status={r.status}
              fresh={r.fresh}
              sourceLabel={r.sourceLabel}
              sourceIcon={<SourceMark provider={r.provider} size={13} />}
              owners={r.owners}
              ratifying
              onRatify={() => {}}
              spine={false}
            />
          </div>
        </div>
      </Shell>
    );
  }
  return (
    <Shell data={data} mobile={mobile}>
      <DecisionCardFeature decisions={data.decisions} />
    </Shell>
  );
}

function DecisionsPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<DecisionsData>) {
  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("decisions")} title="Decisions" mobile={mobile}>
        <SkeletonPage variant="feed" />
      </PageFrame>
    );
  }
  const actions = (
    <>
      <Button variant="link">Scan for decisions</Button>
      <Button variant="primary">Capture decision</Button>
    </>
  );
  return (
    <PageFrame active={navFor("decisions")} title="Decisions" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-biscay-2"><Feather size={26} /></span>}
          eyebrow="Ledger"
          title="Decisions"
          description="One decision, one record: ratified by the people accountable, and traceable across the corpus."
          actions={mobile ? undefined : actions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <div className="mt-6">
          <Body data={data} error={error} mobile={mobile} />
        </div>
      </div>
    </PageFrame>
  );
}

export const page: PageModule<DecisionsData> = {
  id: "decisions",
  title: "Decisions",
  route: "/decisions",
  component: DecisionsPage,
  states: STATES.map((s) => ({ ...s })),
};
