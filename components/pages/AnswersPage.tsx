import { useState, type ComponentProps } from "react";
import { Sparkles, Plus, MessageSquare, CheckCircle2, Circle, MessagesSquare, FileText } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { AnswerCard, type Answer, type AnswerActions } from "../features/AnswerCard";
import { PageHeader, Card, Stat, Tabs, Button, Chip, Stepper, Spinner, Textarea, EmptyState, Input } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { FieldError } from "../feedback/ErrorMessage";
import { WriteError } from "../feedback/WriteError";

/* Approved answers (pages/answers.md). Curate the answers bots serve verbatim.
   A stat strip, a status-filter tab strip, a list of AnswerCards, and a right
   rail (coverage + how-serving-works).

   This page is a pure presenter: it holds no demo content. Answers, coverage
   gaps, and the harvest wizard's state all arrive in `data`, so a workspace
   with nothing approved renders the empty state rather than someone's invented
   library. The design canvas supplies the same shape from
   `.preview/fixtures/answers.ts`. */

const STATES = [
  { id: "default", label: "Default · all" },
  { id: "approved", label: "Approved tab" },
  { id: "drafts", label: "Drafts tab" },
  { id: "retired", label: "Retired tab" },
  { id: "single-answer", label: "Single answer" },
  { id: "coverage", label: "Coverage rail" },
  { id: "harvest-select", label: "Harvest · select sources" },
  { id: "harvest-scan", label: "Harvest · scanning" },
  { id: "harvest-review", label: "Harvest · review candidates" },
  { id: "harvest-importing", label: "Harvest · importing" },
  { id: "harvest-done", label: "Harvest · done" },
  { id: "filtered", label: "Filtered · empty" },
  { id: "empty", label: "No answers" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

export type AnswersFilter = "all" | "approved" | "drafts" | "retired";

/* Tab id → the lifecycle status behind it. The tabs are plural, the status on
   an answer is not, so the strip needs the mapping to filter anything. */
const OF_STATUS: Record<Exclude<AnswersFilter, "all">, Answer["status"]> = {
  approved: "approved", drafts: "draft", retired: "retired",
};

const inFilter = (answers: Answer[], filter: AnswersFilter): Answer[] =>
  filter === "all" ? answers : answers.filter((a) => a.status === OF_STATUS[filter]);

/** One tile of the headline strip. */
export type AnswerStat = {
  value: string;
  label: string;
  tone: ComponentProps<typeof Stat>["tone"];
  sub: string;
};

/** A source the harvest wizard can scan. `key` picks the icon, so the shape
    stays plain JSON: an API can return it, and no React element is carried. */
export type HarvestSource = { key: "slack" | "docs" | "history"; label: string; desc: string; on: boolean };

/** One question/answer pair the scan proposed. */
export type HarvestCandidate = { question: string; draft: string; source: string; confidence: number };

/** The harvest wizard's starting point. An app opens it at "select"; the
    canvas opens it at whichever step it wants to review. */
export type Harvest = {
  phase: "select" | "scan" | "review" | "importing" | "done";
  sources: HarvestSource[];
  /** What the scan is doing right now, shown under the spinner. */
  scanning: string;
  candidates: HarvestCandidate[];
};

/** What the main column shows. The rail is the same in every case, except that
    the coverage pane moves coverage out of the rail and into the column. */
export type AnswersPane =
  | { kind: "answers" }
  | { kind: "coverage" }
  | { kind: "harvest"; harvest: Harvest };

/** What the Answers page can DO. Per-card writes come from `AnswerActions`;
    `create` is this page's own, behind "New answer" and "Draft answer".

    Optional, as always: with no actions the composer still opens and the cards
    still respond locally, which is what the design canvas renders. */
export type AnswersActions = AnswerActions & {
  /** Save a new answer. It lands as a draft until someone approves it. */
  create?: (args: { question: string; answer: string }) => void | Promise<void>;
  /** Scan the chosen sources for question/answer pairs. Answers with what it
      found, so the wizard reviews the server's result rather than reading it
      back from a second query. */
  harvest?: (sources: HarvestSource["key"][]) => Promise<HarvestCandidate[]>;
  /** Save the accepted candidates as draft answers, in one go. */
  importAnswers?: (drafts: { question: string; answer: string }[]) => void | Promise<void>;
};

/** Whatever the server said, or a floor when the failure carried no message. */
const why = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Everything the Answers page renders. */
export type AnswersData = {
  stats: AnswerStat[];
  /** Which status tab opens selected. */
  filter: AnswersFilter;
  answers: Answer[];
  /** Questions people ask that no approved answer covers yet. */
  coverage: string[];
  pane: AnswersPane;
};

/** No answers and no coverage gaps: nothing has been curated at all. Derived
    from the data, not from a state flag, so it is true in the real app for
    exactly the same reason it is true on the canvas. */
function isEmpty(d: AnswersData): boolean {
  return !d.answers.length && !d.coverage.length;
}

const HARVEST_STEP: Record<Harvest["phase"], number> = {
  select: 0, scan: 1, review: 2, importing: 3, done: 3,
};

const SOURCE_ICON: Record<HarvestSource["key"], React.ReactNode> = {
  slack: <MessagesSquare size={18} />,
  docs: <FileText size={18} />,
  history: <Sparkles size={18} />,
};

/* What the wizard offers to scan when the page opens it fresh. This is
   product structure rather than demo content — the same three places a
   harvest can read from, in the same order, wherever the wizard is opened —
   so it lives beside the icon map that already enumerates them. An app that
   knows which sources a workspace actually has can override the whole list by
   pinning `data.pane`. */
const HARVEST_SOURCES: HarvestSource[] = [
  { key: "slack", label: "Slack threads", desc: "Questions asked in channels Mari can read.", on: true },
  { key: "docs", label: "Documents", desc: "FAQ sections and Q&A headings in the knowledge base.", on: true },
  { key: "history", label: "Ask history", desc: "What people have asked Mari that had no approved answer.", on: false },
];

/** `data` is the whole page's answers — what "nothing curated at all" is judged
    against — while `answers` is only the selected tab's slice. Judging both off
    the slice would call a workspace empty because one tab happens to be. */
function AnswersList({ data, filter, answers, error, actions, onCompose }: {
  data: AnswersData; filter: AnswersFilter; answers: Answer[];
  error: string | null; actions?: AnswersActions; onCompose: (question: string) => void;
}) {
  if (error) {
    return (
      <Card>
        <EmptyState title="API offline">{error}</EmptyState>
      </Card>
    );
  }
  if (isEmpty(data)) {
    return (
      <Card>
        <EmptyState title="No answers yet" action={<Button variant="primary" compact onClick={() => onCompose("")}><Plus size={14} /> New answer</Button>}>
          Approve your first answer so bots can serve it verbatim.
        </EmptyState>
      </Card>
    );
  }
  if (!answers.length) {
    const copy: Record<AnswersFilter, string> = {
      all: "No answers yet.",
      approved: "No approved answers yet.",
      drafts: "No drafts yet.",
      retired: "No retired answers.",
    };
    return (
      <Card>
        <EmptyState title="Nothing here" action={<Button variant="primary" compact onClick={() => onCompose("")}><Plus size={14} /> New answer</Button>}>
          {copy[filter]}
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {answers.map((a) => <AnswerCard key={a.id} answer={a} actions={actions} />)}
    </div>
  );
}

function CoverageCard({
  questions, error, extended = false, onCompose,
}: { questions: string[]; error: string | null; extended?: boolean; onCompose: (question: string) => void }) {
  const qs = extended ? questions : questions.slice(0, 2);
  return (
    <Card>
      <div className="mb-2 text-[14px] font-semibold text-ink">Coverage</div>
      {error ? (
        <EmptyState title="API offline">Coverage unavailable.</EmptyState>
      ) : questions.length === 0 ? (
        <EmptyState title="All covered">No uncovered questions yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {qs.map((q) => (
            <div key={q} className="rounded-[6px] border border-ink/12 p-3">
              <div className="text-[13px] text-ink">{q}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink/65">
                <MessageSquare size={12} /> from chat logs
              </div>
              <Button variant="link" compact className="mt-1.5" onClick={() => onCompose(q)}>Draft answer</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function HowServingWorks() {
  return (
    <Card>
      <div className="mb-1.5 text-[14px] font-semibold text-ink">How serving works</div>
      <p className="text-[12.5px] leading-relaxed text-ink/70">
        Approving an answer embeds it so incoming questions match semantically. The Slack
        bot and support widget then serve the text verbatim with an “Approved” badge: no
        generation, no drift.
      </p>
    </Card>
  );
}

/* The rail. Every card in it shares the rail's left and right edge (§11), so
   no card carries its own max-width. */
function CoverageRail({
  questions, error, withCoverage, onCompose,
}: { questions: string[]; error: string | null; withCoverage: boolean; onCompose: (question: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {withCoverage && <CoverageCard questions={questions} error={error} onCompose={onCompose} />}
      <HowServingWorks />
    </div>
  );
}

/* The composer sits at the top of the main column, opened by "New answer" or
   by "Draft answer" on a coverage gap — which prefills the question, so the
   uncovered question and the answer to it are never retyped apart.

   Fields first, primary action bottom left (§2). */
function NewAnswer({ question: initial, actions, onClose }: {
  question: string; actions?: AnswersActions; onClose: () => void;
}) {
  const [question, setQuestion] = useState(initial);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!question.trim() || !answer.trim() || busy) return;
    if (!actions?.create) { setSaved(true); return; }
    setBusy(true);
    setFailed(null);
    try {
      await actions.create({ question: question.trim(), answer: answer.trim() });
      setSaved(true);
    } catch (e) {
      setFailed(why(e, "That answer could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="mb-2 text-[14px] font-semibold text-ink">New answer</div>
      {saved ? (
        <>
          <p className="text-[13px] text-ink/70">
            Saved as a draft. Approve it below and bots will serve this wording verbatim.
          </p>
          <div className="mt-3"><Button variant="primary" compact onClick={onClose}>Done</Button></div>
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question people ask" />
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="The wording to serve, verbatim" />
          <FieldError>{failed}</FieldError>
          <div className="flex items-center gap-2">
            <Button variant="primary" compact disabled={busy || !question.trim() || !answer.trim()} onClick={save}>
              {busy ? "Saving…" : "Save draft"}
            </Button>
            <Button compact disabled={busy} onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Harvest wizard ────────────────────────────────────────────────────────
   Scan sources for question/answer pairs people keep asking, review what came
   back, import the keepers as drafts.

   This was five static renditions of a drawer: `data.pane.harvest.phase`
   picked which step to draw, and every control in every step was inert — you
   could not select a source, skip a candidate, or import anything. It is now
   one state machine that actually advances, and `data.pane.harvest` seeds its
   starting point so the canvas can still open on any step.

   The scan and the import are optional actions, like every write in this
   library. Without them the wizard still runs end to end on the candidates it
   was given, which is what the canvas renders; with them the scan is the
   server's answer and the import is a real write. */

function confTone(c: number): ComponentProps<typeof Chip>["tone"] {
  return c >= 75 ? "ok" : c >= 45 ? "attention" : "neutral";
}

/** Confidence at or above which "Accept all high confidence" selects. */
const HIGH_CONFIDENCE = 75;

/** A candidate plus what the reviewer has done to it. `draft` is separate from
    the proposal so editing the wording never loses what was suggested. */
type Reviewed = HarvestCandidate & { accepted: boolean; draft: string };

function HarvestWizard({ harvest, actions, onClose }: {
  harvest: Harvest;
  actions?: AnswersActions;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Harvest["phase"]>(harvest.phase);
  const [sources, setSources] = useState<HarvestSource[]>(harvest.sources);
  const [rows, setRows] = useState<Reviewed[]>(
    () => harvest.candidates.map((c) => ({ ...c, accepted: true, draft: c.draft })),
  );
  const [failed, setFailed] = useState<string | null>(null);

  const selected = sources.filter((s) => s.on);
  const accepted = rows.filter((r) => r.accepted);
  const step = HARVEST_STEP[phase];

  const toggleSource = (label: string) =>
    setSources((prev) => prev.map((s) => (s.label === label ? { ...s, on: !s.on } : s)));

  const scan = async () => {
    setFailed(null);
    setPhase("scan");
    try {
      // With no handler the wizard reviews what it was given, which is how the
      // canvas drives it; with one, the server decides what was found.
      const found = actions?.harvest
        ? await actions.harvest(selected.map((s) => s.key))
        : harvest.candidates;
      setRows(found.map((c) => ({ ...c, accepted: c.confidence >= HIGH_CONFIDENCE, draft: c.draft })));
      setPhase("review");
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "The scan could not finish.");
      setPhase("select");
    }
  };

  const importDrafts = async () => {
    setFailed(null);
    setPhase("importing");
    try {
      if (actions?.importAnswers) {
        await actions.importAnswers(accepted.map((r) => ({ question: r.question, answer: r.draft })));
      }
      setPhase("done");
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "The import could not finish.");
      setPhase("review");
    }
  };

  return (
    <Card>
      <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Sparkles size={16} className="text-biscay-2" /> Harvest questions
      </div>
      <Stepper labels={["Sources", "Scan", "Review", "Import"]} current={step} />

      {failed && <div className="mt-4"><WriteError>{failed}</WriteError></div>}

      {phase === "select" && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13px] text-ink/70">Pick the sources Mari should scan for question and answer candidates. Nothing is saved until you import.</p>
          {sources.map((s) => (
            <label
              key={s.label}
              className={`flex cursor-pointer items-start gap-3 rounded-[5px] border px-3.5 py-3 ${s.on ? "border-biscay-2/60 bg-biscay-2/[0.04] ring-1 ring-biscay-2/40" : "border-ink/15"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={s.on}
                onChange={() => toggleSource(s.label)}
              />
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[5px] ${s.on ? "bg-biscay text-white" : "bg-flysch text-ink/70 border border-ink/12"}`}>{SOURCE_ICON[s.key]}</span>
              <span className="min-w-0">
                <b className="block text-[13.5px] font-semibold text-ink">{s.label}</b>
                <span className="text-[12.5px] text-ink/65">{s.desc}</span>
              </span>
            </label>
          ))}
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={selected.length === 0} onClick={() => void scan()}>
              {selected.length === 0 ? "Pick a source to scan" : `Scan ${selected.length} source${selected.length === 1 ? "" : "s"}`}
            </Button>
            <Button variant="default" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}

      {phase === "scan" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
          <Spinner size="md" label="Scanning" />
          <div className="text-[13px] text-ink/70">{harvest.scanning}</div>
          <div className="font-term text-[11.5px] text-ink/65">Clustering threads · extracting question/answer pairs</div>
        </div>
      )}

      {phase === "review" && (
        <div className="mt-5 flex flex-col gap-3">
          {rows.length === 0 ? (
            <>
              <p className="text-[13px] text-ink/70">The scan found no question and answer pairs in those sources.</p>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => setPhase("select")}>Pick different sources</Button>
                <Button variant="default" onClick={onClose}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="font-term text-[12px] text-ink/65">{`${accepted.length} of ${rows.length} accepted`}</span>
                <Button
                  compact
                  onClick={() => setRows((prev) => prev.map((r) => (r.confidence >= HIGH_CONFIDENCE ? { ...r, accepted: true } : r)))}
                >
                  Accept all high confidence
                </Button>
              </div>
              {rows.map((r, i) => (
                <Card key={r.question} className={r.accepted ? undefined : "opacity-55"}>
                  <h3 className="text-[13.5px] font-semibold text-ink">{r.question}</h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Chip label={r.source} tone="neutral" />
                    <Chip label={`${r.confidence}% confident`} tone={confTone(r.confidence)} dot />
                  </div>
                  <Textarea
                    short
                    className="mt-2.5"
                    value={r.draft}
                    onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, draft: e.target.value } : x)))}
                  />
                  <div className="mt-2.5 flex items-center gap-2">
                    {r.accepted && <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-moss"><CheckCircle2 size={15} /> Accepted</span>}
                    <span className="flex-1" />
                    <Button
                      compact
                      onClick={() => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, accepted: !x.accepted } : x)))}
                    >
                      {r.accepted ? "Skip" : "Accept"}
                    </Button>
                  </div>
                </Card>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="primary" disabled={accepted.length === 0} onClick={() => void importDrafts()}>
                  {accepted.length === 0 ? "Accept at least one" : `Import ${accepted.length} draft${accepted.length === 1 ? "" : "s"}`}
                </Button>
                <Button variant="default" onClick={onClose}>Cancel</Button>
              </div>
            </>
          )}
        </div>
      )}

      {(phase === "importing" || phase === "done") && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-[13px] text-ink/70">
            {phase === "importing"
              ? `Saving ${accepted.length} draft answers…`
              : `Imported ${accepted.length} draft answers. They're queued in the Drafts filter for approval.`}
          </p>
          <ul className="flex flex-col gap-2">
            {accepted.map((r, i) => {
              const saving = phase === "importing" && i === accepted.length - 1;
              const done = phase === "done" || i < accepted.length - 1;
              return (
                <li key={r.question} className="flex items-center gap-2.5 text-[13px] text-ink/80">
                  {done ? <CheckCircle2 size={16} className="shrink-0 text-moss" />
                    : saving ? <Spinner size="sm" />
                    : <Circle size={14} className="shrink-0 text-ink/30" />}
                  <span className="min-w-0 flex-1 truncate">{r.question}</span>
                  <span className="font-term text-[11px] shrink-0 text-ink/65">
                    {done ? "draft saved" : saving ? "saving…" : "queued"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={phase === "importing"} onClick={onClose}>
              {phase === "importing" ? "Saving…" : "Done"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}


function Body({ data, error, actions, mobile, composing, onCompose, onCloseComposer, harvest, onCloseHarvest }: {
  data: AnswersData; error: string | null; actions?: AnswersActions; mobile: boolean;
  /** The question the composer opened on, or null when it is closed. */
  composing: string | null;
  onCompose: (question: string) => void;
  onCloseComposer: () => void;
  /** The harvest wizard's starting point, or null when it is closed. */
  harvest: Harvest | null;
  onCloseHarvest: () => void;
}) {
  /* The strip filters the answers the page was given; `data.filter` only says
     which tab opens selected. The state fed nothing but the empty-state copy
     before, so every tab drew the same list. */
  const [filter, setFilter] = useState<AnswersFilter>(data.filter);
  const shown = inFilter(data.answers, filter);

  const isCoverage = data.pane.kind === "coverage";

  /* One main column + the standard 320px rail (§11) for every state, so the
     outer edges and the rail plumb line never move between states. */
  const main = harvest ? (
    <HarvestWizard harvest={harvest} actions={actions} onClose={onCloseHarvest} />
  ) : isCoverage ? (
    <CoverageCard questions={data.coverage} error={error} extended onCompose={onCompose} />
  ) : (
    <div className="flex flex-col gap-5">
      <Tabs
        ariaLabel="Filter answers"
        /* Underline variant: the Knowledge tab bar is the one standard
           selection bar across the console (CONVENTIONS.md §13). */
        variant="underline"
        value={filter}
        onChange={setFilter}
        /* Counts come off the same list the tabs filter, so a tab can never
           promise rows the column then fails to show. */
        options={[
          { id: "all", label: "All", count: data.answers.length },
          { id: "approved", label: "Approved", count: inFilter(data.answers, "approved").length },
          { id: "drafts", label: "Drafts", count: inFilter(data.answers, "drafts").length },
          { id: "retired", label: "Retired", count: inFilter(data.answers, "retired").length },
        ]}
      />
      <AnswersList data={data} filter={filter} answers={shown} error={error} actions={actions} onCompose={onCompose} />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Stat strip as a §11 card gallery rather than a hard three-up grid: at
          1024 and below a third of the content column is narrower than a stat
          tile wants, and a grid would leave a dead cell instead of letting the
          short last row stretch. */}
      <div className={mobile ? "grid grid-cols-1 gap-5" : "flex flex-wrap gap-5 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-[220px]"}>
        {data.stats.map((s) => <Stat key={s.label} value={s.value} label={s.label} tone={s.tone} sub={s.sub} />)}
      </div>

      <div className={mobile ? "flex flex-col gap-5" : SPLIT[320]}>
        <div className="flex min-w-0 flex-col gap-5">
          {composing !== null && (
            <NewAnswer question={composing} actions={actions} onClose={onCloseComposer} />
          )}
          {main}
        </div>
        <div className="min-w-0">
          <CoverageRail questions={data.coverage} error={error} withCoverage={!isCoverage} onCompose={onCompose} />
        </div>
      </div>
    </div>
  );
}

function AnswersPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<AnswersData, AnswersActions>) {
  /* The composer is a mode of this page, not a property of the library: it
     opens on "" for a blank answer, or on the text of a coverage gap. */
  const [composing, setComposing] = useState<string | null>(null);

  /* The wizard is a mode of this page. `data.pane` can pin it open on a given
     step (that is how the canvas reviews each one); otherwise the header
     button opens it at the beginning. */
  const pinned = data.pane.kind === "harvest" ? data.pane.harvest : null;
  const [harvesting, setHarvesting] = useState<Harvest | null>(null);
  const harvest = harvesting ?? pinned;

  const headerActions = (
    <>
      <Button
        variant="default"
        compact
        onClick={() => setHarvesting({ phase: "select", sources: HARVEST_SOURCES, scanning: "Reading recent threads…", candidates: [] })}
      >
        <Sparkles size={15} /> Harvest questions
      </Button>
      <Button variant="primary" compact onClick={() => setComposing("")}><Plus size={15} /> New answer</Button>
    </>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("answers")} title="Answers" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="list" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Knowledge"
          title="Approved answers"
          description="Curate the answers bots and teams serve verbatim: no generation, no drift."
          actions={mobile ? undefined : headerActions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
        <div className="mt-6">
          <Body
            data={data}
            error={error}
            actions={actions}
            mobile={mobile}
            composing={composing}
            onCompose={setComposing}
            onCloseComposer={() => setComposing(null)}
            harvest={harvest}
            onCloseHarvest={() => setHarvesting(null)}
          />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<AnswersData, AnswersActions> = {
  id: "answers",
  title: "Answers",
  route: "/answers",
  component: AnswersPage,
  states: STATES.map((s) => ({ ...s })),
};
