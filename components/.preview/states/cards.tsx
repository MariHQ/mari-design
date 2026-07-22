import { FileText, Folder, GitBranch, MessageSquare } from "lucide-react";
import type { ComponentSpec } from "./types";
import {
  DecisionCard, ImpactPanel, TokenReveal, TagChip, TAG_OPTIONS, DigestCard,
  ConnectorCard, Timeline, ActivityFeed, PropertyList, Accordion, TreeView,
  Button, Chip, type ImpactDoc, type DigestTopic, type TreeNode,
} from "../../index";

/* State matrix for the cards group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and mid-term amendments";
const BODY =
  "Mari read every dependent document and found the ones that assert the old figure. Each row names the document, where it came from, and why it needs attention.";
const HUGE =
  "Supercalifragilisticexpialidocious_configuration_parameter_value_that_never_wraps_00";

const IMPACT_DOCS: ImpactDoc[] = [
  { title: "Pricing sheet", source: "Drive", severity: "update-required", reason: "Quotes the retired 14 day trial length." },
  { title: "Onboarding runbook", source: "Confluence", severity: "review", reason: "Mentions trial length in the welcome email step." },
  { title: "Support macro: trials", source: "Zendesk", severity: "minor", reason: "Uses the generic phrase, no figure to change." },
];
const IMPACT_LONG: ImpactDoc[] = [
  { title: LONG, source: "Confluence", severity: "update-required", reason: BODY },
  { title: HUGE, source: "Drive", severity: "review", reason: HUGE },
  ...Array.from({ length: 8 }, (_, i) => ({
    title: `Regional addendum ${i + 1}`,
    source: "Drive",
    severity: (["update-required", "review", "minor"] as const)[i % 3],
    reason: "Restates the trial length in the fine print.",
  })),
];

const TOPICS: DigestTopic[] = [
  {
    title: "Trial length changed to 21 days",
    summary: "Three documents still quote 14 days. Pricing was updated Monday, the rest have not caught up.",
    where: [{ source: "slack", label: "Slack" }, { source: "drive", label: "Drive" }],
    impact: [{ name: "Sales", tone: "attention" }, { name: "Support", tone: "info" }],
  },
  {
    title: "New region: eu-central-1",
    summary: "The residency page and two runbooks need the new region added to their tables.",
    where: [{ source: "github", label: "GitHub" }],
    impact: [{ name: "Infra", tone: "ok" }],
  },
];
const TOPICS_LONG: DigestTopic[] = [
  {
    title: LONG,
    summary: `${BODY} ${HUGE}`,
    where: Array.from({ length: 7 }, (_, i) => ({ source: `s${i}`, label: `Source system ${i + 1}` })),
    impact: Array.from({ length: 8 }, (_, i) => ({ name: `Team ${i + 1}`, tone: "attention" })),
  },
];

const TREE: TreeNode[] = [
  {
    id: "root", label: "Knowledge base",
    children: [
      { id: "p", label: "Pricing", children: [{ id: "p1", label: "Pricing sheet" }, { id: "p2", label: "Discount policy" }] },
      { id: "o", label: "Onboarding", children: [{ id: "o1", label: "Welcome runbook" }] },
    ],
  },
];
const TREE_LONG: TreeNode[] = [
  {
    id: "root", label: LONG,
    children: [
      { id: "a", label: HUGE, children: [{ id: "a1", label: LONG }] },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, label: `Nested document number ${i + 1}` })),
    ],
  },
];

export const CARDS: ComponentSpec[] = [
  {
    id: "DecisionCard", title: "DecisionCard", width: 640,
    states: [
      { id: "proposed", label: "Proposed (ratify action)", node: (
        <DecisionCard
          status="proposed"
          statement="Trials run for 21 days, not 14."
          context="Raised in #pricing after the Q3 conversion review."
          sourceLabel="Slack"
          owners={["Ana Ruiz", "Dev Park"]}
          decidedOn="2026-07-14"
          onRatify={() => {}}
          onIgnore={() => {}}
        />) },
      { id: "ratified", label: "Ratified (check marker)", node: (
        <DecisionCard
          status="ratified"
          fresh
          statement="Enterprise renewals are quoted in the customer's local currency."
          context="Finance signed off after the FX exposure review."
          sourceLabel="Confluence"
          owners={["Mia Chen"]}
          decidedOn="2026-06-02"
          onIgnore={() => {}}
        />) },
      { id: "ignored", label: "Ignored (superseded spelling)", node: (
        <DecisionCard
          status="superseded"
          statement="Trials run for 30 days."
          supersededByStatement="Trials run for 21 days, not 14."
          sourceLabel="Slack"
          owners={["Ana Ruiz"]}
          decidedOn="2026-01-09"
        />) },
      { id: "ratifying", label: "Ratifying (in flight)", node: (
        <DecisionCard
          status="proposed"
          statement="Support macros must name the region, not the datacenter."
          sourceLabel="Zendesk"
          ratifying
          onRatify={() => {}}
          onIgnore={() => {}}
        />) },
      { id: "impact", label: "Ratified with impact strip", node: (
        <DecisionCard
          status="ratified"
          statement="Trials run for 21 days, not 14."
          context="Ratified at the pricing review."
          sourceLabel="Slack"
          owners={["Ana Ruiz", "Dev Park", "Mia Chen"]}
          decidedOn="2026-07-14"
          impact={<ImpactPanel summary="Three documents depend on the trial length." docs={IMPACT_DOCS} />}
        />) },
      { id: "stack", label: "Stacked ledger (spine alignment)", node: (
        <div>
          <DecisionCard status="ratified" statement="Trials run for 21 days." sourceLabel="Slack" decidedOn="2026-07-14" onIgnore={() => {}} />
          <DecisionCard status="proposed" statement="Renewals quote local currency." sourceLabel="Drive" decidedOn="2026-07-02" onRatify={() => {}} onIgnore={() => {}} />
          <DecisionCard status="ignored" statement="Trials run for 30 days." ignoredForStatement="Trials run for 21 days." decidedOn="2026-01-09" spine={false} />
        </div>) },
      { id: "loading", label: "Loading", node: <DecisionCard loading status="proposed" statement="" /> },
      { id: "overflow", label: "Overflow: long text, unbreakable string", node: (
        <DecisionCard
          status="proposed"
          statement={`${LONG} ${HUGE}`}
          context={`${BODY} ${HUGE}`}
          sourceLabel="Confluence space: engineering handbook"
          owners={["Aleksandra Konstantinopoulou", "Dev Park", "Mia Chen", "Ana Ruiz", "Tom Ek"]}
          decidedOn="2026-07-14"
          onRatify={() => {}}
          onIgnore={() => {}}
        />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <DecisionCard
          status="proposed"
          statement={LONG}
          context={HUGE}
          sourceLabel="Confluence"
          owners={["Ana Ruiz", "Dev Park", "Mia Chen"]}
          decidedOn="2026-07-14"
          onRatify={() => {}}
          onIgnore={() => {}}
        />) },
    ],
  },
  {
    id: "ImpactPanel", title: "ImpactPanel", width: 720,
    states: [
      { id: "default", label: "Default", node: (
        <ImpactPanel summary="Three documents depend on the trial length." docs={IMPACT_DOCS} onClose={() => {}} />) },
      { id: "boxed", label: "Boxed, with footer actions", node: (
        <ImpactPanel
          boxed
          summary="Three documents depend on the trial length."
          docs={IMPACT_DOCS}
          footer={<><Button variant="primary" compact>Create 3 review tasks</Button><Button compact>Open document</Button></>}
        />) },
      { id: "loading", label: "Loading", node: <ImpactPanel loading boxed /> },
      { id: "empty", label: "Empty (no impacted docs)", node: <ImpactPanel boxed /> },
      { id: "summary-only", label: "Summary only", node: (
        <ImpactPanel boxed summary="Nothing downstream reads this claim, so no document needs an edit." />) },
      { id: "overflow", label: "Overflow: 10 rows, long cells", node: (
        <ImpactPanel summary={`${BODY} ${HUGE}`} docs={IMPACT_LONG} onClose={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <ImpactPanel boxed summary={BODY} docs={IMPACT_LONG.slice(0, 3)} />) },
    ],
  },
  {
    id: "TokenReveal", title: "TokenReveal", width: 560,
    states: [
      { id: "masked", label: "Masked (default)", node: (
        <TokenReveal token="mari_sk_9f2c41ab77de4c0fa1b6e35d8c7a2019" onDismiss={() => {}} />) },
      { id: "revealed", label: "Revealed", node: (
        <TokenReveal token="mari_sk_9f2c41ab77de4c0fa1b6e35d8c7a2019" masked={false} />) },
      { id: "loading", label: "Loading (minting)", node: <TokenReveal loading token="" /> },
      { id: "short", label: "Short token", node: <TokenReveal token="abc123" title="MCP token" /> },
      { id: "overflow", label: "Overflow: very long token and title", node: (
        <TokenReveal title={LONG} masked={false} token={`${HUGE}${HUGE}`} onDismiss={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <TokenReveal masked={false} token={HUGE} onDismiss={() => {}} />) },
    ],
  },
  {
    id: "TagChip", title: "TagChip", width: 560,
    states: [
      { id: "all", label: "Every tag", node: (
        <div className="flex flex-wrap gap-1.5">
          {[...TAG_OPTIONS, "verified"].map((t) => <TagChip key={t} tag={t} />)}
        </div>) },
      { id: "selected", label: "Selected vs unselected (picker parity)", node: (
        <div className="flex flex-wrap gap-1.5">
          <TagChip tag="canonical" selected onClick={() => {}} />
          <TagChip tag="canonical" onClick={() => {}} />
          <TagChip tag="stale" selected onClick={() => {}} />
          <TagChip tag="deprecated" onClick={() => {}} />
        </div>) },
      { id: "removable", label: "Removable", node: (
        <div className="flex flex-wrap gap-1.5">
          {["canonical", "internal", "needs-review"].map((t) => <TagChip key={t} tag={t} removable onRemove={() => {}} />)}
        </div>) },
      { id: "unknown", label: "Unknown tag id", node: (
        <div className="flex flex-wrap gap-1.5">
          <TagChip tag="q3_launch_plan" />
          <TagChip tag="partner-facing" />
        </div>) },
      { id: "loading", label: "Loading", node: (
        <div className="flex flex-wrap gap-1.5"><TagChip tag="canonical" loading /><TagChip tag="draft" loading /></div>) },
      { id: "overflow", label: "Overflow: long labels, many chips, narrow", width: 320, node: (
        <div className="flex flex-wrap gap-1.5">
          <TagChip tag="canonical" label={LONG} />
          <TagChip tag="stale" label={HUGE} removable onRemove={() => {}} />
          {TAG_OPTIONS.map((t) => <TagChip key={t} tag={t} />)}
        </div>) },
    ],
  },
  {
    id: "DigestCard", title: "DigestCard", width: 620,
    states: [
      { id: "default", label: "Default", node: <DigestCard topics={TOPICS} onRefresh={() => {}} /> },
      { id: "regenerating", label: "Regenerating", node: <DigestCard topics={TOPICS} regenerating onRefresh={() => {}} /> },
      { id: "loading", label: "Loading", node: <DigestCard topics={[]} loading /> },
      { id: "empty", label: "Empty", node: <DigestCard topics={[]} onRefresh={() => {}} /> },
      { id: "error", label: "Error", node: <DigestCard topics={[]} error onRefresh={() => {}} /> },
      { id: "overflow", label: "Overflow: long topic, many chips", node: (
        <DigestCard title={LONG} topics={TOPICS_LONG} onRefresh={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <DigestCard topics={TOPICS_LONG} onRefresh={() => {}} />) },
    ],
  },
  {
    id: "ConnectorCard", title: "ConnectorCard", width: 380,
    states: [
      { id: "healthy", label: "Healthy", node: (
        <ConnectorCard
          name="Slack"
          counts="12,481 documents, 96,220 chunks"
          sync="Last sync: Jul 21, 2026"
          bars={[3, 6, 4, 9, 7, 12, 8]}
          onSyncNow={() => {}} onPause={() => {}}
        />) },
      { id: "syncing", label: "Syncing", node: (
        <ConnectorCard name="GitHub" health="Syncing" running canResync
          counts="4,102 documents" sync="Indexing pull requests…" bars={[2, 4, 3, 8, 6, 9, 11]}
          onSyncNow={() => {}} onFullResync={() => {}} onPause={() => {}} />) },
      { id: "error", label: "Error", node: (
        <ConnectorCard name="Confluence" health="Error" counts="0 documents"
          sync="Token expired. Reconnect the source to resume syncing." onSyncNow={() => {}} />) },
      { id: "paused", label: "Paused", node: (
        <ConnectorCard name="Zendesk" health="Paused" paused counts="880 documents"
          sync="Paused Jul 12, 2026" onResume={() => {}} />) },
      { id: "backfilling", label: "Backfilling, no menu", node: (
        <ConnectorCard name="Drive" health="Backfilling" counts="31,904 documents" sync="Backfill 62% complete" bars={[1, 3, 2, 5, 9]} />) },
      { id: "loading", label: "Loading", node: <ConnectorCard name="" loading /> },
      { id: "overflow", label: "Overflow: long name and lines", node: (
        <ConnectorCard name={HUGE} health="Error" counts={LONG} sync={BODY} onSyncNow={() => {}} onPause={() => {}} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <ConnectorCard name={LONG} counts={HUGE} sync={BODY}
          bars={[3, 6, 4, 9, 7]} onSyncNow={() => {}} onPause={() => {}} />) },
    ],
  },
  {
    id: "Timeline", title: "Timeline", width: 560,
    states: [
      { id: "default", label: "All tones", node: (
        <Timeline items={[
          { title: "Source connected", time: "Jul 21, 2026", tone: "ok", description: "Slack workspace linked by Ana Ruiz." },
          { title: "First sync finished", time: "Jul 21, 2026", tone: "info", description: "12,481 documents indexed." },
          { title: "Stale documents found", time: "Jul 20, 2026", tone: "attention", description: "Nine documents quote the retired trial length." },
          { title: "Sync failed", time: "Jul 19, 2026", tone: "blocked", description: "Token expired." },
          { title: "Nothing scheduled", time: "Jul 18, 2026" },
        ]} />) },
      { id: "icons", label: "Custom node icons", node: (
        <Timeline items={[
          { title: "Branch created", time: "Jul 21, 2026", icon: <GitBranch size={10} />, description: "release/2026-07" },
          { title: "Comment left", time: "Jul 20, 2026", icon: <MessageSquare size={10} /> },
          { title: "Document added", time: "Jul 19, 2026", icon: <FileText size={10} /> },
        ]} />) },
      { id: "single", label: "Single item (no rail)", node: (
        <Timeline items={[{ title: "Workspace created", time: "Jan 04, 2026", tone: "ok" }]} />) },
      { id: "loading", label: "Loading", node: <Timeline items={[]} loading /> },
      { id: "empty", label: "Empty", node: <Timeline items={[]} /> },
      { id: "overflow", label: "Overflow: long titles and times", node: (
        <Timeline items={[
          { title: LONG, time: "Jul 21, 2026 at 14:32", tone: "attention", description: BODY },
          { title: HUGE, time: "Jul 20, 2026", tone: "blocked", description: HUGE },
        ]} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <Timeline items={[
          { title: LONG, time: "Jul 21, 2026", tone: "ok", description: BODY },
          { title: HUGE, time: "Jul 20, 2026", description: HUGE },
        ]} />) },
    ],
  },
  {
    id: "ActivityFeed", title: "ActivityFeed", width: 560,
    states: [
      { id: "default", label: "Default (timestamp contrast)", node: (
        <ActivityFeed items={[
          { id: "1", actor: "Ana Ruiz", action: "ratified “Trials run for 21 days”.", time: "Jul 21, 2026" },
          { id: "2", actor: "Mari", action: "tagged 3 documents as Stale.", time: "Jul 21, 2026" },
          { id: "3", actor: "Dev Park", action: "connected the GitHub source.", time: "Jul 20, 2026" },
          { id: "4", action: "Scheduled sync finished with 2 warnings.", time: "Jul 20, 2026" },
        ]} />) },
      { id: "icons", label: "With icons", node: (
        <ActivityFeed items={[
          { id: "1", actor: "Ana Ruiz", action: "opened a pull request.", time: "Jul 21, 2026", icon: <GitBranch size={11} /> },
          { id: "2", actor: "Dev Park", action: "commented on the runbook.", time: "Jul 20, 2026", icon: <MessageSquare size={11} /> },
        ]} />) },
      { id: "loading", label: "Loading", node: <ActivityFeed items={[]} loading /> },
      { id: "empty", label: "Empty", node: <ActivityFeed items={[]} /> },
      { id: "overflow", label: "Overflow: long actions, 8 rows", node: (
        <ActivityFeed items={Array.from({ length: 8 }, (_, i) => ({
          id: String(i), actor: i % 2 ? "Aleksandra Konstantinopoulou" : undefined,
          action: i % 3 === 0 ? HUGE : `${LONG} (${i + 1})`, time: "Jul 21, 2026",
        }))} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <ActivityFeed items={[
          { id: "1", actor: "Aleksandra Konstantinopoulou", action: LONG, time: "Jul 21, 2026" },
          { id: "2", action: HUGE, time: "Jul 20, 2026" },
        ]} />) },
    ],
  },
  {
    id: "PropertyList", title: "PropertyList", width: 560,
    states: [
      { id: "rows", label: "Rows layout", node: (
        <PropertyList items={[
          { label: "Owner", value: "Ana Ruiz" },
          { label: "Source", value: "Confluence" },
          { label: "Region", value: "US West (us-west-2)" },
          { label: "Updated", value: "Jul 21, 2026" },
          { label: "Status", value: <Chip label="Canonical" tone="ok" dot /> },
        ]} />) },
      { id: "grid", label: "Grid layout, 3 columns", node: (
        <PropertyList layout="grid" columns={3} items={[
          { label: "Owner", value: "Ana Ruiz" },
          { label: "Source", value: "Confluence" },
          { label: "Region", value: "US West (us-west-2)" },
          { label: "Chunks", value: "1,204" },
          { label: "Updated", value: "Jul 21, 2026" },
          { label: "Reviewer", value: "Dev Park" },
        ]} />) },
      { id: "unboxed", label: "Unboxed, stacked value", node: (
        <PropertyList boxed={false} items={[
          { label: "Owner", value: "Ana Ruiz" },
          { label: "Summary", value: BODY, stacked: true },
        ]} />) },
      { id: "loading", label: "Loading", node: <PropertyList items={[]} loading /> },
      { id: "empty", label: "Empty", node: <PropertyList items={[]} /> },
      { id: "overflow", label: "Overflow: long labels and values", node: (
        <PropertyList items={[
          { label: LONG, value: BODY },
          { label: "Unbreakable", value: HUGE },
          { label: HUGE, value: LONG },
        ]} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <PropertyList items={[
          { label: "Owner", value: "Aleksandra Konstantinopoulou" },
          { label: LONG, value: BODY },
          { label: "Token", value: HUGE },
        ]} />) },
    ],
  },
  {
    id: "Accordion", title: "Accordion", width: 560,
    states: [
      { id: "single", label: "Single, first open", node: (
        <Accordion defaultValue="a" items={[
          { value: "a", title: "Sync schedule", content: "Slack syncs every 15 minutes. Drive syncs hourly." },
          { value: "b", title: "Retention", content: "Deleted documents leave the index within one hour." },
          { value: "c", title: "Access", content: "Only workspace admins can rotate tokens." },
        ]} />) },
      { id: "multiple", label: "Multiple, two open", node: (
        <Accordion type="multiple" defaultValue={["a", "b"]} items={[
          { value: "a", title: "Sync schedule", content: "Slack syncs every 15 minutes." },
          { value: "b", title: "Retention", content: "Deleted documents leave the index within one hour." },
          { value: "c", title: "Access", content: "Only workspace admins can rotate tokens." },
        ]} />) },
      { id: "collapsed", label: "All collapsed", node: (
        <Accordion items={[
          { value: "a", title: "Sync schedule", content: "Slack syncs every 15 minutes." },
          { value: "b", title: "Retention", content: "Deleted documents leave the index within one hour." },
        ]} />) },
      { id: "loading", label: "Loading", node: <Accordion loading items={[]} /> },
      { id: "empty", label: "Empty", node: <Accordion items={[]} /> },
      { id: "overflow", label: "Overflow: long titles and body", node: (
        <Accordion defaultValue="a" items={[
          { value: "a", title: LONG, content: `${BODY} ${HUGE}` },
          { value: "b", title: HUGE, content: BODY },
        ]} />) },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: (
        <Accordion defaultValue="a" items={[
          { value: "a", title: LONG, content: HUGE },
          { value: "b", title: HUGE, content: BODY },
        ]} />) },
    ],
  },
  {
    id: "TreeView", title: "TreeView", width: 460,
    states: [
      { id: "default", label: "Default (root expanded)", node: <TreeView data={TREE} /> },
      { id: "selected", label: "Selected node", node: <TreeView data={TREE} selected="p" onSelect={() => {}} /> },
      { id: "flat", label: "Flat list, custom icons", node: (
        <TreeView data={[
          { id: "1", label: "Pricing sheet", icon: <FileText size={14} /> },
          { id: "2", label: "Onboarding runbook", icon: <FileText size={14} /> },
          { id: "3", label: "Archive", icon: <Folder size={14} /> },
        ]} />) },
      { id: "loading", label: "Loading", node: <TreeView data={[]} loading /> },
      { id: "empty", label: "Empty", node: <TreeView data={[]} /> },
      { id: "overflow", label: "Overflow: long labels, deep nesting", node: <TreeView data={TREE_LONG} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <TreeView data={TREE_LONG} selected="a" /> },
    ],
  },
];
