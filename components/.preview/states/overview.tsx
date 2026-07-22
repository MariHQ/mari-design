import type { ComponentSpec } from "./types";
import {
  OverviewStatTiles, OverviewDigestCard, OverviewTodayReview, OverviewSourcePulse,
  OverviewLiveActivity, OverviewWorkflowStrip, OverviewRecentDocs,
} from "../../features";
import type { ReviewTask } from "../../features/OverviewTodayReview";
import type { PulseTileData } from "../../features/OverviewSourcePulse";
import type { FeedItem } from "../../features/OverviewLiveActivity";
import type { RecentDoc } from "../../features/OverviewRecentDocs";
import type { WfFlow } from "../../features/OverviewWorkflowStrip";
import type { DigestTopic } from "../../data-display/DigestCard";
import { SourceMark } from "../../icons/marks";

/* State matrix for the overview group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and mid-term expansion credits";
/* 90 chars, no spaces: the classic layout breaker. */
const HUGE = "Supercalifragilistic_configuration_parameter_value_that_never_wraps_because_it_has_no_sp";
const LONG_SUMMARY =
  "Mari re-read every page touched this week and found that the pricing FAQ, the billing runbook, and the partner agreement template all describe proration differently, which means support, sales, and finance have each been quoting a different number to customers since the Growth tier rename shipped.";

const mark = (p: string) => <SourceMark provider={p} size={13} />;

/* ── Digest fixtures ─────────────────────────────────────────────────── */
const LONG_TOPICS: DigestTopic[] = [
  {
    title: LONG,
    summary: LONG_SUMMARY,
    where: [
      { source: "notion", label: "Pricing FAQ, Growth tier proration and credits", icon: mark("notion") },
      { source: "gdocs", label: HUGE, icon: mark("gdocs") },
      { source: "github", label: "auth/README", icon: mark("github") },
      { source: "slack", label: "#eng-identity", icon: mark("slack") },
      { source: "linear", label: "Billing platform backlog", icon: mark("linear") },
    ],
    impact: [
      { name: "Support", tone: "info" }, { name: "Sales", tone: "ok" },
      { name: "Finance operations and revenue recognition", tone: "attention" },
      { name: "SRE", tone: "blocked" }, { name: "On-call", tone: "attention" },
      { name: HUGE, tone: "neutral" },
    ],
  },
  {
    title: HUGE,
    summary: "One source, one line.",
    where: [{ source: "granola", label: "Postmortem sync", icon: mark("granola") }],
    impact: [],
  },
];

/* ── Review fixtures ─────────────────────────────────────────────────── */
const MANY_TASKS: ReviewTask[] = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1,
  text: `Verify the proration rule in the billing runbook, pass ${i + 1}`,
  who: ["DR", "MG", "PK", "SL"][i % 4],
  pill: ["factcheck", "approval", "stale", "needs-review", "canonical"][i % 5],
  pillText: ["Fact check", "Approval", "Stale", "Needs review", "Canonical"][i % 5],
  done: i % 3 === 0,
}));

const LONG_TASKS: ReviewTask[] = [
  { id: 1, text: LONG, who: "DR", pill: "factcheck", pillText: "Fact check" },
  { id: 2, text: HUGE, who: "MG", pill: "needs-review", pillText: "Needs review" },
  { id: 3, text: "Approve the SSO onboarding guide for publish", who: "PK", pill: "approval", pillText: "Approval", done: true },
];

/* ── Pulse fixtures ──────────────────────────────────────────────────── */
const MANY_TILES: PulseTileData[] = [
  { key: "github", name: "GitHub", stat: "128", unit: "commits", status: "active", bars: [4, 7, 5, 9, 6, 11, 8] },
  { key: "slack", name: "Slack", stat: "412", unit: "messages", status: "active", bars: [30, 22, 41, 18, 35, 27, 44] },
  { key: "notion", name: "Notion", stat: "19", unit: "edits", status: "moderate", bars: [3, 1, 4, 2, 0, 5, 4] },
  { key: "gdocs", name: "Google Drive", stat: "34", unit: "files", status: "active", bars: [6, 4, 8, 5, 7, 9, 6] },
  { key: "granola", name: "Granola", stat: "7", unit: "meetings", status: "moderate", bars: [1, 2, 0, 1, 3, 1, 2] },
  { key: "linear", name: "Linear", stat: "56", unit: "issues", status: "active", bars: [8, 5, 11, 7, 9, 6, 12] },
  { key: "jira", name: "Jira", stat: "203", unit: "issues", status: "active", bars: [12, 9, 15, 11, 14, 10, 18] },
  { key: "confluence", name: "Confluence", stat: "88", unit: "pages", status: "moderate", bars: [2, 6, 3, 7, 4, 5, 6] },
  { key: "zendesk", name: "Zendesk", stat: "1,204", unit: "tickets", status: "active", bars: [40, 55, 38, 61, 47, 52, 66] },
  { key: "salesforce", name: "Salesforce", stat: "77", unit: "records", status: "moderate", bars: [3, 4, 2, 6, 5, 3, 7] },
];

const LONG_TILES: PulseTileData[] = [
  { key: "gdocs", name: "Google Drive shared company handbook archive", stat: "1,284,905", unit: "files touched this week", status: "active", bars: [6, 4, 8, 5, 7, 9, 6] },
  { key: "notion", name: HUGE, stat: "19", unit: "edits", status: "moderate", bars: [3, 1, 4, 2, 0, 5, 4] },
];

/* ── Activity fixtures ───────────────────────────────────────────────── */
const LONG_FEED: FeedItem[] = [
  { id: 1, kind: "run", actor: "Docs guardrail nightly sweep over every synced space", text: "completed a run over", target: LONG, secondsAgo: 42 },
  { id: 2, kind: "edit", actor: "Aleksandra Konstantinopoulou-Whitfield", text: "refined", target: HUGE, secondsAgo: 190 },
  { id: 3, kind: "fact", actor: "Mari", text: "verified a fact in", target: "Proration rule", secondsAgo: 380 },
];
const MANY_FEED: FeedItem[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  kind: ["run", "edit", "fact", "deploy", "sync", "link", "task"][i % 7],
  actor: ["Docs guardrail", "Dana R.", "Mari", "Stale sweeper", "Notion", "Priya K.", "Sam L."][i % 7],
  text: "touched",
  target: `Document ${i + 1}`,
  secondsAgo: 60 * (i + 1),
}));

/* ── Workflow fixtures ───────────────────────────────────────────────── */
const LONG_FLOW: WfFlow = {
  name: "Docs guardrail, nightly contradiction sweep across every connected source",
  status: "active",
  nodes: [
    { kind: "trigger", label: "When any document in a tracked space changes" },
    { kind: "fetch_docs", label: HUGE },
    { kind: "refine", label: "Tighten" },
    { kind: "fact_check", label: "Fact check every claim", state: "supported" },
    { kind: "condition", label: "No contradictions", state: "supported" },
    { kind: "approval", label: "Await a human approver", state: "queued" },
    { kind: "notify", label: "Post to Slack", state: "succeeded" },
    { kind: "deploy_site", label: "Deploy the public help site", state: "failed" },
  ],
};

/* ── Recent docs fixtures ────────────────────────────────────────────── */
const MANY_DOCS: RecentDoc[] = Array.from({ length: 12 }, (_, i) => ({
  id: 200 + i,
  source: ["notion", "github", "granola", "gdocs", "linear", "slack"][i % 6],
  title: `Runbook section ${i + 1}: proration, credits, and mid-term expansion`,
  date: `2026-07-${String(20 - i).padStart(2, "0")}`,
}));
const LONG_DOCS: RecentDoc[] = [
  { id: 301, source: "notion", title: LONG, date: "2026-07-20" },
  { id: 302, source: "gdocs", title: HUGE, date: "2026-07-19" },
  { id: 303, source: "unknown-provider", title: "A doc from a source Mari has no mark for", date: "2026-07-18" },
];

export const OVERVIEW: ComponentSpec[] = [
  {
    id: "OverviewStatTiles", title: "Overview / Headline stat tiles", width: 900,
    states: [
      { id: "default", label: "Default", node: <OverviewStatTiles /> },
      { id: "zeroes", label: "All zero (idle workspace)", node: (
        <OverviewStatTiles stats={{ changes: 0, factsReview: 0, flowsRunning: 0 }} />) },
      { id: "loading", label: "Loading", node: <OverviewStatTiles loading /> },
      { id: "offline", label: "Offline (no API)", node: <OverviewStatTiles offline /> },
      { id: "noswatch", label: "Accent line off", node: <OverviewStatTiles swatch={false} /> },
      { id: "bignumbers", label: "Overflow: huge numbers", node: (
        <OverviewStatTiles stats={{ changes: 1284905, factsReview: 998877, flowsRunning: 1234567 }} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: <OverviewStatTiles /> },
    ],
  },
  {
    id: "OverviewDigestCard", title: "Overview / This week's digest", width: 680,
    states: [
      { id: "default", label: "Default", node: <OverviewDigestCard /> },
      { id: "loading", label: "Loading", node: <OverviewDigestCard loading /> },
      { id: "empty", label: "Empty (no topics)", node: <OverviewDigestCard topics={[]} /> },
      { id: "error", label: "Error / API offline", node: <OverviewDigestCard error /> },
      { id: "single", label: "One topic, one source (singular label)", node: (
        <OverviewDigestCard topics={[{
          title: "Incident retro synthesized into a runbook update",
          summary: "The Jul 14, 2026 latency incident's action items landed as a new escalation ladder.",
          where: [{ source: "granola", label: "Postmortem sync", icon: mark("granola") }],
          impact: [{ name: "SRE", tone: "blocked" }],
        }]} />) },
      { id: "overflow", label: "Overflow: long title, summary, unbreakable chip, many chips", node: (
        <OverviewDigestCard topics={LONG_TOPICS} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewDigestCard topics={LONG_TOPICS} />) },
    ],
  },
  {
    id: "OverviewTodayReview", title: "Overview / Today's review", width: 680,
    states: [
      { id: "default", label: "Default (collapsed)", node: <OverviewTodayReview /> },
      { id: "expanded", label: "Expanded (view all)", node: <OverviewTodayReview defaultExpanded /> },
      { id: "loading", label: "Loading", node: <OverviewTodayReview loading /> },
      { id: "empty", label: "Empty (nothing to review)", node: <OverviewTodayReview tasks={[]} /> },
      { id: "offline", label: "Offline (no API)", node: <OverviewTodayReview offline /> },
      { id: "alldone", label: "All done (clear enabled)", node: (
        <OverviewTodayReview tasks={MANY_TASKS.slice(0, 3).map((t) => ({ ...t, done: true }))} />) },
      { id: "manyrows", label: "Overflow: 14 rows, expanded", node: (
        <OverviewTodayReview tasks={MANY_TASKS} defaultExpanded />) },
      { id: "longtext", label: "Overflow: long + unbreakable task text", node: (
        <OverviewTodayReview tasks={LONG_TASKS} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewTodayReview tasks={LONG_TASKS} />) },
    ],
  },
  {
    id: "OverviewSourcePulse", title: "Overview / Source pulse", width: 680,
    states: [
      { id: "default", label: "Default (collapsed)", node: <OverviewSourcePulse /> },
      { id: "expanded", label: "Expanded (all sources)", node: <OverviewSourcePulse defaultExpanded /> },
      { id: "loading", label: "Loading", node: <OverviewSourcePulse loading /> },
      { id: "empty", label: "Empty (no sources connected)", node: <OverviewSourcePulse tiles={[]} /> },
      { id: "offline", label: "Offline (no API)", node: <OverviewSourcePulse offline /> },
      { id: "manytiles", label: "Overflow: 10 sources, expanded", node: (
        <OverviewSourcePulse tiles={MANY_TILES} defaultExpanded />) },
      { id: "longnames", label: "Overflow: long + unbreakable source names", node: (
        <OverviewSourcePulse tiles={LONG_TILES} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewSourcePulse tiles={LONG_TILES} />) },
    ],
  },
  {
    id: "OverviewLiveActivity", title: "Overview / Live activity", width: 680,
    states: [
      { id: "default", label: "Default", node: <OverviewLiveActivity pollMs={0} /> },
      { id: "loading", label: "Loading", node: <OverviewLiveActivity loading pollMs={0} /> },
      { id: "empty", label: "Empty (quiet feed, paused chip)", node: (
        <OverviewLiveActivity items={[]} pollMs={0} />) },
      { id: "offline", label: "Offline (no API)", node: <OverviewLiveActivity offline pollMs={0} /> },
      { id: "manyrows", label: "Overflow: 16 items (caps at 8)", node: (
        <OverviewLiveActivity items={MANY_FEED} pollMs={0} />) },
      { id: "longtext", label: "Overflow: long actor + unbreakable target", node: (
        <OverviewLiveActivity items={LONG_FEED} pollMs={0} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewLiveActivity items={LONG_FEED} pollMs={0} />) },
    ],
  },
  {
    id: "OverviewWorkflowStrip", title: "Overview / Workflow strip", width: 680,
    states: [
      { id: "default", label: "Default", node: <OverviewWorkflowStrip /> },
      { id: "configuring", label: "Configure panel open", node: <OverviewWorkflowStrip defaultConfiguring /> },
      { id: "paused", label: "Paused flow, failed last run", node: (
        <OverviewWorkflowStrip
          flow={{ name: "Nightly stale sweep", status: "paused", nodes: [
            { kind: "trigger", label: "Every night" },
            { kind: "tag", label: "Tag stale" },
            { kind: "condition", label: "Anything stale?", state: "contradiction" },
            { kind: "create_task", label: "Open a task", state: "failed" },
          ] }}
          run={{ started: "2026-07-19T02:14:00", outcome: "Failed" }} />) },
      { id: "unknownoutcome", label: "Unmapped run outcome (free text)", node: (
        <OverviewWorkflowStrip run={{ started: "2026-07-20T14:57:00", outcome: "Partially applied with warnings" }} />) },
      { id: "neverrun", label: "Never run", node: <OverviewWorkflowStrip run={null} /> },
      { id: "runsloading", label: "Runs still loading", node: <OverviewWorkflowStrip run={null} runsLoading /> },
      { id: "loading", label: "Loading", node: <OverviewWorkflowStrip loading /> },
      { id: "empty", label: "Empty (no flows)", node: <OverviewWorkflowStrip flow={null} /> },
      { id: "offline", label: "Offline (no API)", node: <OverviewWorkflowStrip offline /> },
      { id: "manysteps", label: "Overflow: 8 steps, long + unbreakable labels", node: (
        <OverviewWorkflowStrip flow={LONG_FLOW} defaultConfiguring />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewWorkflowStrip flow={LONG_FLOW} />) },
    ],
  },
  {
    id: "OverviewRecentDocs", title: "Overview / Recent docs", width: 680,
    states: [
      { id: "default", label: "Default (collapsed)", node: <OverviewRecentDocs /> },
      { id: "expanded", label: "Expanded (browse all)", node: <OverviewRecentDocs defaultExpanded /> },
      { id: "loading", label: "Loading", node: <OverviewRecentDocs loading /> },
      { id: "empty", label: "Empty (no docs)", node: <OverviewRecentDocs docs={[]} /> },
      { id: "offline", label: "Offline (no API)", node: <OverviewRecentDocs offline /> },
      { id: "manyrows", label: "Overflow: 12 rows, expanded", node: (
        <OverviewRecentDocs docs={MANY_DOCS} defaultExpanded />) },
      { id: "longtitles", label: "Overflow: long + unbreakable titles, unknown source", node: (
        <OverviewRecentDocs docs={LONG_DOCS} />) },
      { id: "narrow", label: "Overflow: narrow 320 frame", width: 320, node: (
        <OverviewRecentDocs docs={LONG_DOCS} />) },
    ],
  },
];
