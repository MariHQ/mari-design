import { Plus, X } from "lucide-react";
import type { ComponentSpec } from "./types";
import {
  ChatDock, ChatMessage, ToolCall, Composer, TypingIndicator,
  Button, type ChatMessageData,
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
];
