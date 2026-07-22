import { Plus, X } from "lucide-react";
import type { ComponentSpec } from "./types";
import {
  ChatDock, ChatMessage, ToolCall, Composer, TypingIndicator,
  PipelineView, RunHistory, RunPanel, WorkflowScreen,
  Button, type ChatMessageData, type WorkflowRun, type WorkflowStep,
} from "../../index";

/* State matrix for the chatflow group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and mid-term amendments";
const BODY =
  "I searched every connected source, read the twelve documents that mention the trial length, and tagged the three that still quote the retired figure. Nothing was published.";
const HUGE =
  "Supercalifragilisticexpialidocious_configuration_parameter_value_that_never_wraps_00";

const dock = (node: React.ReactNode, h = 420) => <div style={{ height: h }} className="flex">{node}</div>;

const TRANSCRIPT: ChatMessageData[] = [
  { id: "1", role: "user", content: "Which docs still say trials are 14 days?" },
  {
    id: "2", role: "assistant",
    content: "Three documents still quote 14 days: the pricing sheet, the onboarding runbook, and one support macro.",
    tools: [
      { id: "t1", name: "search_docs", args: { query: "trial length 14 days", limit: 25 }, summary: "12 matches across 4 sources", ok: true },
      { id: "t2", name: "tag_documents", args: { tag: "stale", ids: ["d_881", "d_902", "d_915"] }, summary: "3 documents tagged Stale", ok: true },
    ],
  },
  { id: "3", role: "user", content: "Fix the pricing sheet." },
  { id: "4", role: "warning", content: "Editing published documents is off in this workspace. I can draft the change instead." },
];

const STREAMING: ChatMessageData[] = [
  ...TRANSCRIPT.slice(0, 1),
  {
    id: "s", role: "assistant", content: "Searching the connected sources", streaming: true,
    tools: [{ id: "t1", name: "search_docs", args: { query: "trial length" }, ok: null }],
  },
];

const OVERFLOW_TRANSCRIPT: ChatMessageData[] = [
  { id: "1", role: "user", content: `${LONG} ${HUGE}` },
  {
    id: "2", role: "assistant", content: `${BODY} ${HUGE}`,
    tools: [
      { id: "t1", name: "search_documents_across_every_connected_source", args: { query: LONG, filter: HUGE }, summary: `${BODY} ${HUGE}`, ok: true },
      { id: "t2", name: "fail_case", args: { id: HUGE }, summary: "The source rejected the request: token expired.", ok: false },
    ],
  },
  { id: "3", role: "warning", content: `${BODY} ${HUGE}` },
];

const STEPS: WorkflowStep[] = [
  { id: "s1", section: "when", label: "A document changes", summary: "Fires whenever a synced source reports an edit." },
  { id: "s2", section: "do", label: "Extract claims", summary: "Pulls factual statements out of the changed document.", llm: true },
  { id: "s3", section: "check", label: "Compare with canon", summary: "Checks each claim against the canonical set." },
  { id: "s4", section: "then", label: "Open review tasks", summary: "One task per contradicting document.", branch: true, branchLabel: "if contradictions > 0" },
];
const STEPS_LONG: WorkflowStep[] = [
  { id: "s1", section: "when", label: LONG, summary: `${BODY} ${HUGE}` },
  { id: "s2", section: "do", label: HUGE, summary: HUGE, llm: true },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `x${i}`, section: (["do", "check", "then"] as const)[i % 3],
    label: `Stage number ${i + 1}`, summary: "Runs as configured.",
  })),
];

const RUNS: WorkflowRun[] = [
  {
    id: "r1", number: 412, workflowName: "Contradiction sweep", status: "waiting",
    started: "2026-07-21T09:14:00Z", duration: "1m 12s", triggeredBy: "Drive edit: Pricing sheet", dry: true,
    headline: "Waiting on approval for 3 review tasks",
    rows: [
      { step: "Fetch changed docs", status: "passed", detail: "4 documents fetched", duration: "6s" },
      { step: "Extract claims", status: "passed", detail: "18 claims extracted", duration: "41s" },
      { step: "Compare with canon", status: "passed", detail: "3 contradictions found", duration: "25s" },
      { step: "Approve review tasks", status: "waiting", detail: "3 tasks pending approval" },
      { step: "Notify owners", status: "pending" },
    ],
    stats: [{ label: "Claims", value: 18 }, { label: "Contradictions", value: 3, bad: true }, { label: "Tasks", value: 3 }],
  },
  {
    id: "r2", number: 411, workflowName: "Contradiction sweep", status: "passed",
    started: "2026-07-20T22:02:00Z", duration: "58s", headline: "No contradictions found",
    rows: [{ step: "Fetch changed docs", status: "passed", detail: "2 documents", duration: "4s" }],
    stats: [{ label: "Claims", value: 9 }, { label: "Contradictions", value: 0 }],
  },
  {
    id: "r3", number: 410, workflowName: "Freshness audit", status: "failed",
    started: "2026-07-20T06:30:00Z", duration: "12s", triggeredBy: "Schedule: daily 06:30",
    headline: "Confluence token expired",
  },
  { id: "r4", number: 409, workflowName: "Freshness audit", status: "running", started: "2026-07-19T06:30:00Z" },
  { id: "r5", number: 408, workflowName: "Glossary sync", status: "skipped", started: "2026-07-18T06:30:00Z", duration: "0s", dry: true },
];
const RUNS_LONG: WorkflowRun[] = Array.from({ length: 14 }, (_, i) => ({
  id: `l${i}`, number: 500 - i, workflowName: i % 2 ? LONG : HUGE,
  status: (["passed", "failed", "running", "waiting", "skipped", "pending"] as const)[i % 6],
  started: "2026-07-21T09:14:00Z", duration: i % 3 ? "1m 12s" : undefined,
  triggeredBy: i % 2 ? HUGE : undefined, dry: i % 3 === 0,
  headline: i % 2 ? `${LONG} (${i})` : HUGE,
}));

export const CHATFLOW: ComponentSpec[] = [
  {
    id: "ChatDock", title: "ChatDock", width: 460,
    states: [
      { id: "default", label: "Transcript (indent plumb line)", node: dock(
        <ChatDock className="flex-1" messages={TRANSCRIPT} onSend={() => {}} hint="Shift + Enter for a new line." />) },
      { id: "empty", label: "Empty with suggestions", node: dock(
        <ChatDock className="flex-1" messages={[]} onSend={() => {}}
          suggestions={["What changed this week?", "Find stale docs", "Sync Slack"]} />) },
      { id: "streaming", label: "Streaming (stop button)", node: dock(
        <ChatDock className="flex-1" messages={STREAMING} isStreaming onSend={() => {}} onStop={() => {}} />) },
      { id: "working", label: "Working, no tokens yet", node: dock(
        <ChatDock className="flex-1" messages={TRANSCRIPT.slice(0, 1)} isStreaming onSend={() => {}} onStop={() => {}} />) },
      { id: "header-actions", label: "Header actions and long title", node: dock(
        <ChatDock className="flex-1" title={LONG} messages={TRANSCRIPT.slice(0, 2)} onSend={() => {}}
          headerActions={<><Button icon compact aria-label="New conversation"><Plus size={14} /></Button><Button icon compact aria-label="Close"><X size={14} /></Button></>} />) },
      { id: "overflow", label: "Overflow: long content, unbreakable string", node: dock(
        <ChatDock className="flex-1" messages={OVERFLOW_TRANSCRIPT} onSend={() => {}} hint={HUGE} />, 520) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: dock(
        <ChatDock className="flex-1" messages={OVERFLOW_TRANSCRIPT} onSend={() => {}} />, 520) },
    ],
  },
  {
    id: "ChatMessage", title: "ChatMessage", width: 460,
    states: [
      { id: "roles", label: "User, assistant, warning", node: (
        <div className="flex flex-col gap-2">
          {TRANSCRIPT.map((m) => <ChatMessage key={m.id} message={m} />)}
        </div>) },
      { id: "streaming", label: "Streaming caret", node: (
        <ChatMessage message={{ id: "s", role: "assistant", content: "Reading the pricing sheet", streaming: true }} />) },
      { id: "tools-only", label: "Tool trace, no reply yet", node: (
        <ChatMessage message={{ id: "t", role: "assistant", content: "", tools: [
          { name: "search_docs", args: { query: "trial length" }, ok: null },
        ] }} />) },
      { id: "multiline", label: "Multi-line user turn", node: (
        <ChatMessage message={{ id: "u", role: "user", content: "Do two things:\n1. Find stale docs\n2. Tag them" }} />) },
      { id: "overflow", label: "Overflow: long content", node: (
        <div className="flex flex-col gap-2">
          {OVERFLOW_TRANSCRIPT.map((m) => <ChatMessage key={m.id} message={m} />)}
        </div>) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <div className="flex flex-col gap-2">
          {OVERFLOW_TRANSCRIPT.map((m) => <ChatMessage key={m.id} message={m} />)}
        </div>) },
    ],
  },
  {
    id: "ToolCall", title: "ToolCall", width: 460,
    states: [
      { id: "states", label: "Running, done, failed", node: (
        <div className="flex flex-col gap-1">
          <ToolCall tool={{ name: "search_docs", args: { query: "trial length" }, ok: null }} />
          <ToolCall tool={{ name: "tag_documents", args: { tag: "stale", count: 3 }, summary: "3 documents tagged Stale", ok: true }} />
          <ToolCall tool={{ name: "publish_document", args: { id: "d_881" }, summary: "Refused: publishing is off in this workspace.", ok: false }} />
        </div>) },
      { id: "no-args", label: "No args, no summary", node: <ToolCall tool={{ name: "list_sources", ok: true }} /> },
      { id: "overflow", label: "Overflow: long name, args, summary", node: (
        <ToolCall tool={{ name: "search_documents_across_every_connected_source_and_rank", args: { query: LONG, cursor: HUGE }, summary: `${BODY} ${HUGE}`, ok: true }} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <div className="flex flex-col gap-1">
          <ToolCall tool={{ name: HUGE, args: { query: LONG }, summary: BODY, ok: false }} />
          <ToolCall tool={{ name: "search_docs", args: { query: LONG }, ok: null }} />
        </div>) },
    ],
  },
  {
    id: "Composer", title: "Composer", width: 460,
    states: [
      { id: "default", label: "Resting", node: <Composer onSend={() => {}} /> },
      { id: "streaming", label: "Streaming (Stop)", node: <Composer onSend={() => {}} isStreaming onStop={() => {}} /> },
      { id: "disabled", label: "Disabled", node: <Composer onSend={() => {}} disabled /> },
      { id: "overflow", label: "Overflow: long placeholder", node: <Composer onSend={() => {}} placeholder={`${LONG} ${HUGE}`} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <Composer onSend={() => {}} placeholder={LONG} /> },
    ],
  },
  {
    id: "TypingIndicator", title: "TypingIndicator", width: 460,
    states: [
      { id: "default", label: "Default", node: <TypingIndicator /> },
      { id: "custom", label: "Custom label", node: <TypingIndicator label="reading 12 documents…" /> },
      { id: "narrow", label: "Overflow: long label, narrow frame", width: 320, node: <TypingIndicator label={LONG} /> },
    ],
  },
  {
    id: "PipelineView", title: "PipelineView", width: 620,
    states: [
      { id: "default", label: "Default", node: (
        <PipelineView steps={STEPS} name="Contradiction sweep" description="Runs whenever a synced document changes." onSelect={() => {}} />) },
      { id: "selected", label: "Selected stage", node: (
        <PipelineView steps={STEPS} selectedId="s2" name="Contradiction sweep" onSelect={() => {}} />) },
      { id: "loading", label: "Loading", node: <PipelineView steps={[]} loading /> },
      { id: "empty", label: "Empty", node: <PipelineView steps={[]} name="New flow" description="No stages yet." /> },
      { id: "overflow", label: "Overflow: long labels, many stages", node: (
        <PipelineView steps={STEPS_LONG} name={LONG} description={`${BODY} ${HUGE}`} onSelect={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <PipelineView steps={STEPS_LONG.slice(0, 4)} name={LONG} onSelect={() => {}} />) },
    ],
  },
  {
    id: "RunHistory", title: "RunHistory", width: 900,
    states: [
      { id: "default", label: "Default (sortable columns, Dry chip)", node: <RunHistory runs={RUNS} onSelect={() => {}} /> },
      { id: "selected", label: "Selected row", node: <RunHistory runs={RUNS} selectedId="r1" onSelect={() => {}} /> },
      { id: "loading", label: "Loading", node: <RunHistory runs={[]} loading /> },
      { id: "empty", label: "Empty", node: <RunHistory runs={[]} /> },
      { id: "static", label: "No row action", node: <RunHistory runs={RUNS.slice(0, 3)} title="Recent runs" /> },
      { id: "overflow", label: "Overflow: 14 rows, long cells", node: <RunHistory runs={RUNS_LONG} onSelect={() => {}} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <RunHistory runs={RUNS_LONG.slice(0, 5)} onSelect={() => {}} /> },
    ],
  },
  {
    id: "RunPanel", title: "RunPanel", width: 460,
    states: [
      { id: "waiting", label: "Waiting (approve bottom left, Dry left of status)", node: (
        <RunPanel run={RUNS[0]} onClose={() => {}} onApprove={() => {}} onRerun={() => {}} />) },
      { id: "passed", label: "Passed", node: <RunPanel run={RUNS[1]} onClose={() => {}} onRerun={() => {}} /> },
      { id: "failed-nolog", label: "Failed, no step log", node: <RunPanel run={RUNS[2]} onRerun={() => {}} /> },
      { id: "busy", label: "Busy with note", node: (
        <RunPanel run={RUNS[0]} busy note="Approved, resuming." onApprove={() => {}} onRerun={() => {}} />) },
      { id: "loading", label: "Loading", node: <RunPanel run={null} loading /> },
      { id: "empty", label: "No run selected", node: <RunPanel run={null} /> },
      { id: "overflow", label: "Overflow: long names and details", node: (
        <RunPanel run={{ ...RUNS[0], workflowName: LONG, triggeredBy: HUGE,
          rows: [{ step: LONG, status: "waiting", detail: `${BODY} ${HUGE}`, duration: "1m 12s" },
                 { step: HUGE, status: "failed", detail: HUGE }],
          stats: [{ label: "Contradictions found this run", value: 128, bad: true }, { label: "Claims", value: 9410 }, { label: "Tasks", value: 3 }, { label: "Skipped", value: 12 }] }}
          onClose={() => {}} onApprove={() => {}} onRerun={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <RunPanel run={RUNS[0]} onClose={() => {}} onApprove={() => {}} onRerun={() => {}} />) },
    ],
  },
  {
    id: "WorkflowScreen", title: "WorkflowScreen", width: 1200,
    states: [
      { id: "default", label: "Default", node: (
        <WorkflowScreen name="Contradiction sweep" description="Runs whenever a synced document changes."
          steps={STEPS} runs={RUNS} onApprove={() => {}} onRerun={() => {}} />) },
      { id: "empty", label: "No stages, no runs", node: (
        <WorkflowScreen name="New flow" description="Nothing configured yet." steps={[]} runs={[]} />) },
      { id: "overflow", label: "Overflow: long labels", node: (
        <WorkflowScreen name={LONG} description={`${BODY} ${HUGE}`} steps={STEPS_LONG} runs={RUNS_LONG}
          onApprove={() => {}} onRerun={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <WorkflowScreen name={LONG} steps={STEPS.slice(0, 2)} runs={RUNS.slice(0, 2)} onRerun={() => {}} />) },
    ],
  },
];
