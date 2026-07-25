import type { ComponentSpec } from "./types";
import {
  FlowsList, FlowsPipelineEditor, FlowsRunPanel, FlowsRunHistory,
  InsightsWidgets, InsightsFreshnessChart,
  AuditFindingsChecklist, FactsVerificationAudit,
  LibraryGlossaryPanel, LibraryGuidesPanel, LibraryRulesPanel,
  LibraryTagsPanel, LibraryTemplatesPanel,
} from "../../features";
import type { WorkflowRun } from "../../index";
import type { Flow } from "../../features/FlowsList";
import type { EditorStep } from "../../features/FlowsPipelineEditor";
import type { ReadRow, GlossRow } from "../../features/InsightsWidgets";
import type { Freshness } from "../../features/InsightsFreshnessChart";
import type { AuditFinding } from "../../features/AuditFindingsChecklist";
import type { Fact } from "../../features/FactsVerificationAudit";
import type { Term } from "../../features/LibraryGlossaryPanel";
import type { Guide } from "../../features/LibraryGuidesPanel";
import type { TagDef } from "../../features/LibraryTagsPanel";
import type { Template } from "../../features/LibraryTemplatesPanel";
import {
  FLOWS_SOURCES, FLOWS_EDITOR, FLOWS_PANEL_RUNS, FLOWS_HISTORY_RUNS,
  INSIGHTS_STATS, INSIGHTS_READABILITY, INSIGHTS_GLOSSARY, INSIGHTS_ACTIVITY, INSIGHTS_SINCE,
  INSIGHTS_FRESHNESS, AUDIT_MEMBERS, AUDIT_PROVIDER, AUDIT_REPO, AUDIT_RAN_AT,
  FACTS_AUDIT_ROWS, LIBRARY_WORKSPACE, LIBRARY_DEFAULT_PACK, LIBRARY_VOICE,
  LIBRARY_CHECKER_DOCS, LIBRARY_TOTAL_DOCS, LIBRARY_TERMS, LIBRARY_TEMPLATES,
} from "../fixtures/features";

/* State matrix for the flows group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

/* ── shared overflow payloads ─────────────────────────────────────────── */

const LONG =
  "Quarterly revenue recognition guardrail for multi-year enterprise agreements with usage-based true-ups and regional tax overrides";
/** 90 characters, no spaces, nothing to break on. */
const HUGE = "Zettelkasten_ingestion_pipeline_configuration_parameter_identifier_v2_no_spaces_abcdefgh";
const NARROW = 320;

/* ── FlowsList ────────────────────────────────────────────────────────── */

const FLOW_ROWS: Flow[] = [
  {
    id: 1, name: "Docs guardrail", color: "#B23A1E", status: "active",
    description: "Fact-checks every changed doc before it can ship.",
    whenLabel: "GitHub PR merged", trigger: { on: "document_changed", source_id: 1, path_glob: "docs/**" },
    nodes: [{ label: "GitHub PR merged" }, { label: "Fetch docs" }, { label: "Fact check" }],
    lastRun: { status: "passed", started: "2026-07-20T14:12:00" },
    recentRuns: [{ number: 143, status: "failed" }, { number: 145, status: "passed" }],
  },
  {
    id: 2, name: "Translation sync", color: "#2C6E49", status: "active",
    description: "Turns customer-facing edits into review-ready drafts.",
    whenLabel: "Document changed", trigger: { on: "document_changed", tag: "customer-facing" },
    nodes: [{ label: "Doc changed" }, { label: "Summarize" }, { label: "Approval" }],
    lastRun: { status: "running", started: "2026-07-21T08:30:00", dry: true },
    recentRuns: [{ number: 209, status: "running", dry: true }],
  },
  {
    id: 3, name: "Stale sweeper", color: "#A05E1C", status: "paused",
    description: "Flags docs that have gone quiet and assigns an owner.",
    whenLabel: "Every day", trigger: { on: "schedule", every_minutes: 1440 },
    nodes: [{ label: "Daily scan" }, { label: "Tag docs" }],
    lastRun: { status: "waiting", started: "2026-07-19T06:00:00" },
    recentRuns: [{ number: 57, status: "waiting" }],
  },
  {
    id: 4, name: "Onboarding checker", color: "#1C3F60", status: "active",
    description: "Verifies new hire docs stay consistent with the handbook.",
    whenLabel: "Manual only", trigger: {},
    nodes: [{ label: "Manual" }, { label: "Fact check" }],
    lastRun: null, recentRuns: [],
  },
];

const FLOW_OVERFLOW: Flow[] = [
  {
    id: 90, name: LONG, color: "#B23A1E", status: "active",
    description: `${LONG} ${LONG}`,
    whenLabel: LONG, trigger: { on: "document_changed", tag: HUGE, path_glob: HUGE },
    nodes: [{ label: HUGE }],
    lastRun: { status: "failed", started: "2026-07-20T14:12:00", dry: true },
    recentRuns: Array.from({ length: 14 }, (_, i) => ({ number: 300 + i, status: "passed" as const })),
  },
  {
    id: 91, name: HUGE, color: "#1E6FA8", status: "paused",
    description: HUGE, whenLabel: HUGE, trigger: { on: "schedule", every_minutes: 7 },
    nodes: [{ label: HUGE }],
    lastRun: { status: "running", started: "2026-07-21T08:30:00" },
    recentRuns: [{ number: 1, status: "running" }],
  },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_FLOWS: Flow[] = Array.from({ length: 200 }, (_, i) => {
  const base = FLOW_ROWS[i % FLOW_ROWS.length];
  return {
    ...base,
    id: i + 1,
    name: i % 31 === 0 ? HUGE : `${base.name} ${i + 1}`,
    description: i % 17 === 0 ? LONG : base.description,
    recentRuns: Array.from({ length: (i % 12) + 1 }, (_, j) => ({
      number: 1000 + i * 20 + j,
      status: (["passed", "failed", "waiting", "running", "skipped"] as const)[j % 5],
    })),
  };
});

const FLOWS_LIST: ComponentSpec = {
  id: "FlowsList", title: "FlowsList", width: 1180,
  states: [
    { id: "default", label: "Default", node: <FlowsList flows={FLOW_ROWS} sources={FLOWS_SOURCES} /> },
    { id: "loading", label: "Loading", node: <FlowsList flows={[]} sources={[]} loading /> },
    { id: "empty", label: "Empty (no flows)", node: <FlowsList flows={[]} sources={FLOWS_SOURCES} /> },
    { id: "single", label: "One flow, never run", node: <FlowsList flows={[FLOW_ROWS[3]]} sources={FLOWS_SOURCES} /> },
    { id: "overflow-text", label: "Overflow: long names, unbreakable strings, many run dots", node: <FlowsList flows={FLOW_OVERFLOW} sources={FLOWS_SOURCES} /> },
    { id: "overflow-rows", label: "Overflow: too many rows", node: <FlowsList flows={[...FLOW_ROWS, ...FLOW_ROWS, ...FLOW_ROWS].map((f, i) => ({ ...f, id: i + 1 }))} sources={FLOWS_SOURCES} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <FlowsList flows={FLOW_ROWS.slice(0, 2)} sources={FLOWS_SOURCES} /> },
    { id: "stress", label: "Volume: 200 flows, up to 12 run dots each", node: <FlowsList flows={STRESS_FLOWS} sources={FLOWS_SOURCES} /> },
  ],
};

/* ── FlowsPipelineEditor ──────────────────────────────────────────────── */

const EDITOR_STEPS: EditorStep[] = [
  { kind: "trigger", label: "GitHub PR merged", config: { label: "GitHub PR merged", query: "docs/**" } },
  { kind: "fetch_docs", label: "Fetch changed docs", config: { query: "docs/**", k: 5 } },
  { kind: "fact_check", label: "Verify facts", config: {} },
  { kind: "condition", label: "Contradictions?", config: { field: "contradictions", greater_than: 0 } },
  { kind: "create_task", label: "Open review task", config: { title: "Resolve contradiction", kind: "factcheck", kind_label: "Fact check" }, only_if_branch: true },
];

const EDITOR_OVERFLOW: EditorStep[] = [
  { kind: "trigger", label: LONG, config: { label: LONG, query: HUGE } },
  { kind: "refine", label: HUGE, config: { skill: "tighten" } },
  { kind: "notify", label: LONG, config: { text: LONG, detail: HUGE } },
];

const EDITOR_RUNS: WorkflowRun[] = [
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", headline: "No contradictions found across 5 docs" },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", started: "2026-07-19T10:02:00", duration: "00:01:12", headline: "2 contradictions, review task opened" },
  { id: "r140", number: 140, workflowName: "Docs guardrail", status: "passed", started: "2026-07-18T16:44:00", duration: "00:00:38", dry: true, headline: "Dry run, 1 task previewed" },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_STEPS: EditorStep[] = Array.from({ length: 60 }, (_, i) => (
  i === 0
    ? { kind: "trigger" as const, label: "GitHub PR merged", config: { label: "GitHub PR merged", query: "docs/**" } }
    : {
        kind: (["fetch_docs", "refine", "fact_check", "tag", "condition", "approval", "notify", "create_task"] as const)[i % 8],
        label: i % 13 === 0 ? HUGE : `Step ${i + 1}: verify every claim in the fetched set`,
        config: { query: "docs/**", k: 5, skill: "tighten", tag: "needs-review", field: "contradictions", greater_than: 0, assignee: "Aki K.", text: LONG },
      }
));

const STRESS_RUNS: WorkflowRun[] = Array.from({ length: 200 }, (_, i) => ({
  id: `sr${i}`,
  number: 100000 + i,
  workflowName: i % 29 === 0 ? HUGE : ["Docs guardrail", "Translation sync", "Stale sweeper", "Onboarding checker"][i % 4],
  status: (["passed", "failed", "waiting", "running", "skipped", "pending"] as const)[i % 6],
  dry: i % 5 === 0,
  started: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T10:02:00`,
  duration: "00:01:12",
  triggeredBy: `Triggered by: ${i % 7 === 0 ? HUGE : "docs/api.md merged"}`,
  headline: i % 11 === 0 ? LONG : `Run ${i + 1}: no contradictions across 5 documents`,
  rows: Array.from({ length: (i % 40) + 3 }, (_, j) => ({
    step: j % 9 === 0 ? HUGE : `Step ${j + 1}`,
    status: (["passed", "failed", "waiting", "skipped", "pending"] as const)[j % 5],
    detail: j % 6 === 0 ? LONG : "3 documents matched",
    duration: "0.5s",
  })),
  stats: [
    { label: "Edits", value: 128000 }, { label: "Contradictions", value: 99999, bad: true },
    { label: "Links", value: 4021 }, { label: "Facts", value: 288301 },
  ],
}));

const PIPELINE_EDITOR: ComponentSpec = {
  id: "FlowsPipelineEditor", title: "FlowsPipelineEditor", width: 1100,
  states: [
    { id: "default", label: "Default (trigger step selected)", node: <FlowsPipelineEditor {...FLOWS_EDITOR} /> },
    { id: "loading", label: "Loading", node: <FlowsPipelineEditor {...FLOWS_EDITOR} steps={[]} runs={[]} loading /> },
    { id: "trigger-only", label: "Trigger only, no runs yet", node: <FlowsPipelineEditor {...FLOWS_EDITOR} steps={[EDITOR_STEPS[0]]} runs={[]} /> },
    { id: "runs", label: "With run history", node: <FlowsPipelineEditor {...FLOWS_EDITOR} steps={EDITOR_STEPS} runs={EDITOR_RUNS} /> },
    { id: "overflow-text", label: "Overflow: long labels and unbreakable config", node: <FlowsPipelineEditor {...FLOWS_EDITOR} name={LONG} description={HUGE} steps={EDITOR_OVERFLOW} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <FlowsPipelineEditor {...FLOWS_EDITOR} steps={EDITOR_STEPS.slice(0, 3)} runs={EDITOR_RUNS.slice(0, 1)} /> },
    { id: "stress", label: "Volume: 60-step flow, 200 runs", node: <FlowsPipelineEditor {...FLOWS_EDITOR} steps={STRESS_STEPS} runs={STRESS_RUNS} /> },
  ],
};

/* ── FlowsRunPanel ────────────────────────────────────────────────────── */

const PANEL_RUNS: WorkflowRun[] = [
  {
    id: "r209", number: 209, workflowName: "Translation sync", status: "waiting",
    started: "2026-07-21T08:30:00", duration: "00:01:04",
    triggeredBy: "Triggered by: handbook/pricing.md changed",
    rows: [
      { step: "Doc changed", status: "passed", detail: "handbook/pricing.md", duration: "0.2s" },
      { step: "Summarize", status: "passed", detail: "Draft written for review", duration: "42s" },
      { step: "Approval", status: "waiting", detail: "Waiting on Aki K." },
      { step: "Deploy site", status: "pending" },
    ],
    stats: [{ label: "Edits", value: 6 }, { label: "Contradictions", value: 0 }, { label: "Links", value: 2 }, { label: "Facts", value: 11 }],
    headline: "Draft written for review, waiting on approval",
  },
  {
    id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed",
    started: "2026-07-20T14:12:00", duration: "00:00:41",
    rows: [{ step: "Fact check", status: "passed", detail: "No contradictions found", duration: "38s" }],
    stats: [{ label: "Facts", value: 14 }],
    headline: "No contradictions across 5 docs",
  },
  {
    id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true,
    started: "2026-07-19T10:02:00", duration: "00:01:12",
    rows: [{ step: "Fact check", status: "failed", detail: "2 contradictions against accepted facts", duration: "44s" }],
    stats: [{ label: "Contradictions", value: 2, bad: true }],
    headline: "2 contradictions, review task previewed",
  },
];

const PANEL_OVERFLOW: WorkflowRun[] = [
  {
    id: "rx", number: 999999, workflowName: LONG, status: "failed", dry: true,
    started: "2026-07-19T10:02:00", duration: "00:01:12",
    triggeredBy: `Triggered by: ${HUGE}`,
    rows: Array.from({ length: 12 }, (_, i) => ({ step: i % 2 ? LONG : HUGE, status: "passed" as const, detail: HUGE, duration: "0.5s" })),
    stats: [{ label: "Contradictions", value: 128000, bad: true }, { label: "Facts", value: 99999 }],
    headline: LONG,
  },
];

const RUN_PANEL: ComponentSpec = {
  id: "FlowsRunPanel", title: "FlowsRunPanel", width: 1100,
  states: [
    { id: "default", label: "Default (waiting run selected)", node: <FlowsRunPanel runs={PANEL_RUNS} /> },
    { id: "selected-passed", label: "Selected: a passed run", node: <FlowsRunPanel runs={PANEL_RUNS} openNumber={145} /> },
    { id: "selected-failed", label: "Selected: a failed dry run", node: <FlowsRunPanel runs={PANEL_RUNS} openNumber={143} /> },
    { id: "loading", label: "Loading", node: <FlowsRunPanel runs={[]} loading /> },
    { id: "empty", label: "Empty (nothing to inspect)", node: <FlowsRunPanel runs={[]} /> },
    { id: "overflow-text", label: "Overflow: long headlines, many steps, huge numbers", node: <FlowsRunPanel runs={PANEL_OVERFLOW} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <FlowsRunPanel runs={PANEL_RUNS} /> },
    { id: "stress", label: "Volume: 200 runs, up to 42 steps each", node: <FlowsRunPanel runs={STRESS_RUNS} /> },
  ],
};

/* ── FlowsRunHistory ──────────────────────────────────────────────────── */

const HISTORY_RUNS: WorkflowRun[] = [
  { id: "r209", number: 209, workflowName: "Translation sync", status: "running", dry: true, started: "2026-07-21T08:30:00", duration: "00:00:22", triggeredBy: "Triggered by: handbook/pricing.md changed", headline: "Summarizing 3 documents", rows: [{ step: "Summarize", status: "running", detail: "Drafting" }] },
  { id: "r205", number: 205, workflowName: "Translation sync", status: "passed", started: "2026-07-20T08:30:00", duration: "00:01:11", triggeredBy: "Triggered by: handbook/faq.md changed", headline: "Draft approved and deployed", stats: [{ label: "Edits", value: 4 }] },
  { id: "r145", number: 145, workflowName: "Docs guardrail", status: "passed", started: "2026-07-20T14:12:00", duration: "00:00:41", triggeredBy: "Triggered by: docs/api.md merged", headline: "No contradictions across 5 docs" },
  { id: "r143", number: 143, workflowName: "Docs guardrail", status: "failed", dry: true, started: "2026-07-19T10:02:00", duration: "00:01:12", triggeredBy: "Triggered by: docs/limits.md merged", headline: "2 contradictions, review task previewed" },
  { id: "r57", number: 57, workflowName: "Stale sweeper", status: "waiting", started: "2026-07-19T06:00:00", duration: "00:00:31", triggeredBy: "Triggered by: daily schedule", headline: "12 stale docs, waiting on approval", rows: [{ step: "Approval", status: "waiting", detail: "Waiting on Dana R." }] },
  { id: "r40", number: 40, workflowName: "Onboarding checker", status: "skipped", started: "2026-07-17T11:20:00", duration: "00:00:03", headline: "No matching docs, nothing to do" },
];

const HISTORY_OVERFLOW: WorkflowRun[] = Array.from({ length: 16 }, (_, i) => ({
  id: `x${i}`, number: 100000 + i, workflowName: i % 2 ? LONG : HUGE,
  status: (["passed", "failed", "waiting", "running", "skipped", "pending"] as const)[i % 6],
  started: "2026-07-19T10:02:00", duration: "00:01:12", dry: i % 3 === 0,
  triggeredBy: `Triggered by: ${HUGE}`, headline: LONG,
}));

const RUN_HISTORY: ComponentSpec = {
  id: "FlowsRunHistory", title: "FlowsRunHistory", width: 1280,
  states: [
    { id: "default", label: "Default (first run selected)", node: <FlowsRunHistory runs={HISTORY_RUNS} /> },
    { id: "loading", label: "Loading", node: <FlowsRunHistory runs={[]} loading /> },
    { id: "empty", label: "Empty (no runs)", node: <FlowsRunHistory runs={[]} /> },
    { id: "single", label: "One run", node: <FlowsRunHistory runs={[HISTORY_RUNS[3]]} /> },
    { id: "overflow-rows", label: "Overflow: many rows, every status, long text", node: <FlowsRunHistory runs={HISTORY_OVERFLOW} limit={16} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <FlowsRunHistory runs={HISTORY_RUNS.slice(0, 3)} /> },
    { id: "stress", label: "Volume: 200 runs", node: <FlowsRunHistory runs={STRESS_RUNS} /> },
  ],
};

/* ── InsightsWidgets ──────────────────────────────────────────────────── */

const READ_ROWS: ReadRow[] = [
  { id: 1, title: "API authentication", source: "github", grade: "A", note: "Clear, concise, well-structured." },
  { id: 2, title: "Billing and invoices", source: "gdocs", grade: "B", note: "Two long paragraphs could be split." },
  { id: 3, title: "Rate limits", source: "github", grade: "C", note: "Dense; heavy passive voice." },
  { id: 4, title: "Onboarding checklist", source: "notion", grade: "A", note: "" },
];

const READ_OVERFLOW: ReadRow[] = [
  { id: 1, title: LONG, source: "github", grade: "A", note: LONG },
  { id: 2, title: HUGE, source: "gdocs", grade: "C", note: HUGE },
];

const GLOSS_ROWS: GlossRow[] = [
  { id: 1, term: "Flow", variants: ["workflow", "automation"], definition: "An automation that watches knowledge and does editorial work." },
  { id: 2, term: "Drift", variants: ["staleness", "doc rot"], definition: "When a document falls out of sync with accepted facts." },
];

const GLOSS_OVERFLOW: GlossRow[] = [
  { id: 1, term: LONG, variants: [LONG, HUGE], definition: `${LONG} ${HUGE}` },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_READ: ReadRow[] = Array.from({ length: 300 }, (_, i) => ({
  ...READ_ROWS[i % READ_ROWS.length],
  id: i + 1,
  title: i % 23 === 0 ? HUGE : `${READ_ROWS[i % READ_ROWS.length].title} ${i + 1}`,
  note: i % 13 === 0 ? LONG : READ_ROWS[i % READ_ROWS.length].note,
}));

const STRESS_GLOSS: GlossRow[] = Array.from({ length: 200 }, (_, i) => ({
  ...GLOSS_ROWS[i % GLOSS_ROWS.length],
  id: i + 1,
  term: i % 19 === 0 ? HUGE : `${GLOSS_ROWS[i % GLOSS_ROWS.length].term} ${i + 1}`,
}));

const INSIGHTS_WIDGETS: ComponentSpec = {
  id: "InsightsWidgets", title: "InsightsWidgets", width: 1180,
  states: [
    { id: "default", label: "Default", node: <InsightsWidgets stats={INSIGHTS_STATS} activity={INSIGHTS_ACTIVITY} since={INSIGHTS_SINCE} readability={READ_ROWS} glossary={GLOSS_ROWS} /> },
    { id: "loading", label: "Loading", node: <InsightsWidgets stats={[]} readability={[]} glossary={[]} activity={[]} since={INSIGHTS_SINCE} loading /> },
    { id: "empty", label: "Empty (no readability, glossary, activity)", node: <InsightsWidgets stats={INSIGHTS_STATS} since={INSIGHTS_SINCE} readability={[]} glossary={[]} activity={[]} /> },
    { id: "overflow-text", label: "Overflow: long titles, notes, terms", node: <InsightsWidgets stats={INSIGHTS_STATS} activity={INSIGHTS_ACTIVITY} since={INSIGHTS_SINCE} readability={READ_OVERFLOW} glossary={GLOSS_OVERFLOW} /> },
    { id: "overflow-rows", label: "Overflow: many readability rows", node: <InsightsWidgets stats={INSIGHTS_STATS} activity={INSIGHTS_ACTIVITY} since={INSIGHTS_SINCE} readability={Array.from({ length: 14 }, (_, i) => ({ ...READ_ROWS[i % 4], id: i }))} glossary={GLOSS_ROWS} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <InsightsWidgets stats={INSIGHTS_STATS} activity={INSIGHTS_ACTIVITY} since={INSIGHTS_SINCE} readability={READ_ROWS.slice(0, 2)} glossary={GLOSS_ROWS.slice(0, 1)} /> },
    { id: "stress", label: "Volume: 300 readability rows, 200 glossary rows", node: <InsightsWidgets stats={INSIGHTS_STATS} activity={INSIGHTS_ACTIVITY} since={INSIGHTS_SINCE} readability={STRESS_READ} glossary={STRESS_GLOSS} /> },
  ],
};

/* ── InsightsFreshnessChart ───────────────────────────────────────────── */

const FRESHNESS: Freshness[] = [
  { source: "github", fresh: 128, aging: 34, stale: 12 },
  { source: "gdocs", fresh: 62, aging: 41, stale: 27 },
  { source: "slack", fresh: 210, aging: 18, stale: 4 },
  { source: "notion", fresh: 44, aging: 22, stale: 31 },
  { source: "docs", fresh: 0, aging: 0, stale: 0 },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_FRESHNESS: Freshness[] = Array.from({ length: 40 }, (_, i) => ({
  source: i % 11 === 0 ? HUGE : `${["github", "gdocs", "slack", "notion", "docs"][i % 5]}-workspace-${i + 1}`,
  fresh: (i * 37) % 900, aging: (i * 17) % 400, stale: (i * 7) % 300,
}));

const FRESHNESS_CHART: ComponentSpec = {
  id: "InsightsFreshnessChart", title: "InsightsFreshnessChart", width: 720,
  states: [
    { id: "default", label: "Default", node: <InsightsFreshnessChart freshness={FRESHNESS} /> },
    { id: "loading", label: "Loading", node: <InsightsFreshnessChart freshness={[]} loading /> },
    { id: "empty", label: "Empty (no sources)", node: <InsightsFreshnessChart freshness={[]} /> },
    { id: "single-tone", label: "Single-segment rows (colour-blind check)", node: <InsightsFreshnessChart freshness={[{ source: "github", fresh: 40, aging: 0, stale: 0 }, { source: "slack", fresh: 0, aging: 40, stale: 0 }, { source: "notion", fresh: 0, aging: 0, stale: 40 }, { source: "gdocs", fresh: 20, aging: 20, stale: 20 }]} /> },
    { id: "overflow-rows", label: "Overflow: long source names, many rows", node: <InsightsFreshnessChart freshness={[...FRESHNESS, { source: LONG, fresh: 3, aging: 900, stale: 1 }, { source: HUGE, fresh: 1, aging: 1, stale: 900000 }]} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <InsightsFreshnessChart freshness={FRESHNESS.slice(0, 3)} /> },
    { id: "stress", label: "Volume: 40 sources", node: <InsightsFreshnessChart freshness={STRESS_FRESHNESS} /> },
  ],
};

/* ── AuditFindingsChecklist ───────────────────────────────────────────── */

const FINDINGS: AuditFinding[] = [
  { id: 1, kind: "Localization", title: "onboarding.fr.md has no source translation link", detail: "French doc exists but isn't linked to its English source.", fixAction: "link_translation", status: "open" },
  { id: 3, kind: "Tags", title: "api-auth.md is untagged", detail: "No tags, so it won't surface in filtered search.", fixAction: "apply_tag", fixPayload: { tag: "reference" }, status: "open" },
  { id: 5, kind: "Authorship", title: "Unknown author 'jsmith' on 6 docs", detail: "Git author not mapped to a team member.", fixAction: "invite_member", status: "open" },
  { id: 6, kind: "Coverage", title: "webhooks.md referenced but not indexed", detail: "Linked from 4 docs; never ingested.", fixAction: "ingest", status: "open" },
  { id: 7, kind: "Hygiene", title: "README.md has a broken anchor", detail: "#setup no longer exists.", fixAction: "hygiene_task", status: "fixed" },
  { id: 8, kind: "Hygiene", title: "changelog.md trailing whitespace", detail: "Cosmetic; safe to auto-fix.", fixAction: "hygiene_task", status: "dismissed" },
];

const FINDINGS_OVERFLOW: AuditFinding[] = [
  { id: 1, kind: "Authorship", title: LONG, detail: `${LONG} ${HUGE}`, fixAction: "invite_member", status: "open" },
  { id: 2, kind: "Tags", title: HUGE, detail: HUGE, fixAction: "apply_tag", fixPayload: { tag: HUGE }, status: "open" },
  { id: 3, kind: "Coverage", title: LONG, detail: LONG, fixAction: "ingest", status: "fixed" },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_FINDINGS: AuditFinding[] = Array.from({ length: 200 }, (_, i) => ({
  ...FINDINGS[i % FINDINGS.length],
  id: i + 1,
  title: i % 21 === 0 ? HUGE : `${FINDINGS[i % FINDINGS.length].title} (${i + 1})`,
  detail: i % 9 === 0 ? LONG : FINDINGS[i % FINDINGS.length].detail,
}));

const AUDIT_CHECKLIST: ComponentSpec = {
  id: "AuditFindingsChecklist", title: "AuditFindingsChecklist", width: 960,
  states: [
    { id: "default", label: "Default", node: <AuditFindingsChecklist findings={FINDINGS} members={AUDIT_MEMBERS} /> },
    { id: "loading", label: "Loading", node: <AuditFindingsChecklist findings={[]} members={AUDIT_MEMBERS} loading /> },
    { id: "empty", label: "Empty (no audit yet)", node: <AuditFindingsChecklist findings={[]} members={AUDIT_MEMBERS} /> },
    { id: "all-handled", label: "All handled", node: <AuditFindingsChecklist findings={FINDINGS.map((f) => ({ ...f, status: "fixed" as const }))} members={AUDIT_MEMBERS} /> },
    { id: "many-members", label: "Many members in the mapping picker", node: <AuditFindingsChecklist findings={FINDINGS.filter((f) => f.fixAction === "invite_member")} members={Array.from({ length: 24 }, (_, i) => ({ id: i + 1, name: `Member ${i + 1} Lastname` }))} /> },
    { id: "overflow-text", label: "Overflow: long titles and details", node: <AuditFindingsChecklist findings={FINDINGS_OVERFLOW} members={AUDIT_MEMBERS} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <AuditFindingsChecklist findings={FINDINGS.slice(0, 3)} members={AUDIT_MEMBERS} /> },
    { id: "stress", label: "Volume: 200 findings", node: <AuditFindingsChecklist findings={STRESS_FINDINGS} members={AUDIT_MEMBERS} /> },
  ],
};

/* ── FactsVerificationAudit ───────────────────────────────────────────── */

const FACTS: Fact[] = [
  { id: 1, claim: "Free tier includes 3 connected sources.", source: "Pricing page", owner: "Aki K.", status: "Verified", verified: "2026-07-18" },
  { id: 2, claim: "SSO is available on the Team plan and above.", source: "Sales deck", owner: "Dana R.", status: "Verified", verified: "2026-07-02" },
  { id: 3, claim: "Data is encrypted at rest with AES-256.", source: "Security whitepaper", owner: "Priya S.", status: "Verified", verified: "2026-05-30" },
  { id: 4, claim: "The scheduler polls twice a minute.", source: "Flows docs", owner: "Aki K.", status: "Verified", verified: "2026-04-11" },
  { id: 5, claim: "Uploaded PDFs are OCR'd on ingest.", source: "Sources docs", owner: "Dana R.", status: "Verified", verified: "2026-02-20" },
  { id: 6, claim: "Beta regions include eu-west and us-east.", source: "Roadmap", owner: "Priya S.", status: "Draft", verified: null },
];

const FACTS_OVERFLOW: Fact[] = [
  { id: 1, claim: LONG, source: HUGE, owner: LONG, status: "Verified", verified: "2026-01-02" },
  { id: 2, claim: HUGE, source: LONG, owner: HUGE, status: "Verified", verified: "2026-07-18" },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_FACTS: Fact[] = Array.from({ length: 300 }, (_, i) => ({
  ...FACTS[i % FACTS.length],
  id: i + 1,
  claim: i % 17 === 0 ? HUGE : `Claim ${i + 1}: ${FACTS[i % FACTS.length].claim}`,
  owner: i % 11 === 0 ? "Aleksandra Konstantinopoulou-Whitfield" : FACTS[i % FACTS.length].owner,
}));

const FACTS_AUDIT: ComponentSpec = {
  id: "FactsVerificationAudit", title: "FactsVerificationAudit", width: 860,
  states: [
    { id: "default", label: "Default", node: <FactsVerificationAudit facts={FACTS} /> },
    { id: "closeable", label: "With close affordance", node: <FactsVerificationAudit facts={FACTS} onClose={() => {}} /> },
    { id: "loading", label: "Loading", node: <FactsVerificationAudit facts={FACTS_AUDIT_ROWS} loading /> },
    { id: "empty", label: "Empty (nothing verified)", node: <FactsVerificationAudit facts={FACTS.filter((f) => f.status !== "Verified")} /> },
    { id: "all-fresh", label: "All fresh (no stale candidates)", node: <FactsVerificationAudit facts={FACTS.slice(0, 2)} /> },
    { id: "overflow-text", label: "Overflow: long claims and owners", node: <FactsVerificationAudit facts={FACTS_OVERFLOW} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <FactsVerificationAudit facts={FACTS.slice(0, 3)} /> },
    { id: "stress", label: "Volume: 300 facts", node: <FactsVerificationAudit facts={STRESS_FACTS} /> },
  ],
};

/* ── LibraryGlossaryPanel ─────────────────────────────────────────────── */

const TERMS: Term[] = [
  { id: "t1", term: "Canonical", definition: "The current source of truth for a topic; conflicting docs defer to it.", owner: "Priya Nair", updated: "2026-07-14" },
  { id: "t2", term: "Decision chunk", definition: "A thread-sized slice of a Slack conversation capturing one decision.", owner: "Marcus Vale", updated: "2026-07-09" },
  { id: "t3", term: "Freshness", definition: "How recently a source was verified against reality.", owner: "Dana Osei", updated: "2026-07-02" },
];

const TERMS_OVERFLOW: Term[] = [
  { id: "t1", term: LONG, definition: `${LONG} ${LONG}`, owner: LONG, updated: "2026-07-14" },
  { id: "t2", term: HUGE, definition: HUGE, owner: HUGE, updated: "2026-07-09" },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_TERMS: Term[] = Array.from({ length: 400 }, (_, i) => ({
  ...TERMS[i % TERMS.length],
  id: `st${i}`,
  term: i % 23 === 0 ? HUGE : `${TERMS[i % TERMS.length].term} ${i + 1}`,
  definition: i % 13 === 0 ? LONG : TERMS[i % TERMS.length].definition,
}));

const GLOSSARY_PANEL: ComponentSpec = {
  id: "LibraryGlossaryPanel", title: "LibraryGlossaryPanel", width: 940,
  states: [
    { id: "default", label: "Default", node: <LibraryGlossaryPanel terms={TERMS} /> },
    { id: "loading", label: "Loading", node: <LibraryGlossaryPanel terms={LIBRARY_TERMS} loading /> },
    { id: "empty", label: "Empty (no terms)", node: <LibraryGlossaryPanel terms={[]} /> },
    { id: "overflow-rows", label: "Overflow: many terms", node: <LibraryGlossaryPanel terms={Array.from({ length: 12 }, (_, i) => ({ ...TERMS[i % 3], id: `t${i}` }))} /> },
    { id: "overflow-text", label: "Overflow: long terms and definitions", node: <LibraryGlossaryPanel terms={TERMS_OVERFLOW} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <LibraryGlossaryPanel terms={TERMS.slice(0, 2)} /> },
    { id: "stress", label: "Volume: 400 terms", node: <LibraryGlossaryPanel terms={STRESS_TERMS} /> },
  ],
};

/* ── LibraryGuidesPanel ───────────────────────────────────────────────── */

const GUIDES: Guide[] = [
  { id: "plain", name: "Plain language", tone: "ok", rules: 42, description: "Direct, concise, and accessible.", preview: ["Prefer one- or two-syllable words when they carry the meaning", "Keep sentences under 25 words", "Address the reader as “you”", "Use active voice unless the actor is unknown"] },
  { id: "microsoft", name: "Microsoft", tone: "info", rules: 38, description: "Warm, clear product writing with task-oriented language.", preview: ["Use contractions for a natural tone", "Use sentence case everywhere, including titles", "Bold UI labels exactly as they appear"] },
  { id: "ap", name: "AP style", tone: "blocked", rules: 31, description: "Newsroom conventions for capitalization, numerals, names, and dates.", preview: ["Spell out one through nine, numerals for 10+", "Use last names on second reference"] },
];

const GUIDES_OVERFLOW: Guide[] = [
  { id: "long", name: LONG, tone: "attention", rules: 3, description: `${LONG} ${LONG}`, preview: [LONG, HUGE, LONG] },
  { id: "huge", name: HUGE, tone: "info", rules: 2, description: HUGE, preview: [HUGE, HUGE] },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_GUIDES: Guide[] = Array.from({ length: 40 }, (_, i) => ({
  ...GUIDES[i % GUIDES.length],
  id: `sg${i}`,
  name: i % 9 === 0 ? HUGE : `${GUIDES[i % GUIDES.length].name} ${i + 1}`,
  rules: 100 + i * 7,
  preview: Array.from({ length: 12 }, (_, j) => (j % 5 === 0 ? HUGE : `Rule ${j + 1}: keep sentences under 25 words`)),
}));

const GUIDES_PANEL: ComponentSpec = {
  id: "LibraryGuidesPanel", title: "LibraryGuidesPanel", width: 1080,
  states: [
    { id: "default", label: "Default", node: <LibraryGuidesPanel guides={GUIDES} workspace={LIBRARY_WORKSPACE} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} /> },
    { id: "loading", label: "Loading", node: <LibraryGuidesPanel guides={[]} workspace={LIBRARY_WORKSPACE} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} loading /> },
    { id: "empty", label: "Empty (no packs)", node: <LibraryGuidesPanel guides={[]} workspace={LIBRARY_WORKSPACE} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} /> },
    { id: "other-default", label: "Non-first pack is the project default", node: <LibraryGuidesPanel guides={GUIDES} workspace={LIBRARY_WORKSPACE} layer={LIBRARY_VOICE} defaultPack="ap" /> },
    { id: "overflow-text", label: "Overflow: long pack names, rules, workspace", node: <LibraryGuidesPanel guides={GUIDES_OVERFLOW} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} workspace={LONG} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <LibraryGuidesPanel guides={GUIDES.slice(0, 2)} workspace={LIBRARY_WORKSPACE} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} /> },
    { id: "stress", label: "Volume: 40 packs, 12 preview rules each", node: <LibraryGuidesPanel guides={STRESS_GUIDES} workspace={LIBRARY_WORKSPACE} defaultPack={LIBRARY_DEFAULT_PACK} layer={LIBRARY_VOICE} /> },
  ],
};

/* ── LibraryRulesPanel ────────────────────────────────────────────────── */

const RULES_PANEL: ComponentSpec = {
  id: "LibraryRulesPanel", title: "LibraryRulesPanel", width: 1080,
  states: [
    { id: "default", label: "Default", node: <LibraryRulesPanel workspace={LIBRARY_WORKSPACE} docs={LIBRARY_CHECKER_DOCS} /> },
    { id: "loading", label: "Loading", node: <LibraryRulesPanel workspace={LIBRARY_WORKSPACE} docs={[]} loading /> },
    { id: "overflow-text", label: "Overflow: very long workspace name", node: <LibraryRulesPanel workspace={HUGE} docs={LIBRARY_CHECKER_DOCS} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <LibraryRulesPanel workspace={LIBRARY_WORKSPACE} docs={LIBRARY_CHECKER_DOCS} /> },
    { id: "stress", label: "Volume: full catalog, long workspace name", node: <LibraryRulesPanel workspace={LONG} docs={LIBRARY_CHECKER_DOCS} /> },
  ],
};

/* ── LibraryTagsPanel ─────────────────────────────────────────────────── */

const TAGS: TagDef[] = [
  { id: "canonical", name: "Canonical", tone: "ok", evidence: "Preferred evidence", weight: 1.6, usage: 142, behaviors: ["Ranks first", "Trusted for facts"], standard: true, description: "The current source of truth." },
  { id: "verified", name: "Verified", tone: "ok", evidence: "Trusted evidence", weight: 1.3, usage: 98, behaviors: ["Facts extracted are trusted"], standard: true, description: "Facts extracted from it are trusted." },
  { id: "needs-review", name: "Needs review", tone: "attention", evidence: "Flagged, not evidence", weight: 0.6, usage: 27, behaviors: ["Routed to a person"], standard: true, description: "Flagged for a person to make a judgment." },
  { id: "deprecated", name: "Deprecated", tone: "blocked", evidence: "Not evidence", weight: 0.2, usage: 8, behaviors: ["Superseded"], standard: true, description: "Superseded by a newer document." },
  { id: "runbook", name: "Runbook", tone: "info", evidence: "Normal evidence", weight: 1.1, usage: 34, behaviors: ["Ops workflows"], standard: false, description: "Operational runbooks and on-call docs." },
];

const TAGS_OVERFLOW: TagDef[] = [
  { id: "long", name: LONG, tone: "info", evidence: LONG, weight: 12.25, usage: 999999, behaviors: [LONG, HUGE, LONG, HUGE, LONG], standard: false, description: `${LONG} ${LONG}` },
  { id: "huge", name: HUGE, tone: "blocked", evidence: HUGE, weight: 0.05, usage: 1, behaviors: [HUGE], standard: true, description: HUGE },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_TAGS: TagDef[] = Array.from({ length: 120 }, (_, i) => ({
  ...TAGS[i % TAGS.length],
  id: `stag${i}`,
  name: i % 17 === 0 ? HUGE : `${TAGS[i % TAGS.length].name} ${i + 1}`,
  usage: (i + 1) * 137,
  behaviors: Array.from({ length: (i % 6) + 1 }, (_, j) => (j % 4 === 0 ? LONG : `Behaviour ${j + 1}`)),
}));

const TAGS_PANEL: ComponentSpec = {
  id: "LibraryTagsPanel", title: "LibraryTagsPanel", width: 1080,
  states: [
    { id: "default", label: "Default", node: <LibraryTagsPanel tags={TAGS} totalDocs={LIBRARY_TOTAL_DOCS} /> },
    { id: "loading", label: "Loading", node: <LibraryTagsPanel tags={[]} totalDocs={LIBRARY_TOTAL_DOCS} loading /> },
    { id: "empty", label: "Empty (no tags)", node: <LibraryTagsPanel tags={[]} totalDocs={LIBRARY_TOTAL_DOCS} /> },
    { id: "overflow-rows", label: "Overflow: many tags", node: <LibraryTagsPanel tags={Array.from({ length: 14 }, (_, i) => ({ ...TAGS[i % 5], id: `tag-${i}`, name: `${TAGS[i % 5].name} ${i}` }))} totalDocs={LIBRARY_TOTAL_DOCS} /> },
    { id: "overflow-text", label: "Overflow: long names, many behaviours", node: <LibraryTagsPanel tags={TAGS_OVERFLOW} totalDocs={LIBRARY_TOTAL_DOCS} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <LibraryTagsPanel tags={TAGS.slice(0, 3)} totalDocs={LIBRARY_TOTAL_DOCS} /> },
    { id: "stress", label: "Volume: 120 tags", node: <LibraryTagsPanel tags={STRESS_TAGS} totalDocs={LIBRARY_TOTAL_DOCS} /> },
  ],
};

/* ── LibraryTemplatesPanel ────────────────────────────────────────────── */

const TEMPLATES: Template[] = [
  { id: "runbook", name: "Runbook", category: "Operations", icon: "clipboard", standard: true, description: "Service overview, alarms, diagnosis, rollback, escalation.", sections: ["Service overview", "Alarms and thresholds", "Diagnosis steps", "Rollback procedure"] },
  { id: "adr", name: "Architecture decision", category: "Engineering", icon: "file-text", standard: true, description: "Context, decision, alternatives, and consequences.", sections: ["Context", "Decision", "Alternatives considered", "Consequences"] },
  { id: "custom", name: "Design doc", category: "Engineering", icon: "file-text", standard: false, description: "Custom scaffold.", sections: ["Overview", "Details", "Risks"] },
];

const TEMPLATES_OVERFLOW: Template[] = [
  { id: "long", name: LONG, category: "Engineering", icon: "file-text", standard: false, description: `${LONG} ${LONG}`, sections: [LONG, HUGE, LONG] },
  { id: "huge", name: HUGE, category: "Operations", icon: "clipboard", standard: true, description: HUGE, sections: [HUGE] },
];

/* Volume fixture: production-sized data for the "stress" state. */
const STRESS_TEMPLATES: Template[] = Array.from({ length: 120 }, (_, i) => ({
  ...TEMPLATES[i % TEMPLATES.length],
  id: `stpl${i}`,
  name: i % 19 === 0 ? HUGE : `${TEMPLATES[i % TEMPLATES.length].name} ${i + 1}`,
  sections: Array.from({ length: (i % 8) + 2 }, (_, j) => (j % 5 === 0 ? LONG : `Section ${j + 1}`)),
}));

const TEMPLATES_PANEL: ComponentSpec = {
  id: "LibraryTemplatesPanel", title: "LibraryTemplatesPanel", width: 1080,
  states: [
    { id: "default", label: "Default", node: <LibraryTemplatesPanel templates={TEMPLATES} /> },
    { id: "loading", label: "Loading", node: <LibraryTemplatesPanel templates={LIBRARY_TEMPLATES} loading /> },
    { id: "empty", label: "Empty (no templates)", node: <LibraryTemplatesPanel templates={[]} /> },
    { id: "overflow-rows", label: "Overflow: many templates", node: <LibraryTemplatesPanel templates={Array.from({ length: 12 }, (_, i) => ({ ...TEMPLATES[i % 3], id: `t-${i}`, name: `${TEMPLATES[i % 3].name} ${i}` }))} /> },
    { id: "overflow-text", label: "Overflow: long names, sections, descriptions", node: <LibraryTemplatesPanel templates={TEMPLATES_OVERFLOW} /> },
    { id: "narrow", label: "Narrow frame", width: NARROW, node: <LibraryTemplatesPanel templates={TEMPLATES.slice(0, 2)} /> },
    { id: "stress", label: "Volume: 120 templates", node: <LibraryTemplatesPanel templates={STRESS_TEMPLATES} /> },
  ],
};

export const FLOWS: ComponentSpec[] = [
  FLOWS_LIST, PIPELINE_EDITOR, RUN_PANEL, RUN_HISTORY,
  INSIGHTS_WIDGETS, FRESHNESS_CHART,
  AUDIT_CHECKLIST, FACTS_AUDIT,
  GLOSSARY_PANEL, GUIDES_PANEL, RULES_PANEL, TAGS_PANEL, TEMPLATES_PANEL,
];
