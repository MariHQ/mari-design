import { useEffect, useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Feather, Workflow } from "lucide-react";
import { DecisionCardFeature, type Decision, type DecisionLedgerActions } from "../features/DecisionCardFeature";
import { FieldError } from "../feedback/ErrorMessage";
import { ScanRunCard, type ScanRun } from "../features/ScanRunCard";
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

/** One tab of the ledger filter, with the number of records behind it.
    `status` is which records it shows; a tab without one shows every record. */
export type LedgerFilterTab = { id: string; label: string; count: number; status?: Decision["status"] };

/** "superseded" is the ledger's old spelling of "ignored", so a tab for either
    word has to match records recorded under both. */
const resolved = (s: Decision["status"]) => (s === "superseded" ? "ignored" : s);

const inTab = (decisions: Decision[], tab?: LedgerFilterTab): Decision[] =>
  tab?.status ? decisions.filter((d) => resolved(d.status) === resolved(tab.status!)) : decisions;

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
  /** Read the connected sources for decisions nobody has captured yet, as a
      background run, and answer with it so the page can follow it. Long: the
      run outlives this call. */
  scan?: () => ScanRun | Promise<ScanRun> | void | Promise<void>;
  /** Re-read a scan the page started. Polled until the run stops running;
      without it the page shows the run once and does not follow it. */
  scanProgress?: (id: string) => ScanRun | Promise<ScanRun>;
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
function Shell({ data, mobile, actions, composerOpen, onCloseComposer, filter, onFilter, children }: {
  data: DecisionsData; mobile: boolean; actions?: DecisionsActions;
  composerOpen: boolean; onCloseComposer: () => void;
  filter: string; onFilter: (id: string) => void;
  children: React.ReactNode;
}) {
  const composer = data.composer ?? (composerOpen ? BLANK_COMPOSER : null);
  return (
    <div className={mobile ? "flex flex-col gap-5" : SPLIT[320]}>
      <div className="flex min-w-0 flex-col gap-5">
        {composer && <Composer composer={composer} actions={actions} onClose={onCloseComposer} />}
        <LedgerFilter filters={data.filters} filter={filter} onChange={onFilter} />
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
    place Facts puts its status filter, and wide enough that no tab clips.

    It is the ledger's only filter. The timeline used to carry a second row of
    facet chips with its own state, so this strip changed nothing and the two
    could disagree about what was selected. */
function LedgerFilter({ filters, filter, onChange }: {
  filters: LedgerFilterTab[]; filter: string; onChange: (id: string) => void;
}) {
  return <Tabs ariaLabel="Filter the ledger" options={filters} value={filter} onChange={onChange} />;
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
  /* The page owns the filter, and `data.filter` says which tab it opens on:
     the tab strip was wired to a no-op while the timeline filtered itself. */
  const [filter, setFilter] = useState(data.filter);
  const shell = { data, mobile, actions, composerOpen, onCloseComposer, filter, onFilter: setFilter };
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
      <DecisionCardFeature
        decisions={inTab(data.decisions, data.filters.find((f) => f.id === filter))}
        actions={actions}
      />
    </Shell>
  );
}

/* "Scan for decisions" is a multi-minute model pass over every connected
   source that writes to the ledger. It was a `variant="link"` that awaited the
   call and forgot it: no run, no progress, no history — the same shape the
   fact scan had. It starts a real run now and the page follows it. */
function ScanButton({ scan, onStarted }: {
  scan?: DecisionsActions["scan"];
  onStarted: (run: ScanRun) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const run = async () => {
    if (!scan || busy) return;
    setBusy(true);
    setFailed(null);
    try {
      const started = await scan();
      // A handler that answers with a run gets followed; one that only
      // succeeds keeps the old fire-and-forget behaviour, which is what the
      // canvas renders.
      if (started && typeof started === "object" && "id" in started) onStarted(started as ScanRun);
    } catch (e) {
      setFailed(why(e, "The scan could not be run."));
    } finally { setBusy(false); }
  };
  return (
    <span className="inline-flex flex-col items-start">
      <Button variant="default" compact disabled={busy} onClick={run}>
        <Workflow size={15} /> {busy ? "Starting…" : "Scan for decisions"}
      </Button>
      <FieldError>{failed}</FieldError>
    </span>
  );
}

function DecisionsPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<DecisionsData, DecisionsActions>) {
  /* The composer is a mode of this page, not a property of the ledger: the
     header button opens it whether or not an app pre-opened one in `data`. */
  const [composerOpen, setComposerOpen] = useState(false);

  /* The run the scan button started, followed until it stops. Same shape the
     Facts page uses, through the same card, so the two cannot drift. */
  const [scan, setScan] = useState<ScanRun | null>(null);
  const poll = actions?.scanProgress;
  useEffect(() => {
    if (!scan || !poll) return;
    if (scan.status !== "running" && scan.status !== "pending") return;
    const t = setInterval(() => {
      // A failed poll leaves the last good reading on screen: losing the card
      // mid-run would look like the run vanished.
      Promise.resolve(poll(scan.id)).then(setScan).catch(() => {});
    }, 1500);
    return () => clearInterval(t);
  }, [scan, poll]);

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("decisions")} title="Decisions" mobile={mobile}>
        <SkeletonPage variant="feed" />
      </PageFrame>
    );
  }
  const headerActions = (
    <>
      <ScanButton scan={actions?.scan} onStarted={setScan} />
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
        {scan && (
          <div className="mt-5">
            <ScanRunCard
              run={scan}
              noun="decision"
              label="Reading connected sources"
              destination="awaiting sign-off"
              onDismiss={() => setScan(null)}
            />
          </div>
        )}
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
