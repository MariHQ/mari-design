import { useState, type ComponentProps } from "react";
import { Sparkles, Plus, MessageSquare, CheckCircle2, Circle, MessagesSquare, FileText } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { AnswerCard, type Answer } from "../features/AnswerCard";
import { PageHeader, Card, Stat, Tabs, Button, Chip, Stepper, Spinner, Textarea, EmptyState } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";

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

/** The harvest wizard, as a static rendition of one step of the drawer. */
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

function AnswersList({ data, error }: { data: AnswersData; error: string | null }) {
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
        <EmptyState title="No answers yet" action={<Button variant="primary" compact><Plus size={14} /> New answer</Button>}>
          Approve your first answer so bots can serve it verbatim.
        </EmptyState>
      </Card>
    );
  }
  if (!data.answers.length) {
    const copy: Record<AnswersFilter, string> = {
      all: "No answers yet.",
      approved: "No approved answers yet.",
      drafts: "No drafts yet.",
      retired: "No retired answers.",
    };
    return (
      <Card>
        <EmptyState title="Nothing here" action={<Button variant="primary" compact><Plus size={14} /> New answer</Button>}>
          {copy[data.filter]}
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {data.answers.map((a) => <AnswerCard key={a.id} answer={a} />)}
    </div>
  );
}

function CoverageCard({
  questions, error, extended = false,
}: { questions: string[]; error: string | null; extended?: boolean }) {
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
              <Button variant="link" compact className="mt-1.5">Draft answer</Button>
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
  questions, error, withCoverage,
}: { questions: string[]; error: string | null; withCoverage: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      {withCoverage && <CoverageCard questions={questions} error={error} />}
      <HowServingWorks />
    </div>
  );
}

/* ── inline harvest-wizard step previews (static renditions of the drawer) ── */

function confTone(c: number): ComponentProps<typeof Chip>["tone"] {
  return c >= 75 ? "ok" : c >= 45 ? "attention" : "neutral";
}

function HarvestPreview({ harvest }: { harvest: Harvest }) {
  const { phase, candidates } = harvest;
  const step = HARVEST_STEP[phase];
  const importing = phase === "importing";
  const selected = harvest.sources.filter((s) => s.on).length;
  return (
    <Card>
      <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Sparkles size={16} className="text-biscay-2" /> Harvest questions
      </div>
      <Stepper labels={["Sources", "Scan", "Review", "Import"]} current={step} />

      {phase === "select" && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13px] text-ink/70">Pick the sources Mari should scan for question and answer candidates. Nothing is saved until you import.</p>
          {harvest.sources.map((s) => (
            <label key={s.label} className={`flex items-start gap-3 rounded-[5px] border px-3.5 py-3 ${s.on ? "border-biscay-2/60 bg-biscay-2/[0.04] ring-1 ring-biscay-2/40" : "border-ink/15"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[5px] ${s.on ? "bg-biscay text-white" : "bg-flysch text-ink/70 border border-ink/12"}`}>{SOURCE_ICON[s.key]}</span>
              <span className="min-w-0">
                <b className="block text-[13.5px] font-semibold text-ink">{s.label}</b>
                <span className="text-[12.5px] text-ink/65">{s.desc}</span>
              </span>
            </label>
          ))}
          <div className="flex items-center gap-2"><Button variant="primary">{`Scan ${selected} sources`}</Button><Button variant="default">Cancel</Button></div>
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
          <div className="flex items-center justify-between">
            <span className="font-term text-[12px] text-ink/65">{`${candidates.length} of ${candidates.length} accepted`}</span>
            <Button compact>Accept all high confidence</Button>
          </div>
          {candidates.map((c) => (
            <Card key={c.question}>
              <h3 className="text-[13.5px] font-semibold text-ink">{c.question}</h3>
              <div className="mt-1.5 flex items-center gap-2">
                <Chip label={c.source} tone="neutral" />
                <Chip label={`${c.confidence}% confident`} tone={confTone(c.confidence)} dot />
              </div>
              <Textarea short className="mt-2.5" defaultValue={c.draft} />
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-moss"><CheckCircle2 size={15} /> Accepted</span>
                <span className="flex-1" />
                <Button compact>Skip</Button>
              </div>
            </Card>
          ))}
          <div className="flex items-center gap-2"><Button variant="primary">{`Import ${candidates.length} drafts`}</Button><Button variant="default">Cancel</Button></div>
        </div>
      )}

      {(phase === "importing" || phase === "done") && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-[13px] text-ink/70">
            {importing
              ? `Saving ${candidates.length} draft answers…`
              : `Imported ${candidates.length} draft answers. They're queued in the Drafts filter for approval.`}
          </p>
          <ul className="flex flex-col gap-2">
            {candidates.map((c, i) => {
              const doneRow = !importing || i < candidates.length - 1;
              const savingRow = importing && i === candidates.length - 1;
              return (
                <li key={c.question} className="flex items-center gap-2.5 text-[13px] text-ink/80">
                  {doneRow ? <CheckCircle2 size={16} className="shrink-0 text-moss" />
                    : savingRow ? <Spinner size="sm" />
                    : <Circle size={14} className="shrink-0 text-ink/30" />}
                  <span className="min-w-0 flex-1 truncate">{c.question}</span>
                  <span className="font-term text-[11px] shrink-0 text-ink/65">
                    {doneRow ? "draft saved" : savingRow ? "saving…" : "queued"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={importing}>{importing ? "Saving…" : "Done"}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Body({ data, error, mobile }: { data: AnswersData; error: string | null; mobile: boolean }) {
  const [filter, setFilter] = useState<AnswersFilter>(data.filter);

  const isCoverage = data.pane.kind === "coverage";

  /* One main column + the standard 320px rail (§11) for every state, so the
     outer edges and the rail plumb line never move between states. */
  const main = data.pane.kind === "harvest" ? (
    <HarvestPreview harvest={data.pane.harvest} />
  ) : isCoverage ? (
    <CoverageCard questions={data.coverage} error={error} extended />
  ) : (
    <div className="flex flex-col gap-5">
      <Tabs
        ariaLabel="Filter answers"
        /* Underline variant: the Knowledge tab bar is the one standard
           selection bar across the console (CONVENTIONS.md §13). */
        variant="underline"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All" },
          { id: "approved", label: "Approved" },
          { id: "drafts", label: "Drafts" },
          { id: "retired", label: "Retired" },
        ]}
      />
      <AnswersList data={{ ...data, filter }} error={error} />
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
        <div className="min-w-0">{main}</div>
        <div className="min-w-0">
          <CoverageRail questions={data.coverage} error={error} withCoverage={!isCoverage} />
        </div>
      </div>
    </div>
  );
}

function AnswersPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<AnswersData>) {
  const actions = (
    <>
      <Button variant="default" compact><Sparkles size={15} /> Harvest questions</Button>
      <Button variant="primary" compact><Plus size={15} /> New answer</Button>
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
          actions={mobile ? undefined : actions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <div className="mt-6">
          <Body data={data} error={error} mobile={mobile} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<AnswersData> = {
  id: "answers",
  title: "Answers",
  route: "/answers",
  component: AnswersPage,
  states: STATES.map((s) => ({ ...s })),
};
