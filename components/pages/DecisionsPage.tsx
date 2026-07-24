import { useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Feather } from "lucide-react";
import { DecisionCardFeature, type Decision, type DecisionLedgerActions } from "../features/DecisionCardFeature";
import { FieldError } from "../feedback/ErrorMessage";
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

/** What the ledger can DO. Handlers may throw; the page shows the server's own
    message beside the control that tried the write.

    Optional: with none of them the composer, the sign-off buttons and the
    impact strip keep the local behaviour they already had — which is what the
    design canvas, with no server behind it, renders. */
export type DecisionsActions = DecisionLedgerActions & {
  /** Record a new proposal from the capture composer. */
  capture?: (args: { statement: string; context: string; source: string }) => void | Promise<void>;
  /** Read the connected sources for decisions nobody has captured yet. */
  scan?: () => void | Promise<void>;
};

/** Whatever the server said, or a floor when the failure carried no message. */
const why = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

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
function Shell({ data, mobile, actions, composerOpen, onCloseComposer, children }: {
  data: DecisionsData; mobile: boolean; actions?: DecisionsActions;
  composerOpen: boolean; onCloseComposer: () => void; children: React.ReactNode;
}) {
  const composer = data.composer ?? (composerOpen ? BLANK_COMPOSER : null);
  return (
    <div className={mobile ? "flex flex-col gap-5" : SPLIT[320]}>
      <div className="flex min-w-0 flex-col gap-5">
        {composer && <Composer composer={composer} actions={actions} onClose={onCloseComposer} />}
        <LedgerFilter filters={data.filters} filter={data.filter} />
        {data.extras && <StressExtras extras={data.extras} />}
        {children}
      </div>
      <Rail awaiting={data.awaiting} howItWorks={data.howItWorks} decisions={data.decisions} actions={actions} />
    </div>
  );
}

/* The rail signs a proposal off in place. It lists statements, not records, so
   the id the mutation needs is looked up in the ledger the same statements were
   derived from; a statement outside the current filter has no id to sign, and
   the button then keeps its local behaviour rather than writing to a guess. */
function Rail({ awaiting, howItWorks, decisions, actions }: {
  awaiting: string[]; howItWorks: string; decisions: Decision[]; actions?: DecisionsActions;
}) {
  const [signed, setSigned] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const sign = async (statement: string) => {
    const id = decisions.find((d) => d.statement === statement)?.id;
    if (!actions?.ratify || id === undefined) {
      setSigned((s) => [...s, statement]);
      return;
    }
    setBusy(statement);
    setFailed(null);
    try {
      await actions.ratify({ id });
      setSigned((s) => [...s, statement]);
    } catch (e) {
      setFailed(why(e, "That decision could not be ratified."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Card variant="plain" title="Awaiting sign-off">
        <ul className="space-y-2 text-[12.5px]">
          {awaiting.map((statement) => (
            <li key={statement} className="rounded-[5px] border border-ink/12 p-2.5">
              <div className="font-medium text-ink">{statement}</div>
              <div className="mt-1.5">
                {signed.includes(statement) ? (
                  <Chip label="Ratified" tone="ok" dot />
                ) : (
                  <Button variant="success" compact disabled={busy !== null} onClick={() => sign(statement)}>
                    {busy === statement ? "Signing…" : "Ratify"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <FieldError>{failed}</FieldError>
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
/** An empty capture form, for the composer the header button opens. */
const BLANK_COMPOSER: DecisionComposer = { statement: "", context: "", source: "", saving: false };

function Composer({ composer, actions, onClose }: {
  composer: DecisionComposer; actions?: DecisionsActions; onClose: () => void;
}) {
  /* Controlled, because the values have to leave the form: they were
     `defaultValue` on inputs no handler ever read, so Capture was inert. */
  const [statement, setStatement] = useState(composer.statement);
  const [context, setContext] = useState(composer.context);
  const [source, setSource] = useState(composer.source);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const saving = composer.saving || busy;
  const field = "w-full rounded-[5px] border border-ink/20 bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink/65";

  const capture = async () => {
    if (!statement.trim() || saving) return;
    if (!actions?.capture) { onClose(); return; }
    setBusy(true);
    setFailed(null);
    try {
      await actions.capture({ statement: statement.trim(), context: context.trim(), source: source.trim() });
      onClose();
    } catch (e) {
      setFailed(why(e, "That decision could not be captured."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="default" title="Capture decision">
      <div className="space-y-2.5">
        <input
          className={field}
          placeholder="Statement: the decision, in one sentence"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
        <textarea
          className={`min-h-[72px] ${field}`}
          placeholder="Context: why, and what it closes off"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <input
          className={field}
          placeholder="Source: e.g. slack · #eng-security"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <FieldError>{failed}</FieldError>
        <div className="flex items-center gap-2">
          <Button variant="primary" disabled={saving || !statement.trim()} onClick={capture}>
            {saving ? "Capturing…" : "Capture"}
          </Button>
          <Button variant="default" disabled={saving} onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

function Body({ data, error, actions, mobile, composerOpen, onCloseComposer }: {
  data: DecisionsData; error: string | null; actions?: DecisionsActions; mobile: boolean;
  composerOpen: boolean; onCloseComposer: () => void;
}) {
  const shell = { data, mobile, actions, composerOpen, onCloseComposer };
  if (error) return <EmptyState title="API offline">{error}</EmptyState>;
  if (isEmpty(data) && !composerOpen) {
    return (
      <EmptyState title="No decisions yet">
        Capture a decision or run “Scan for decisions” to start the ledger.
      </EmptyState>
    );
  }
  if (data.ratify) {
    const r = data.ratify;
    return (
      <Shell {...shell}>
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
    <Shell {...shell}>
      <DecisionCardFeature decisions={data.decisions} actions={actions} />
    </Shell>
  );
}

/* "Scan for decisions" is a long read of every connected source, so it reports
   what it found rather than finishing silently. */
function ScanButton({ scan }: { scan?: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const run = async () => {
    if (!scan || busy) return;
    setBusy(true);
    setFailed(null);
    try { await scan(); } catch (e) { setFailed(why(e, "The scan could not be run.")); } finally { setBusy(false); }
  };
  return (
    <span className="inline-flex flex-col items-start">
      <Button variant="link" disabled={busy} onClick={run}>
        {busy ? "Scanning sources…" : "Scan for decisions"}
      </Button>
      <FieldError>{failed}</FieldError>
    </span>
  );
}

function DecisionsPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<DecisionsData, DecisionsActions>) {
  /* The composer is a mode of this page, not a property of the ledger: the
     header button opens it whether or not an app pre-opened one in `data`. */
  const [composerOpen, setComposerOpen] = useState(false);
  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("decisions")} title="Decisions" mobile={mobile}>
        <SkeletonPage variant="feed" />
      </PageFrame>
    );
  }
  const headerActions = (
    <>
      <ScanButton scan={actions?.scan} />
      <Button variant="primary" onClick={() => setComposerOpen(true)}>Capture decision</Button>
    </>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("decisions")} title="Decisions" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-biscay-2"><Feather size={26} /></span>}
          eyebrow="Ledger"
          title="Decisions"
          description="One decision, one record: ratified by the people accountable, and traceable across the corpus."
          actions={mobile ? undefined : headerActions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
        <div className="mt-6">
          <Body
            data={data}
            error={error}
            actions={actions}
            mobile={mobile}
            composerOpen={composerOpen}
            onCloseComposer={() => setComposerOpen(false)}
          />
        </div>
      </div>
    </PageFrame>
  );
}

export const page: PageModule<DecisionsData, DecisionsActions> = {
  id: "decisions",
  title: "Decisions",
  route: "/decisions",
  component: DecisionsPage,
  states: STATES.map((s) => ({ ...s })),
};
