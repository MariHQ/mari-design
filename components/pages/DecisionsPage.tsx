import { useEffect, useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Feather, Workflow } from "lucide-react";
import { DecisionCardFeature, type Decision, type DecisionLedgerActions } from "../features/DecisionCardFeature";
import { ReadError } from "../feedback/ReadError";
import { WriteError } from "../feedback/WriteError";
import { useWrite, why } from "../actions/useWrite";
import { ScanRunCard, type ScanRun } from "../features/ScanRunCard";
import { DecisionCard } from "../data-display/DecisionCard";
import { SourceMark } from "../icons/marks";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Card } from "../layout/Card";
import { Tabs } from "../navigation/Tabs";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Truncate } from "../data-display/Truncate";
import { FormField } from "../forms/FormField";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
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
  { id: "error", label: "Error / service unavailable" },
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
  /** The ledger id being signed. Without it the pane can only show the record,
      never sign it — the card used to be handed `onRatify={() => {}}`, so the
      primary action of the whole view did nothing (P-DE-2). */
  id?: number;
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

/** Everything the Decisions page renders. */
export type DecisionsData = {
  decisions: Decision[];
  /** Which ledger filter tab is selected. */
  filter: string;
  filters: LedgerFilterTab[];
  /** @deprecated The rail derives what is awaiting sign-off from `decisions`
      itself. It used to read this list of statements and then look each one's
      id back up BY MATCHING THE STATEMENT STRING; a statement whose record was
      outside the current filter found no id and fell back to a local-only
      "Ratified" chip that never reached the server (P-DE-3). Records carry
      ids, so the rail uses the records.

      Still required only because `web/src/data/decisions.ts` and the smoke
      harness still build it; nothing reads it. Drop it from both and this
      field goes with them. */
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
  // `awaiting` is derived from `decisions`, so an empty ledger is empty.
  return !d.decisions.length && !d.ratify && !d.composer && !d.extras;
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
        {/* Counts describe the records this page holds, not a workspace-wide
            total the timeline cannot show: a tab used to promise a number the
            ledger below it never rendered (C2). */}
        <LedgerFilter
          filters={data.filters.map((t) => ({ ...t, count: inTab(data.decisions, t).length }))}
          filter={filter}
          onChange={onFilter}
        />
        {data.extras && <StressExtras extras={data.extras} />}
        {children}
      </div>
      <Rail howItWorks={data.howItWorks} decisions={data.decisions} actions={actions} />
    </div>
  );
}

/* The rail signs a proposal off in place. It lists RECORDS, not statements: it
   used to be handed `data.awaiting` (statements) and look the id back up by
   string-matching the ledger, so a proposal outside the current filter silently
   became a local-only "Ratified" chip that never persisted (P-DE-3). Every row
   here carries the id its mutation needs. */
function Rail({ howItWorks, decisions, actions }: {
  howItWorks: string; decisions: Decision[]; actions?: DecisionsActions;
}) {
  const [signed, setSigned] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const awaiting = decisions.filter((d) => d.status === "proposed");

  const sign = async (id: number) => {
    if (!actions?.ratify) {
      // No server behind the ledger: the sign-off is the local move alone,
      // which is what the design canvas renders.
      setSigned((s) => [...s, id]);
      return;
    }
    setBusy(id);
    setFailed(null);
    try {
      await actions.ratify({ id });
      setSigned((s) => [...s, id]);
    } catch (e) {
      setFailed(why(e, "That decision could not be ratified."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Card variant="plain" title="Awaiting sign-off">
        {awaiting.length === 0 ? (
          /* An empty <ul> rendered as a blank box that read like a loading
             failure; the card says what it means now (P-DE-4). */
          <EmptyState title="Nothing awaiting sign-off">Every proposal in the ledger has been signed or set aside.</EmptyState>
        ) : (
          <ul className="space-y-2 text-[12.5px]">
            {awaiting.map((d) => (
              <li key={d.id} className="rounded-[5px] border border-ink/12 p-2.5">
                <Truncate lines={3} className="font-medium text-ink">{d.statement}</Truncate>
                <div className="mt-1.5">
                  {signed.includes(d.id) ? (
                    <Chip label="Ratified" tone="ok" dot />
                  ) : (
                    /* Ratifying is a governance act with no undo, so it never
                       fires on a first click (§2, P-DE-5). */
                    <ConfirmButton
                      compact
                      confirmVariant="success"
                      confirmLabel="Ratify this decision?"
                      disabled={busy !== null}
                      onConfirm={() => void sign(d.id)}
                    >
                      {busy === d.id ? "Signing…" : "Ratify"}
                    </ConfirmButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* A refused sign-off has no input to sit under, so it is a banner
            beside the control that fired (XA-02). */}
        <WriteError onDismiss={() => setFailed(null)}>{failed}</WriteError>
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
  /* One hook for the busy/failed pair the composer used to keep by hand
     (XA-04): with no handler the capture closes the form immediately, with one
     the form only closes once the server has accepted it. */
  const write = useWrite();

  const saving = composer.saving || write.busy;

  const capture = async () => {
    if (!statement.trim() || saving) return;
    await write.run(
      actions?.capture && (() => actions.capture!({ statement: statement.trim(), context: context.trim(), source: source.trim() })),
      onClose,
    );
  };

  return (
    <Card variant="default" title="Capture decision">
      {/* Every control is a labelled forms/* control. The composer used to
          hand-roll <input>/<textarea> against a local `field` class and use
          PLACEHOLDERS AS LABELS, so the form had no accessible names at all
          and the styling could drift from every other form in the console
          (§7, P-DE-1). FormField wraps its control in a real <label>. */}
      <div className="flex flex-col gap-4">
        <FormField label="Statement" hint="The decision, in one sentence.">
          <Input
            className="w-full"
            placeholder="Sessions move to short-lived JWTs."
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </FormField>
        <FormField label="Context" hint="Why, and what it closes off.">
          <Textarea
            short
            placeholder="Cookie theft kept coming up in review."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </FormField>
        <FormField label="Source" hint="Where the decision was made.">
          <Input
            className="w-full font-term"
            placeholder="slack · #eng-security"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </FormField>
        {/* A refused capture accuses no single field, so it is a banner beside
            the button rather than a FieldError under an input (XA-02). */}
        <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
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

/* One decision pulled out for sign-off. The card's own Ratify button used to
   get `onRatify={() => {}}` and a permanently-true `ratifying`, so the primary
   action of this whole view was a spinner that never resolved (P-DE-2). The
   sign-off is a real write here, and it is a governance act with no undo, so
   it goes through <ConfirmButton> (§2, P-DE-5). The card keeps no Ratify
   button of its own: a decision the pane cannot sign shows no control (§2). */
function RatifyPane({ card, actions }: { card: RatifyCard; actions?: DecisionsActions }) {
  const [status, setStatus] = useState<Decision["status"]>(card.status);
  const write = useWrite();
  const [seenCard, setSeenCard] = useState(card);
  if (seenCard !== card) { setSeenCard(card); setStatus(card.status); write.setFailed(null); }

  const id = card.id;
  const ratify = async () => {
    if (id === undefined || write.busy) return;
    await write.run(actions?.ratify && (() => actions.ratify!({ id })), () => setStatus("ratified"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-[19px] text-ink">Decision ledger</h2>
        <p className="mt-0.5 text-[13px] text-ink/70">Proposals awaiting sign-off, ratified decisions, and their downstream impact.</p>
      </div>
      <div>
        <DecisionCard
          statement={card.statement}
          context={card.context}
          status={status}
          fresh={card.fresh}
          sourceLabel={card.sourceLabel}
          sourceIcon={<SourceMark provider={card.provider} size={13} />}
          owners={card.owners}
          spine={false}
          actions={id !== undefined && status === "proposed" ? (
            <ConfirmButton
              compact
              confirmVariant="success"
              confirmLabel="Ratify this decision?"
              disabled={write.busy}
              onConfirm={() => void ratify()}
            >
              {write.busy ? "Ratifying…" : "Ratify"}
            </ConfirmButton>
          ) : undefined}
        />
        {/* Same surface a failed read gets: losing a ratification matters at
            least as much as failing to load one (XA-02). */}
        <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      </div>
    </div>
  );
}

function Body({ data, error, actions, mobile, composerOpen, onCloseComposer }: {
  data: DecisionsData; error: string | null; actions?: DecisionsActions; mobile: boolean;
  composerOpen: boolean; onCloseComposer: () => void;
}) {
  /* The page owns the filter, and `data.filter` says which tab it opens on:
     the tab strip was wired to a no-op while the timeline filtered itself.
     The sentinel resyncs it when a refetch changes which tab the ledger opens
     on, instead of rendering the first response forever (C1). */
  const [filter, setFilter] = useState(data.filter);
  const [seenFilter, setSeenFilter] = useState(data.filter);
  if (seenFilter !== data.filter) { setSeenFilter(data.filter); setFilter(data.filter); }

  const shell = { data, mobile, actions, composerOpen, onCloseComposer, filter, onFilter: setFilter };
  /* An EmptyState is the "nothing here yet" surface: reporting a failed read
     through one told the reader the ledger was empty when the request simply
     did not come back (§8, XA-01). */
  if (error) return <ReadError>{error}</ReadError>;
  if (isEmpty(data) && !composerOpen) {
    return (
      <EmptyState title="No decisions yet">
        {actions?.scan
          ? "Capture a decision or run “Scan for decisions” to start the ledger."
          : "Capture a decision to start the ledger."}
      </EmptyState>
    );
  }
  if (data.ratify) {
    return (
      <Shell {...shell}>
        <RatifyPane card={data.ratify} actions={actions} />
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
  scan: NonNullable<DecisionsActions["scan"]>;
  onStarted: (run: ScanRun) => void;
}) {
  // `runFor` because the run itself is the result the page has to follow.
  const write = useWrite();
  const run = async () => {
    if (write.busy) return;
    const started = await write.runFor(scan);
    // A handler that answers with a run gets followed; one that only
    // succeeds keeps the old fire-and-forget behaviour, which is what the
    // canvas renders.
    if (started && typeof started === "object" && "id" in started) onStarted(started as ScanRun);
  };
  return (
    <span className="inline-flex flex-col items-start">
      <Button variant="default" compact disabled={write.busy} onClick={run}>
        <Workflow size={15} /> {write.busy ? "Starting…" : "Scan for decisions"}
      </Button>
      {/* A scan that would not start is a failed write, not a bad field. */}
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
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
        <SkeletonPage
          variant="feed"
          eyebrow="Ledger"
          title="Decisions"
          description="One decision, one record: ratified by the people accountable, and traceable across the corpus."
          mobile={mobile}
        />
      </PageFrame>
    );
  }
  const headerActions = (
    <>
      {/* No handler, no button: a "Scan for decisions" that returns on its
          first line is a control that cannot do anything (§2). */}
      {actions?.scan && <ScanButton scan={actions.scan} onStarted={setScan} />}
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
