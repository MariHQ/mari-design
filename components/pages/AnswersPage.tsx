import { useState, type ComponentProps } from "react";
import { Sparkles, Plus, MessageSquare, CheckCircle2, Circle, MessagesSquare, FileText } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { AnswerCard } from "../features/AnswerCard";
import { AnswersHarvestWizard } from "../features/AnswersHarvestWizard";
import { PageHeader, Card, Stat, Tabs, Button, Chip, Stepper, Spinner, Textarea, EmptyState } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";

/* Approved answers (pages/answers.md). Curate the answers bots serve verbatim.
   A stat strip, a status-filter tab strip, a list of AnswerCards, and a right
   rail (coverage + how-serving-works). States walk every status tab, single /
   empty / filtered content, an isolated coverage rail, and the harvest wizard's
   four steps (select → scan → review → import) rendered inline so a static
   capture shows each. */

type Answer = NonNullable<ComponentProps<typeof AnswerCard>["answer"]>;

const APPROVED: Answer = {
  id: 1,
  question: "How long do sessions last before they expire?",
  answer: "Sessions are 30-day rolling tokens — each request within the window extends them. Signing in on a new device revokes the oldest session once you pass the five-device cap, and signing out revokes the current session immediately. Admins can force-revoke every session for a member from the members table.",
  status: "approved",
  owner: "Priya Nair",
  channels: ["slack-bot", "docs-site"],
  sources: [{ source: "docs", title: "Sign-in and session model" }, { source: "notion", title: "Auth overview" }],
  served: 1284,
  spark: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18],
  updated: "2026-07-16",
};

const APPROVED_2: Answer = {
  id: 2,
  question: "What's the SLA for enterprise customers?",
  answer: "Enterprise plans carry a 99.9% monthly uptime SLA with a 1-hour first-response target for Sev1 incidents. Credits are issued automatically when monthly uptime drops below target.",
  status: "approved",
  owner: "Dana Osei",
  channels: ["slack-bot", "support-widget", "docs-site"],
  sources: [{ source: "notion", title: "Enterprise SLA policy" }],
  served: 642,
  spark: [2, 3, 3, 5, 4, 6, 7, 8, 9, 11],
  updated: "2026-07-13",
};

const DRAFT: Answer = {
  id: 3,
  question: "How do webhook retries work now?",
  answer: "Delivery retries use exponential backoff on 5xx responses from the gateway, capped at 5 attempts with a metric emitted per retry.",
  status: "draft",
  owner: "Marcus Vale",
  channels: [],
  sources: [{ source: "github", title: "feat: retry settlement on transient errors" }],
  served: 0,
  spark: [],
  updated: "2026-07-15",
};

const DRAFT_2: Answer = {
  id: 4,
  question: "Is the v1 export API still supported?",
  answer: "v1 export is deprecated in favor of the streaming endpoint. It stays read-only for one quarter, then is removed.",
  status: "draft",
  owner: "Dana Osei",
  channels: [],
  sources: [{ source: "slack", title: "Decision chunk: deprecate the v1 export API" }],
  served: 0,
  spark: [],
  updated: "2026-07-08",
};

const RETIRED: Answer = {
  id: 5,
  question: "How do I export data with the legacy v1 API?",
  answer: "The v1 export API has been removed. Use the streaming export endpoint instead — see the migration guide.",
  status: "retired",
  owner: "Priya Nair",
  channels: [],
  sources: [{ source: "docs", title: "Export migration guide" }],
  served: 0,
  spark: [],
  updated: "2026-06-30",
};

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
] as const;

type Filter = "all" | "approved" | "drafts" | "retired";

function filterFor(state: string): Filter {
  if (state === "approved") return "approved";
  if (state === "drafts" || state === "filtered") return "drafts";
  if (state === "retired") return "retired";
  return "all";
}

function cardsFor(state: string): Answer[] {
  switch (state) {
    case "approved": return [APPROVED, APPROVED_2];
    case "drafts": return [DRAFT, DRAFT_2];
    case "retired": return [RETIRED];
    case "single-answer": return [APPROVED];
    default: return [APPROVED, DRAFT, APPROVED_2];
  }
}

function AnswersList({ state, filter }: { state: string; filter: Filter }) {
  if (state === "error") {
    return (
      <Card>
        <EmptyState title="API offline">Answers unavailable.</EmptyState>
      </Card>
    );
  }
  if (state === "empty") {
    return (
      <Card>
        <EmptyState title="No answers yet" action={<Button variant="primary" compact><Plus size={14} /> New answer</Button>}>
          Approve your first answer so bots can serve it verbatim.
        </EmptyState>
      </Card>
    );
  }
  if (state === "filtered") {
    const copy: Record<Filter, string> = {
      all: "No answers yet.",
      approved: "No approved answers yet.",
      drafts: "No drafts yet.",
      retired: "No retired answers.",
    };
    return (
      <Card>
        <EmptyState title="Nothing here" action={<Button variant="primary" compact><Plus size={14} /> New answer</Button>}>
          {copy[filter]}
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {cardsFor(state).map((a) => <AnswerCard key={a.id} answer={a} />)}
    </div>
  );
}

const COVERAGE_QS = [
  "How do I rotate my API key?",
  "What's the SLA for enterprise?",
  "Can I export data as CSV?",
  "How do I invite a teammate as read-only?",
];

function CoverageCard({ state, extended = false }: { state: string; extended?: boolean }) {
  const qs = extended ? COVERAGE_QS : COVERAGE_QS.slice(0, 2);
  return (
    <Card>
      <div className="mb-2 text-[14px] font-semibold text-ink">Coverage</div>
      {state === "error" ? (
        <EmptyState title="API offline">Coverage unavailable.</EmptyState>
      ) : state === "empty" ? (
        <EmptyState title="All covered">No uncovered questions yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {qs.map((q) => (
            <div key={q} className="rounded-[6px] border border-ink/12 p-3">
              <div className="text-[13px] text-ink">{q}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink/50">
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

function CoverageRail({ state }: { state: string }) {
  return (
    <div className="space-y-4">
      <CoverageCard state={state} />
      <Card>
        <div className="mb-1.5 text-[14px] font-semibold text-ink">How serving works</div>
        <p className="text-[12.5px] leading-relaxed text-ink/60">
          Approving an answer embeds it so incoming questions match semantically. The Slack
          bot and support widget then serve the text verbatim with an “Approved” badge — no
          generation, no drift.
        </p>
      </Card>
    </div>
  );
}

/* ── inline harvest-wizard step previews (static renditions of the drawer) ── */

const HARVEST_STEP: Record<string, number> = {
  "harvest-select": 0,
  "harvest-scan": 1,
  "harvest-review": 2,
  "harvest-importing": 3,
  "harvest-done": 3,
};

const CANDIDATES = [
  { q: "How long do sessions last before they expire?", draft: "Sessions are 30-day rolling tokens. Signing in on a new device revokes the oldest session once you pass the device cap.", src: "Google Docs", conf: 88 },
  { q: "What happens when the settlement queue backs up?", draft: "Drain the queue before restarting workers, and escalate to #payments-oncall if depth exceeds 10,000.", src: "Notion", conf: 79 },
  { q: "Is the v1 export API still supported?", draft: "v1 export is deprecated in favor of the streaming endpoint. It stays read-only for one quarter, then is removed.", src: "Slack", conf: 62 },
];

function confTone(c: number): ComponentProps<typeof Chip>["tone"] {
  return c >= 75 ? "ok" : c >= 45 ? "attention" : "neutral";
}

function HarvestPreview({ state }: { state: string }) {
  const step = HARVEST_STEP[state] ?? 0;
  const importing = state === "harvest-importing";
  return (
    <Card className="max-w-[720px]">
      <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Sparkles size={16} className="text-biscay-2" /> Harvest questions
      </div>
      <Stepper labels={["Sources", "Scan", "Review", "Import"]} current={step} />

      {state === "harvest-select" && (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[13px] text-ink/70">Pick the sources Mari should scan for question and answer candidates. Nothing is saved until you import.</p>
          {[
            { label: "Slack", desc: "Threads and decision chunks across connected channels.", icon: <MessagesSquare size={18} />, on: true },
            { label: "Docs & repos", desc: "Google Docs, Notion pages, and GitHub READMEs.", icon: <FileText size={18} />, on: true },
            { label: "Ask-Mari history", desc: "Questions people already asked the assistant.", icon: <Sparkles size={18} />, on: false },
          ].map((s) => (
            <label key={s.label} className={`flex items-start gap-3 rounded-[5px] border px-3.5 py-3 ${s.on ? "border-biscay-2/60 bg-biscay-2/[0.04] ring-1 ring-biscay-2/40" : "border-ink/15"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[5px] ${s.on ? "bg-biscay text-white" : "bg-flysch text-ink/70 border border-ink/12"}`}>{s.icon}</span>
              <span className="min-w-0">
                <b className="block text-[13.5px] font-semibold text-ink">{s.label}</b>
                <span className="text-[12.5px] text-ink/65">{s.desc}</span>
              </span>
            </label>
          ))}
          <div className="flex justify-end"><Button variant="primary">Scan 2 sources</Button></div>
        </div>
      )}

      {state === "harvest-scan" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
          <Spinner size="md" label="Scanning" />
          <div className="text-[13px] text-ink/70">Scanning slack, docs…</div>
          <div className="font-term text-[11.5px] text-ink/50">Clustering threads · extracting question/answer pairs</div>
        </div>
      )}

      {state === "harvest-review" && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-term text-[12px] text-ink/65">3 of 3 accepted</span>
            <Button compact>Accept all high confidence</Button>
          </div>
          {CANDIDATES.map((c) => (
            <Card key={c.q}>
              <h3 className="text-[13.5px] font-semibold text-ink">{c.q}</h3>
              <div className="mt-1.5 flex items-center gap-2">
                <Chip label={c.src} tone="neutral" />
                <Chip label={`${c.conf}% confident`} tone={confTone(c.conf)} dot />
              </div>
              <Textarea short className="mt-2.5" defaultValue={c.draft} />
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-moss"><CheckCircle2 size={15} /> Accepted</span>
                <span className="flex-1" />
                <Button compact>Skip</Button>
              </div>
            </Card>
          ))}
          <div className="flex justify-end"><Button variant="primary">Import 3 drafts</Button></div>
        </div>
      )}

      {(state === "harvest-importing" || state === "harvest-done") && (
        <div className="mt-5 flex flex-col gap-4">
          <p className="text-[13px] text-ink/70">
            {importing
              ? "Saving 3 draft answers…"
              : "Imported 3 draft answers. They're queued in the Drafts filter for approval."}
          </p>
          <ul className="flex flex-col gap-2">
            {CANDIDATES.map((c, i) => {
              const doneRow = !importing || i < 2;
              const savingRow = importing && i === 2;
              return (
                <li key={c.q} className="flex items-center gap-2.5 text-[13px] text-ink/80">
                  {doneRow ? <CheckCircle2 size={16} className="shrink-0 text-moss" />
                    : savingRow ? <Spinner size="sm" />
                    : <Circle size={14} className="shrink-0 text-ink/30" />}
                  <span className="min-w-0 flex-1 truncate">{c.q}</span>
                  <span className="font-term text-[11px] shrink-0 text-ink/50">
                    {doneRow ? "draft saved" : savingRow ? "saving…" : "queued"}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <Button variant="primary" disabled={importing}>{importing ? "Saving…" : "Done"}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  const [filter, setFilter] = useState<Filter>(filterFor(state));

  const isHarvest = state.startsWith("harvest-");
  const isCoverage = state === "coverage";

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat value="128" label="Approved" tone="ok" sub="serving verbatim" />
        <Stat value="6" label="Drafts" tone="attention" sub="awaiting review" />
        <Stat value="2,410" label="Served this week" tone="info" sub="+12% vs last week" />
      </div>

      {isHarvest ? (
        <div className="mt-6"><HarvestPreview state={state} /></div>
      ) : isCoverage ? (
        <div className="mt-6 max-w-2xl">
          <CoverageCard state={state} extended />
        </div>
      ) : (
        <div
          className={
            mobile ? "mt-6 space-y-4" : "mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
          }
        >
          <div className="min-w-0">
            <Tabs
              ariaLabel="Filter answers"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "All" },
                { id: "approved", label: "Approved" },
                { id: "drafts", label: "Drafts" },
                { id: "retired", label: "Retired" },
              ]}
            />
            <div className="mt-4">
              <AnswersList state={state} filter={filter} />
            </div>
          </div>
          <div className="min-w-0">
            <CoverageRail state={state} />
          </div>
        </div>
      )}
    </>
  );
}

function AnswersPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("answers")} title="Answers" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="list" />
      ) : (
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Knowledge"
          title="Approved answers"
          description="Curate the answers bots and teams serve verbatim — no generation, no drift."
          actions={
            <>
              <Button variant="default" compact><Sparkles size={15} /> Harvest questions</Button>
              <Button variant="primary" compact><Plus size={15} /> New answer</Button>
            </>
          }
        />
        {/* Mounted drawer, hidden until opened. */}
        <AnswersHarvestWizard defaultOpen={false} />
        <Body key={state} state={state} mobile={mobile} />
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "answers",
  title: "Answers",
  route: "/answers",
  component: AnswersPage,
  states: STATES.map((s) => ({ ...s })),
};
