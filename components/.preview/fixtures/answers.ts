/* Answers canvas fixtures. Lifted verbatim out of AnswersPage and AnswerCard,
   which now take required data props and ship no demo content of their own.
   Nothing here is importable by a consuming app. */

import type { Answer } from "../../features/AnswerCard";
import type { AnswerStat, AnswersData, Harvest, HarvestCandidate, HarvestSource } from "../../pages/AnswersPage";
import type { PageFixtures } from "./types";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_DOC_TITLE, LONG_SOURCE, LONG_URL,
  UNBREAKABLE, LONG_WORD, HUGE_NUMBER, HUGE_NUMBER_STR, MIXED_SCRIPT, repeat,
} from "./stress";

const STATS: AnswerStat[] = [
  { value: "128", label: "Approved", tone: "ok", sub: "serving verbatim" },
  { value: "6", label: "Drafts", tone: "attention", sub: "awaiting review" },
  { value: "2,410", label: "Served this week", tone: "info", sub: "+12% vs last week" },
];

const COVERAGE: string[] = [
  "How do I rotate my API key?",
  "What's the SLA for enterprise?",
  "Can I export data as CSV?",
  "How do I invite a teammate as read-only?",
];

const APPROVED: Answer = {
  id: 1,
  question: "How long do sessions last before they expire?",
  answer: "Sessions are 30-day rolling tokens: each request within the window extends them. Signing in on a new device revokes the oldest session once you pass the five-device cap, and signing out revokes the current session immediately. Admins can force-revoke every session for a member from the members table.",
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
  answer: "The v1 export API has been removed. Use the streaming export endpoint instead: see the migration guide.",
  status: "retired",
  owner: "Priya Nair",
  channels: [],
  sources: [{ source: "docs", title: "Export migration guide" }],
  served: 0,
  spark: [],
  updated: "2026-06-30",
};

/* ── overflow / stress answers ─────────────────────────────────────────── */

const OVERFLOW_ANSWER: Answer = {
  id: 101,
  question: LONG_TITLE,
  answer: LONG_PARAGRAPH,
  status: "approved",
  owner: LONG_NAME,
  channels: ["slack-bot", "support-widget", "docs-site"],
  sources: [
    { source: "docs", title: LONG_DOC_TITLE },
    { source: "github", title: LONG_SOURCE },
    { source: "notion", title: LONG_TITLE },
  ],
  served: 482913,
  spark: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18],
  updated: "2026-07-16",
};

const OVERFLOW_ANSWER_2: Answer = {
  id: 102,
  question: "What is the full end-to-end escalation, paging, and post-incident-review procedure for a Sev-1 during a multi-region outage?",
  answer: LONG_PARAGRAPH,
  status: "draft",
  owner: LONG_NAME,
  channels: [],
  sources: [{ source: "slack", title: LONG_TITLE }],
  served: 0,
  spark: [],
  updated: "2026-07-08",
};

const STRESS_ANSWER: Answer = {
  id: 111,
  question: UNBREAKABLE,
  answer: `${UNBREAKABLE} ${MIXED_SCRIPT} ${LONG_URL}`,
  status: "approved",
  owner: LONG_WORD,
  channels: ["slack-bot", "support-widget", "docs-site"],
  sources: [
    { source: "slack", title: LONG_URL },
    { source: "github", title: UNBREAKABLE },
    { source: "docs", title: MIXED_SCRIPT },
  ],
  served: HUGE_NUMBER,
  spark: repeat((i) => (i % 5) + 1, 24),
  updated: HUGE_NUMBER_STR,
};

const STRESS_ANSWER_2: Answer = {
  id: 112,
  question: `${MIXED_SCRIPT} ${LONG_WORD}`,
  answer: LONG_URL,
  status: "draft",
  owner: MIXED_SCRIPT,
  channels: [],
  sources: [{ source: "notion", title: LONG_WORD }],
  served: 0,
  spark: [],
  updated: "2026-07-01",
};

/* ── harvest wizard ────────────────────────────────────────────────────── */

const HARVEST_SOURCES: HarvestSource[] = [
  { key: "slack", label: "Slack", desc: "Threads and decision chunks across connected channels.", on: true },
  { key: "docs", label: "Docs & repos", desc: "Google Docs, Notion pages, and GitHub READMEs.", on: true },
  { key: "history", label: "Ask-Mari history", desc: "Questions people already asked the assistant.", on: false },
];

const CANDIDATES: HarvestCandidate[] = [
  { question: "How long do sessions last before they expire?", draft: "Sessions are 30-day rolling tokens. Signing in on a new device revokes the oldest session once you pass the device cap.", source: "Google Docs", confidence: 88 },
  { question: "What happens when the settlement queue backs up?", draft: "Drain the queue before restarting workers, and escalate to #payments-oncall if depth exceeds 10,000.", source: "Notion", confidence: 79 },
  { question: "Is the v1 export API still supported?", draft: "v1 export is deprecated in favor of the streaming endpoint. It stays read-only for one quarter, then is removed.", source: "Slack", confidence: 62 },
];

const harvest = (phase: Harvest["phase"]): Harvest => ({
  phase,
  sources: HARVEST_SOURCES,
  scanning: "Scanning slack, docs…",
  candidates: CANDIDATES,
});

/* ── states ─────────────────────────────────────────────────────────────── */

/** One list view: the stat strip, the coverage rail, and a set of answers. */
const list = (answers: Answer[], filter: AnswersData["filter"] = "all"): AnswersData => ({
  stats: STATS,
  filter,
  answers,
  coverage: COVERAGE,
  pane: { kind: "answers" },
});

const DEFAULT = list([APPROVED, DRAFT, APPROVED_2]);

/** Nothing curated at all: no answers and no coverage gaps, so the page's own
    `isEmpty` check fires rather than the canvas faking the empty state. */
const EMPTY: AnswersData = { stats: STATS, filter: "all", answers: [], coverage: [], pane: { kind: "answers" } };

export const FIXTURES: PageFixtures<AnswersData> = {
  default: { data: DEFAULT },
  approved: { data: list([APPROVED, APPROVED_2], "approved") },
  drafts: { data: list([DRAFT, DRAFT_2], "drafts") },
  retired: { data: list([RETIRED], "retired") },
  "single-answer": { data: list([APPROVED]) },
  coverage: { data: { ...DEFAULT, pane: { kind: "coverage" } } },
  "harvest-select": { data: { ...DEFAULT, pane: { kind: "harvest", harvest: harvest("select") } } },
  "harvest-scan": { data: { ...DEFAULT, pane: { kind: "harvest", harvest: harvest("scan") } } },
  "harvest-review": { data: { ...DEFAULT, pane: { kind: "harvest", harvest: harvest("review") } } },
  "harvest-importing": { data: { ...DEFAULT, pane: { kind: "harvest", harvest: harvest("importing") } } },
  "harvest-done": { data: { ...DEFAULT, pane: { kind: "harvest", harvest: harvest("done") } } },
  /** Nothing matches the Drafts tab, but the workspace itself is not empty. */
  filtered: { data: list([], "drafts") },
  empty: { data: EMPTY },
  loading: { data: DEFAULT, loading: true },
  error: { data: EMPTY, error: "Answers unavailable." },
  overflow: { data: list([OVERFLOW_ANSWER, OVERFLOW_ANSWER_2]) },
  stress: { data: list([STRESS_ANSWER, STRESS_ANSWER_2]) },
};
