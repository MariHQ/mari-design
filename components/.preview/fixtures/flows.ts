/* Flows canvas fixtures. Lifted verbatim out of FlowsPage and the four Flows
   features, which now take required data props and ship no demo content of
   their own. Nothing here is importable by a consuming app. */

import type { Flow, SourceRef } from "../../features/FlowsList";
import type { EditorStep, SiteRef } from "../../features/FlowsPipelineEditor";
import type { FlowsData, FlowsEditor, FlowsExtras } from "../../pages/FlowsPage";
import type { WorkflowRun } from "../../workflow/RunHistory";
import type { PageFixtures } from "./types";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT,
  HUGE_NUMBER, HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS, LONG_BREADCRUMB, repeat,
} from "./stress";

const SOURCES: SourceRef[] = [
  { id: 1, name: "GitHub · product-docs" },
  { id: 2, name: "Slack · #support" },
  { id: 3, name: "Google Drive · Handbook" },
];

const FLOWS: Flow[] = [
  {
    id: 1, name: "Docs guardrail", color: "#B23A1E", status: "active",
    description: "Fact-checks every changed doc before it can ship.",
    whenLabel: "GitHub PR merged", trigger: { on: "document_changed", source_id: 1, path_glob: "docs/**" },
    nodes: [{ label: "GitHub PR merged" }, { label: "Fetch docs" }, { label: "Fact check" }, { label: "Contradictions?" }, { label: "Create task" }],
    lastRun: { status: "passed", started: "2026-07-20T14:12:00", dry: false },
    recentRuns: [
      { number: 141, status: "passed" }, { number: 142, status: "passed" },
      { number: 143, status: "failed" }, { number: 144, status: "passed" }, { number: 145, status: "passed" },
    ],
  },
  {
    id: 2, name: "Slack digest", color: "#1E6FA8", status: "active",
    description: "Summarizes a week of #support into a Monday digest.",
    whenLabel: "Every week", trigger: { on: "schedule", every_minutes: 10080 },
    nodes: [{ label: "Weekly scan" }, { label: "Fetch docs" }, { label: "Summarize" }, { label: "Notify" }],
    lastRun: { status: "passed", started: "2026-07-20T09:00:00" },
    recentRuns: [{ number: 88, status: "passed" }, { number: 92, status: "passed" }, { number: 97, status: "passed" }],
  },
  {
    id: 3, name: "Stale sweeper", color: "#A05E1C", status: "paused",
    description: "Flags docs that have gone quiet and assigns an owner.",
    whenLabel: "Every day", trigger: { on: "schedule", every_minutes: 1440 },
    nodes: [{ label: "Daily scan" }, { label: "Fetch docs" }, { label: "Tag docs" }, { label: "Create task" }],
    lastRun: { status: "waiting", started: "2026-07-19T06:00:00" },
    recentRuns: [{ number: 51, status: "passed" }, { number: 57, status: "waiting" }],
  },
  {
    id: 4, name: "Translation sync", color: "#2C6E49", status: "active",
    description: "Turns customer-facing edits into review-ready drafts.",
    whenLabel: "Document changed", trigger: { on: "document_changed", tag: "customer-facing" },
    nodes: [{ label: "Doc changed" }, { label: "Fetch docs" }, { label: "Summarize" }, { label: "Approval" }, { label: "Deploy site" }],
    lastRun: { status: "running", started: "2026-07-21T08:30:00", dry: true },
    recentRuns: [{ number: 201, status: "passed" }, { number: 205, status: "passed" }, { number: 209, status: "running", dry: true }],
  },
  {
    id: 5, name: "Onboarding checker", color: "#1C3F60", status: "active",
    description: "Verifies new hire docs stay consistent with the handbook.",
    whenLabel: "Manual only", trigger: {},
    nodes: [{ label: "Manual" }, { label: "Fetch docs" }, { label: "Fact check" }],
    lastRun: null,
    recentRuns: [],
  },
];

/* ── pipeline editor ──────────────────────────────────────────────────────── */

const EDITOR_MEMBERS = ["Aki K.", "Dana R.", "Priya S."];
const EDITOR_SITES: SiteRef[] = [{ id: 1, name: "Docs, production" }, { id: 2, name: "Docs, staging" }];
const EDITOR_TAGS = ["needs-review", "customer-facing", "internal", "stale"];

const EDITOR_STEPS: EditorStep[] = [
  { kind: "trigger", label: "GitHub PR merged", config: { label: "GitHub PR merged", query: "docs/**" } },
  { kind: "fetch_docs", label: "Fetch changed docs", config: { query: "docs/**", k: 5 } },
  { kind: "fact_check", label: "Verify facts", config: {} },
  { kind: "condition", label: "Contradictions?", config: { field: "contradictions", greater_than: 0 } },
  { kind: "create_task", label: "Open review task", config: { title: "Resolve contradiction", kind: "factcheck", kind_label: "Fact check" }, only_if_branch: true },
];

const BRANCH_STEPS: EditorStep[] = [
  { kind: "trigger", label: "Weekly scan", config: { label: "Weekly scan", query: "stale" } },
  { kind: "fetch_docs", label: "Fetch stale docs", config: { query: "stale", k: 8 } },
  { kind: "fact_check", label: "Verify facts", config: {} },
  { kind: "condition", label: "Contradictions?", config: { field: "contradictions", greater_than: 0 } },
  { kind: "create_task", label: "Open review task", config: { title: "Resolve contradiction", kind: "factcheck", kind_label: "Fact check" }, only_if_branch: true },
  { kind: "notify", label: "Ping the owner", config: { text: "A contradiction needs a look", detail: "" }, only_if_branch: true },
];

const EDITOR_RUNS: WorkflowRun[] = [
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", headline: "No contradictions found across 5 docs" },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", started: "2026-07-19T10:02:00", duration: "00:01:12", headline: "2 contradictions, review task opened" },
  { id: "r140", number: 140, workflowName: "Docs guardrail", status: "passed", started: "2026-07-18T16:44:00", duration: "00:00:38", dry: true, headline: "Dry run, 1 task previewed" },
];

const editor = (over: Partial<FlowsEditor>): FlowsEditor => ({
  id: 1,
  name: "Docs guardrail",
  enabled: true,
  description: "Fact-checks every changed doc before it can ship.",
  steps: EDITOR_STEPS,
  runs: EDITOR_RUNS,
  members: EDITOR_MEMBERS,
  sites: EDITOR_SITES,
  tags: EDITOR_TAGS,
  ...over,
});

/* ── run panel ────────────────────────────────────────────────────────────── */

const PANEL_RUNS: WorkflowRun[] = [
  {
    id: "r209", number: 209, workflowName: "Translation sync", status: "waiting",
    started: "2026-07-21T08:30:00", duration: "00:01:04",
    triggeredBy: "Triggered by: handbook/pricing.md changed",
    rows: [
      { step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" },
      { step: "Fetch docs", status: "passed", detail: "3 documents matched", duration: "0.8s" },
      { step: "Summarize", status: "passed", detail: "Draft written for review", duration: "42s" },
      { step: "Approval", status: "waiting", detail: "Waiting on Aki K." },
      { step: "Deploy site", status: "pending" },
    ],
    stats: [
      { label: "Edits", value: 6 }, { label: "Contradictions", value: 0 },
      { label: "Links", value: 2 }, { label: "Facts", value: 11 },
    ],
    headline: "Draft written for review, waiting on approval",
  },
  {
    id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed",
    started: "2026-07-20T14:12:00", duration: "00:00:41",
    triggeredBy: "Triggered by: docs/api.md merged",
    rows: [
      { step: "GitHub PR merged", status: "passed", detail: "PR #482", duration: "0.1s" },
      { step: "Fetch docs", status: "passed", detail: "5 documents matched", duration: "0.6s" },
      { step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" },
      { step: "Contradictions?", status: "skipped", detail: "0, yes-branch skipped" },
      { step: "Create task", status: "skipped", detail: "Not on this branch" },
    ],
    stats: [
      { label: "Edits", value: 0 }, { label: "Contradictions", value: 0 },
      { label: "Links", value: 0 }, { label: "Facts", value: 14 },
    ],
    headline: "No contradictions across 5 docs",
  },
  {
    id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true,
    started: "2026-07-19T10:02:00", duration: "00:01:12",
    rows: [
      { step: "GitHub PR merged", status: "passed", detail: "PR #479", duration: "0.1s" },
      { step: "Fetch docs", status: "passed", detail: "4 documents matched", duration: "0.5s" },
      { step: "Fact check", status: "failed", detail: "2 contradictions against accepted facts", duration: "44s" },
      { step: "Contradictions?", status: "passed", detail: "2 > 0, yes-branch taken" },
      { step: "Create task", status: "passed", detail: "Review task previewed (dry run)" },
    ],
    stats: [
      { label: "Edits", value: 3 }, { label: "Contradictions", value: 2, bad: true },
      { label: "Links", value: 1 }, { label: "Facts", value: 9 },
    ],
    headline: "2 contradictions, review task previewed",
  },
];

/* ── run history ──────────────────────────────────────────────────────────── */

const HISTORY_RUNS: WorkflowRun[] = [
  { id: "r209", number: 209, workflowName: "Translation sync", status: "running", dry: true, started: "2026-07-21T08:30:00", duration: "00:00:22", triggeredBy: "Triggered by: handbook/pricing.md changed", headline: "Summarizing 3 documents",
    rows: [{ step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" }, { step: "Fetch docs", status: "passed", detail: "3 matched", duration: "0.8s" }, { step: "Summarize", status: "running", detail: "Drafting a summary" }] },
  { id: "r205", number: 205, workflowName: "Translation sync", status: "passed", started: "2026-07-20T08:30:00", duration: "00:01:11", triggeredBy: "Triggered by: handbook/faq.md changed", headline: "Draft approved and deployed",
    stats: [{ label: "Edits", value: 4 }, { label: "Facts", value: 8 }] },
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", triggeredBy: "Triggered by: docs/api.md merged", headline: "No contradictions across 5 docs",
    rows: [{ step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" }] },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true, started: "2026-07-19T10:02:00", duration: "00:01:12", triggeredBy: "Triggered by: docs/limits.md merged", headline: "2 contradictions, review task previewed",
    stats: [{ label: "Contradictions", value: 2, bad: true }, { label: "Facts", value: 9 }] },
  { id: "r97", number: 97, workflowName: "Slack digest", status: "passed", started: "2026-07-20T09:00:00", duration: "00:00:55", triggeredBy: "Triggered by: weekly schedule", headline: "Monday digest sent to #support" },
  { id: "r57", number: 57, workflowName: "Stale sweeper", status: "waiting", started: "2026-07-19T06:00:00", duration: "00:00:31", triggeredBy: "Triggered by: daily schedule", headline: "12 stale docs, waiting on approval",
    rows: [{ step: "Tag docs", status: "passed", detail: "12 docs tagged stale", duration: "1.1s" }, { step: "Approval", status: "waiting", detail: "Waiting on Dana R." }] },
  { id: "r51", number: 51, workflowName: "Stale sweeper", status: "passed", started: "2026-07-18T06:00:00", duration: "00:00:29", triggeredBy: "Triggered by: daily schedule", headline: "8 stale docs assigned" },
  { id: "r40", number: 40, workflowName: "Onboarding checker", status: "skipped", started: "2026-07-17T11:20:00", duration: "00:00:03", headline: "No matching docs, nothing to do" },
];

/* Overflow / stress runs: long headlines, workflow names, and step labels.
   `overflow` uses natural long text; `stress` uses pathological tokens and
   huge run numbers. */
function strainedRuns(extreme: boolean): WorkflowRun[] {
  const STATUS = ["passed", "running", "waiting", "failed", "skipped"] as const;
  return repeat<WorkflowRun>((i) => ({
    id: `sr${i}`,
    number: extreme ? HUGE_NUMBER + i : 1000 + i,
    workflowName: extreme ? [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3] : LONG_TITLE,
    status: STATUS[i % STATUS.length],
    dry: i % 2 === 0,
    started: "2026-07-21T08:30:00",
    duration: "00:01:04",
    triggeredBy: `Triggered by: ${extreme ? UNBREAKABLE : LONG_SOURCE}`,
    headline: extreme ? `${MIXED_SCRIPT} ${HUGE_NUMBER_STR}` : LONG_PARAGRAPH,
    rows: [
      { step: extreme ? UNBREAKABLE : LONG_TITLE, status: "passed", detail: extreme ? LONG_WORD : LONG_SOURCE, duration: "0.2s" },
      { step: extreme ? LONG_WORD : "Fetch every document across every source and region", status: "running", detail: extreme ? HUGE_NUMBER_STR : LONG_PARAGRAPH },
    ],
    stats: [
      { label: extreme ? LONG_WORD : "Contradictions found", value: extreme ? HUGE_NUMBER : 128, bad: true },
      { label: "Facts", value: extreme ? HUGE_NUMBER + i : 9 },
    ],
  }), extreme ? 24 : 6);
}

const extras = (extreme: boolean): FlowsExtras => ({
  title: extreme ? MIXED_SCRIPT : LONG_TITLE,
  crumbs: LONG_BREADCRUMB,
  tags: extreme ? MANY_TAGS : MANY_TAGS.slice(0, 10),
  people: MANY_INITIALS,
  avatarMax: extreme ? 4 : 6,
});

/* ── states ───────────────────────────────────────────────────────────────── */

const BASE: FlowsData = {
  flows: FLOWS,
  sources: SOURCES,
  creating: false,
  editor: null,
  runPanel: null,
  runHistory: null,
  trigger: null,
  extras: null,
};

const view = (over: Partial<FlowsData>): FlowsData => ({ ...BASE, ...over });

/** A workspace with no automation at all, on any surface: the page's own
    `isEmpty` fires rather than a state flag. */
const EMPTY: FlowsData = view({ flows: [] });

export const FIXTURES: PageFixtures<FlowsData> = {
  default: { data: BASE },
  "pipeline-editor": { data: view({ editor: editor({}) }) },
  "new-flow": { data: view({ creating: true }) },
  "new-flow-first": { data: view({ flows: [], creating: true }) },
  "pipeline-branch": {
    data: view({
      editor: editor({
        id: 3,
        name: "Stale sweeper",
        description: "Flags docs that have gone quiet and routes contradictions for review.",
        steps: BRANCH_STEPS,
      }),
    }),
  },
  run: { data: view({ runPanel: { runs: PANEL_RUNS, openNumber: 209 } }) },
  "run-passed": { data: view({ runPanel: { runs: PANEL_RUNS, openNumber: 145 } }) },
  "run-failed": { data: view({ runPanel: { runs: PANEL_RUNS, openNumber: 143 } }) },
  "run-history": { data: view({ runHistory: { runs: HISTORY_RUNS, limit: 12 } }) },
  /* By id: FLOWS[4] "Onboarding checker", FLOWS[1] "Slack digest",
     FLOWS[0] "Docs guardrail". Names are not unique, ids are. */
  "trigger-manual": { data: view({ trigger: { kind: "manual", flowId: 5, on: "" } }) },
  "trigger-schedule": { data: view({ trigger: { kind: "schedule", flowId: 2, on: "schedule" } }) },
  "trigger-document": { data: view({ trigger: { kind: "document", flowId: 1, on: "document_changed" } }) },
  loading: { data: BASE, loading: true },
  error: { data: EMPTY, error: "Mari is temporarily unreachable. We are retrying automatically." },
  empty: { data: EMPTY },
  overflow: {
    data: view({ extras: extras(false), runHistory: { runs: strainedRuns(false), limit: 6 } }),
  },
  stress: {
    data: view({ extras: extras(true), runHistory: { runs: strainedRuns(true), limit: 24 } }),
  },
};
