import type { ComponentProps } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { KnowledgeBrowser } from "../features/KnowledgeBrowser";
import { KnowledgeInspector } from "../features/KnowledgeInspector";
import { PageHeader, Card, EmptyState } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_DOC_TITLE, LONG_SOURCE, LONG_URL,
  UNBREAKABLE, LONG_WORD, HUGE_NUMBER, HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS,
} from "./stress";

/* Knowledge search surface (pages/knowledge.md). A workspace that pairs the
   faceted results browser (filter rail + search + result cards + footer stats)
   with a sticky inspector for the selected result. States walk every result-type
   tab, content variants (few / many / single), the two inspector modes
   (document vs. Slack thread-chunk vs. nothing selected), and the loading /
   offline / empty edges. */

type Result = NonNullable<ComponentProps<typeof KnowledgeBrowser>["results"]>[number];
type Doc = NonNullable<ComponentProps<typeof KnowledgeInspector>["doc"]>;

const RESULTS: Result[] = [
  { id: "r1", kind: "page", source: "notion", title: "Payments incident runbook", snippet: "When the settlement queue backs up, drain it before restarting workers. Escalate to on-call if depth exceeds 10k.", author: "Priya Nair", date: "2026-07-16", tags: ["canonical"], status: "canonical" },
  { id: "r2", kind: "thread", source: "slack", title: "Decision: move webhooks to the new gateway", snippet: "We agreed to cut over webhook delivery to the gateway on the 24th, with a rollback window through EOD.", author: "#eng-platform", date: "2026-07-15", tags: [], status: "verified", messageCount: 22, participantCount: 6 },
  { id: "r3", kind: "pr", source: "github", title: "feat: retry settlement on transient gateway errors", snippet: "Adds exponential backoff for 5xx from the settlement gateway; caps at 5 attempts, emits a metric per retry.", author: "Marcus Vale", date: "2026-07-14", tags: ["needs-review"], status: "needs-review" },
  { id: "r4", kind: "page", source: "docs", title: "Sign-in and session model", snippet: "Sessions are 30-day rolling tokens. Signing in from a new device revokes the oldest session past the cap.", author: "Dana Osei", date: "2026-07-11", tags: ["customer-facing"], status: "verified" },
  { id: "r5", kind: "thread", source: "slack", title: "Decision chunk: deprecate the v1 export API", snippet: "v1 export is superseded by the streaming endpoint; we'll keep it read-only for one quarter, then remove it.", author: "#product", date: "2026-07-08", tags: [], status: "stale", messageCount: 14, participantCount: 4 },
  { id: "r6", kind: "pr", source: "github", title: "fix: correct freshness rollup for archived sources", snippet: "Archived sources were dragging the fresh-% down; exclude them from the denominator in the rollup job.", author: "Priya Nair", date: "2026-06-30", tags: [], status: "stale" },
  { id: "r7", kind: "page", source: "notion", title: "Evidence policy: how tags drive ranking", snippet: "Canonical outranks verified; needs-review is excluded from evidence entirely until a person clears it.", author: "Dana Osei", date: "2026-07-02", tags: ["canonical"], status: "canonical" },
];

const MANY: Result[] = [
  ...RESULTS,
  { id: "r8", kind: "page", source: "docs", title: "Billing proration runbook", snippet: "Mid-cycle plan changes prorate to the day; downgrades credit the difference to the next invoice.", author: "Maya M.", date: "2026-06-24", tags: ["verified"], status: "verified" },
  { id: "r9", kind: "thread", source: "slack", title: "Decision chunk: SSO enforcement rollout", snippet: "Enforce SSO org-wide after the 30-day grace period; break-glass local logins stay for two named admins.", author: "#security", date: "2026-06-20", tags: [], status: "canonical", messageCount: 31, participantCount: 9 },
  { id: "r10", kind: "pr", source: "github", title: "chore: bump ingestion workers to 8 replicas", snippet: "Scale ingestion horizontally ahead of the Notion backfill; adds an HPA target at 70% CPU.", author: "Marcus Vale", date: "2026-06-18", tags: [], status: "verified" },
  { id: "r11", kind: "page", source: "notion", title: "On-call escalation ladder", snippet: "Primary → secondary after 10 minutes unacked; incident commander paged at Sev1 automatically.", author: "Sam Ortiz", date: "2026-06-15", tags: ["needs-review"], status: "needs-review" },
  { id: "r12", kind: "thread", source: "slack", title: "Decision chunk: freeze schema changes for GA", snippet: "No breaking schema changes in the two weeks before GA; additive columns only, behind flags.", author: "#eng-platform", date: "2026-06-11", tags: [], status: "verified", messageCount: 18, participantCount: 7 },
  { id: "r13", kind: "pr", source: "github", title: "feat: add JWKS rotation health check", snippet: "Fails the readiness probe if the JWKS endpoint hasn't rotated inside the expected window.", author: "Aki Kim", date: "2026-06-09", tags: [], status: "stale" },
];

const SLACK_DOC: Doc = {
  id: "chunk_2f9a",
  title: "Decision: move webhooks to the new gateway",
  source: "slack",
  kind: "Thread chunk",
  owner: "#eng-platform",
  updated: "2026-07-15",
  slack: true,
  messageCount: 22,
  summary: "A thread-sized decision chunk: the team agreed to cut webhook delivery over to the new gateway on the 24th, keeping a rollback window through end of day. Ownership stays with #eng-platform.",
  tags: [],
  facts: [
    { text: "Cutover date is the 24th, with a same-day rollback window." },
    { text: "Delivery retries use exponential backoff capped at 5 attempts." },
  ],
  related: [
    { source: "github", title: "feat: retry settlement on transient errors" },
    { source: "notion", title: "Payments incident runbook" },
  ],
  timeline: [
    { at: "Jul 15, 3:20 PM", actor: "Marcus Vale", verb: "summarized the decision" },
    { at: "Jul 15, 2:58 PM", actor: "Priya Nair", verb: "raised the rollback window" },
  ],
};

/* ── overflow / stress corpora ─────────────────────────────────────────── */

const OVERFLOW_RESULTS: Result[] = [
  { id: "o1", kind: "page", source: "notion", title: LONG_TITLE, snippet: LONG_PARAGRAPH, author: LONG_NAME, date: "2026-07-16", tags: MANY_TAGS.slice(0, 8), status: "canonical" },
  { id: "o2", kind: "pr", source: "github", title: LONG_DOC_TITLE, snippet: LONG_PARAGRAPH, author: LONG_NAME, date: "2026-07-14", tags: MANY_TAGS.slice(0, 5), status: "needs-review" },
  { id: "o3", kind: "thread", source: "slack", title: LONG_TITLE, snippet: LONG_PARAGRAPH, author: "#platform-reliability-and-incident-response-coordination", date: "2026-07-12", tags: [], status: "verified", messageCount: 1284, participantCount: 96 },
  { id: "o4", kind: "page", source: "docs", title: LONG_DOC_TITLE, snippet: LONG_PARAGRAPH, author: "Dana Osei", date: "2026-07-11", tags: MANY_TAGS.slice(0, 6), status: "verified" },
];

const STRESS_RESULTS: Result[] = [
  { id: "s1", kind: "page", source: "notion", title: UNBREAKABLE, snippet: `${MIXED_SCRIPT} ${LONG_URL}`, author: LONG_WORD, date: "2026-07-16", tags: MANY_TAGS, status: "canonical" },
  { id: "s2", kind: "pr", source: "github", title: LONG_WORD, snippet: UNBREAKABLE, author: LONG_NAME, date: "2026-07-15", tags: MANY_TAGS, status: "needs-review" },
  { id: "s3", kind: "thread", source: "slack", title: `${MIXED_SCRIPT} ${UNBREAKABLE}`, snippet: LONG_URL, author: `#${LONG_WORD}`, date: "2026-07-14", tags: [], status: "verified", messageCount: HUGE_NUMBER, participantCount: HUGE_NUMBER },
  { id: "s4", kind: "page", source: "docs", title: LONG_URL, snippet: `${UNBREAKABLE} ${MIXED_SCRIPT} ${HUGE_NUMBER_STR}`, author: MIXED_SCRIPT, date: "2026-07-13", tags: MANY_TAGS, status: "stale" },
];

const OVERFLOW_DOC: Doc = {
  id: "doc_overflow_consolidated_reliability_runbook_revision",
  title: LONG_TITLE,
  source: "notion",
  kind: "Page",
  owner: LONG_NAME,
  updated: "2026-07-16",
  summary: LONG_PARAGRAPH,
  tags: MANY_TAGS.slice(0, 8),
  facts: [
    { text: LONG_PARAGRAPH },
    { text: "Escalation to the on-call incident commander happens automatically at Sev-1, and the paging policy re-pages the secondary responder after ten minutes without an acknowledgement from the primary." },
  ],
  related: [
    { source: "github", title: LONG_DOC_TITLE },
    { source: "docs", title: LONG_TITLE },
    { source: "slack", title: LONG_SOURCE },
  ],
  timeline: [
    { at: "Jul 16, 4:12 PM", actor: LONG_NAME, verb: "verified the consolidated runbook after reconciling it against four quarters of incident retrospectives" },
    { at: "Jul 11, 9:38 AM", actor: LONG_NAME, verb: "added the end-of-business-day rollback window" },
  ],
};

const STRESS_DOC: Doc = {
  id: UNBREAKABLE,
  title: `${UNBREAKABLE} ${MIXED_SCRIPT}`,
  source: "docs",
  kind: LONG_WORD,
  owner: LONG_WORD,
  updated: HUGE_NUMBER_STR,
  summary: `${UNBREAKABLE} ${MIXED_SCRIPT} ${LONG_URL}`,
  tags: MANY_TAGS,
  facts: [
    { text: UNBREAKABLE },
    { text: `${MIXED_SCRIPT}, ${LONG_URL}` },
    { text: LONG_WORD },
  ],
  related: [
    { source: "github", title: LONG_URL },
    { source: "slack", title: UNBREAKABLE },
  ],
  timeline: [
    { at: HUGE_NUMBER_STR, actor: LONG_WORD, verb: MIXED_SCRIPT },
  ],
};

const STATES = [
  { id: "default", label: "Default" },
  { id: "documents", label: "Documents tab" },
  { id: "conversations", label: "Conversations tab · Slack chunks" },
  { id: "pages", label: "Pages tab" },
  { id: "pull-requests", label: "Pull requests tab" },
  { id: "single-result", label: "Single result" },
  { id: "many-results", label: "Many results" },
  { id: "inspector-slack", label: "Inspector · Slack thread-chunk" },
  { id: "no-selection", label: "Nothing selected" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No results" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

function resultsFor(state: string): Result[] {
  switch (state) {
    case "documents": return RESULTS.filter((r) => r.kind === "page");
    case "conversations": return RESULTS.filter((r) => r.kind === "thread");
    case "pages": return RESULTS.filter((r) => r.source === "docs" || r.source === "notion");
    case "pull-requests": return RESULTS.filter((r) => r.kind === "pr");
    case "single-result": return RESULTS.slice(0, 1);
    case "many-results": return MANY;
    case "overflow": return OVERFLOW_RESULTS;
    case "stress": return STRESS_RESULTS;
    default: return RESULTS;
  }
}

function Feed({ state }: { state: string }) {
  if (state === "error") {
    return (
      <Card>
        <EmptyState title="API offline">Search is unavailable. Retrying…</EmptyState>
      </Card>
    );
  }
  if (state === "empty") {
    return (
      <Card>
        <EmptyState title="No results">
          No results match the current filters. Clear a filter or try a different search.
        </EmptyState>
      </Card>
    );
  }
  return <KnowledgeBrowser key={state} results={resultsFor(state)} />;
}

function Inspector({ state }: { state: string }) {
  if (state === "no-selection") {
    return (
      <Card>
        <div className="grid place-items-center py-16">
          <EmptyState title="Nothing selected">Select a result to inspect it here.</EmptyState>
        </div>
      </Card>
    );
  }
  if (state === "error" || state === "empty") {
    return (
      <Card>
        <EmptyState title="No document">Nothing to inspect.</EmptyState>
      </Card>
    );
  }
  if (state === "inspector-slack" || state === "conversations") {
    return <KnowledgeInspector key={state} doc={SLACK_DOC} />;
  }
  if (state === "overflow") {
    return <KnowledgeInspector key={state} doc={OVERFLOW_DOC} />;
  }
  if (state === "stress") {
    return <KnowledgeInspector key={state} doc={STRESS_DOC} />;
  }
  return <KnowledgeInspector key={state} />;
}

function KnowledgePage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("knowledge")} title="Knowledge" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="detail" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Knowledge"
          title="Search the knowledge base"
          description="Every connected source in one index: filter, read the match in context, and inspect the document beside it."
        />
        <div
          className={
            mobile
              ? "mt-6 flex flex-col gap-5"
              : "mt-6 grid gap-5 grid-cols-[minmax(0,1fr)_360px]"
          }
        >
          <div className="min-w-0">
            <Feed state={state} />
          </div>
          <div className={mobile ? "min-w-0" : "min-w-0 sticky top-6 self-start"}>
            <Inspector state={state} />
          </div>
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "knowledge",
  title: "Knowledge",
  route: "/knowledge",
  component: KnowledgePage,
  states: STATES.map((s) => ({ ...s })),
};
