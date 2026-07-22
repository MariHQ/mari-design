import type { ComponentSpec } from "./types";
import {
  LineageGraph, LineageToolbar, LineageTimeScrubber, LineageDataModel,
  LineageNodeDrawer, LineageEdgeDrawer, LineageGroupDrawer, LineageAssertDrawer,
} from "../../features";
import { Lineage } from "../../index";
import { DEMO_NODES, DEMO_EDGES, type LNode, type LEdge } from "../../features/LineageDataModel";

/* State matrix for the lineage group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and regional tax carve-outs";
const HUGE =
  "Supercalifragilisticexpialidocious_configuration_parameter_value_that_never_wraps_0123456789";
const LONG_OWNER = "Aleksandra Konstantinopoulou-Whitfield";

/* ── overflow fixtures ─────────────────────────────────────────────────── */

const OVER_NODES: LNode[] = [
  {
    id: "n1", source: "docs", title: LONG, meta: `Decision · owner ${LONG_OWNER} · 4d ago · customer-facing · pricing`,
    icon: "doc", docKind: "decision", group: "", x: 0.12, y: 0.3, date: "2026-07-17", createdDate: "2026-03-02",
    owner: LONG_OWNER, staleDays: 4, tags: ["customer-facing", "pricing", "revenue", "enterprise", "tax", "q3", "legal-reviewed", "long-tag-name-that-runs-on"],
    inbound: 12, outbound: 9,
  },
  {
    id: "n2", source: "github", title: HUGE, meta: `PR · merged · 2d ago`, icon: "github", docKind: "pr",
    group: "gh:MariHQ/web:prs", x: 0.5, y: 0.7, date: "2026-07-19", createdDate: "2026-07-10",
    owner: HUGE.slice(0, 40), staleDays: 2, warn: true, inbound: 3, outbound: 7,
  },
  {
    id: "n3", source: "docsite", title: "Billing FAQ", meta: "Page · owner Sam L · 52d ago", icon: "book",
    docKind: "page", group: "", x: 0.85, y: 0.4, date: "2026-05-30", owner: "Sam L", staleDays: 52, warn: true,
    inbound: 3, outbound: 1,
  },
];

const OVER_EDGES: LEdge[] = [
  { id: "e1", from: "n1", to: "n2", rel: "references", date: "2026-07-19", meta: { evidence: HUGE, status: "confirmed", note: LONG } },
  { id: "e2", from: "n2", to: "n3", rel: "contradicts", date: "2026-05-21", dashed: true, llm: true, meta: { note: LONG } },
  { id: "e3", from: "n1", to: "n3", rel: "translates", date: "2026-06-10" },
];

/** A node with no edges at all: the "empty connections" case. */
const LONE_NODES: LNode[] = [
  { id: "solo", source: "notion", title: "Orphaned scratch page", meta: "Page · unowned · 120d ago", icon: "notion",
    docKind: "page", group: "", x: 0.5, y: 0.5, date: "2026-03-01", staleDays: 120, orphan: true, inbound: 0, outbound: 0 },
];

/** Far too many members for one roll-up drawer. */
const MANY_MEMBERS: LNode[] = Array.from({ length: 24 }, (_, i) => ({
  id: `m${i}`, source: "github", title: i % 4 === 0 ? LONG : `fix: billing edge case #${i + 1}`,
  meta: "commit", icon: "github", docKind: "commit" as const, group: "gh:MariHQ/web:commits",
  x: 0, y: 0, owner: i % 3 === 0 ? LONG_OWNER : "Dev R", date: "2026-07-19", inbound: 24 - i,
}));

/* ── data-display Lineage fixtures ─────────────────────────────────────── */

const UP = [
  { id: "u1", label: "Pricing policy", sublabel: "docs", tone: "ok" as const },
  { id: "u2", label: "Free-tier limits", sublabel: "docs", tone: "info" as const },
  { id: "u3", label: "#pricing thread", sublabel: "slack", tone: "attention" as const },
];
const DOWN = [
  { id: "d1", label: "Billing FAQ", sublabel: "doc site", tone: "blocked" as const },
  { id: "d2", label: "Onboarding guide", sublabel: "notion", tone: "neutral" as const },
];
const FOCUS = { id: "f", label: "PR #482 · billing revamp", sublabel: "github · merged", tone: "info" as const };

export const LINEAGE: ComponentSpec[] = [
  /* ── graph canvas ────────────────────────────────────────────────────── */
  {
    id: "LineageGraph", title: "LineageGraph", width: 900,
    states: [
      { id: "default", label: "Default (source lens, flow layout, focal node selected)",
        node: <LineageGraph /> },
      { id: "lens-stale", label: "Lens: staleness", node: <LineageGraph lens="stale" /> },
      { id: "lens-owner", label: "Lens: ownership", node: <LineageGraph lens="owner" /> },
      { id: "lens-health", label: "Lens: health (warn badges)", node: <LineageGraph lens="health" /> },
      { id: "timeline", label: "Layout: timeline", node: <LineageGraph layout="timeline" /> },
      { id: "trace-down", label: "Trace: impact of n1 (downstream closure)",
        node: <LineageGraph trace={{ originId: "n1", direction: "down" }} /> },
      { id: "trace-up", label: "Trace: provenance of n9 (upstream closure)",
        node: <LineageGraph trace={{ originId: "n9", direction: "up" }} /> },
      { id: "loading", label: "Loading skeleton", node: <LineageGraph loading /> },
      { id: "empty", label: "Empty graph (no nodes, no edges)", node: <LineageGraph nodes={[]} edges={[]} focalId={null} /> },
      { id: "single", label: "One orphan node, no edges", node: <LineageGraph nodes={LONE_NODES} edges={[]} focalId="solo" /> },
      { id: "overflow", label: "Overflow: absurd titles, unbreakable string, long owners",
        node: <LineageGraph nodes={OVER_NODES} edges={OVER_EDGES} focalId="n1" /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <LineageGraph /> },
    ],
  },

  /* ── toolbar ─────────────────────────────────────────────────────────── */
  {
    id: "LineageToolbar", title: "LineageToolbar", width: 900,
    states: [
      { id: "default", label: "Default (three rows: filters / view / actions)", node: <LineageToolbar /> },
      { id: "loading", label: "Loading skeleton", node: <LineageToolbar loading /> },
      { id: "empty", label: "No nodes (no sources to filter by)", node: <LineageToolbar nodes={[]} /> },
      { id: "overflow", label: "Overflow: many long source names", node: <LineageToolbar nodes={OVER_NODES.concat(DEMO_NODES)} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <LineageToolbar /> },
    ],
  },

  /* ── time scrubber ───────────────────────────────────────────────────── */
  {
    id: "LineageTimeScrubber", title: "LineageTimeScrubber", width: 900,
    states: [
      { id: "live", label: "Live (all time)", node: <LineageTimeScrubber /> },
      { id: "asof", label: "Scrubbed back to an event date", node: <LineageTimeScrubber value={4} /> },
      { id: "loading", label: "Loading skeleton", node: <LineageTimeScrubber loading /> },
      { id: "empty", label: "Empty: no events", node: <LineageTimeScrubber dates={[]} activity={[]} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <LineageTimeScrubber /> },
    ],
  },

  /* ── data-model legend ───────────────────────────────────────────────── */
  {
    id: "LineageDataModel", title: "LineageDataModel", width: 700,
    states: [
      { id: "default", label: "Legend", node: <LineageDataModel /> },
      { id: "loading", label: "Loading skeleton", node: <LineageDataModel loading /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320, node: <LineageDataModel /> },
    ],
  },

  /* ── node drawer ─────────────────────────────────────────────────────── */
  {
    id: "LineageNodeDrawer", title: "LineageNodeDrawer", width: 460,
    states: [
      { id: "default", label: "Default (PR node, references + connections)", node: <LineageNodeDrawer nodeId="n4" /> },
      { id: "decision", label: "Decision doc, tagged, fresh", node: <LineageNodeDrawer nodeId="n1" /> },
      { id: "warn", label: "Stale doc that needs attention", node: <LineageNodeDrawer nodeId="n3" /> },
      { id: "macro", label: "Roll-up macro node", node: <LineageNodeDrawer nodeId="grp:gh:MariHQ/web:commits" /> },
      { id: "loading", label: "Loading skeleton", node: <LineageNodeDrawer loading /> },
      { id: "empty", label: "Empty: orphan node with no connections",
        node: <LineageNodeDrawer nodes={LONE_NODES} edges={[]} nodeId="solo" /> },
      { id: "overflow", label: "Overflow: absurd title, unbreakable meta, many tags",
        node: <LineageNodeDrawer nodes={OVER_NODES} edges={OVER_EDGES} nodeId="n1" /> },
      { id: "overflow-unbreakable", label: "Overflow: 90-char unbreakable title",
        node: <LineageNodeDrawer nodes={OVER_NODES} edges={OVER_EDGES} nodeId="n2" /> },
      { id: "narrow", label: "Overflow: narrow frame (fixed width must not shrink)", width: 320,
        node: <LineageNodeDrawer nodeId="n4" /> },
    ],
  },

  /* ── edge drawer ─────────────────────────────────────────────────────── */
  {
    id: "LineageEdgeDrawer", title: "LineageEdgeDrawer", width: 460,
    states: [
      { id: "default", label: "Confirmed reference with evidence", node: <LineageEdgeDrawer edgeId="e3" /> },
      { id: "contradicts", label: "Contradiction (heavy dashed relation)", node: <LineageEdgeDrawer edgeId="e5" /> },
      { id: "derived", label: "Derived by Mari (translates)", node: <LineageEdgeDrawer edgeId="e11" /> },
      { id: "bare", label: "Bare edge: no evidence, no note", node: <LineageEdgeDrawer edgeId="e2" /> },
      { id: "loading", label: "Loading skeleton", node: <LineageEdgeDrawer loading /> },
      { id: "overflow", label: "Overflow: absurd endpoint titles + unbreakable evidence",
        node: <LineageEdgeDrawer nodes={OVER_NODES} edges={OVER_EDGES} edgeId="e1" /> },
      { id: "narrow", label: "Overflow: narrow frame (fixed width must not shrink)", width: 320,
        node: <LineageEdgeDrawer edgeId="e3" /> },
    ],
  },

  /* ── group drawer ────────────────────────────────────────────────────── */
  {
    id: "LineageGroupDrawer", title: "LineageGroupDrawer", width: 460,
    states: [
      { id: "default", label: "Default roll-up bucket", node: <LineageGroupDrawer /> },
      { id: "single", label: "One member", node: <LineageGroupDrawer totalMembers={1} members={MANY_MEMBERS.slice(0, 1)} /> },
      { id: "many", label: "Far too many members", node: <LineageGroupDrawer totalMembers={248} members={MANY_MEMBERS} /> },
      { id: "loading", label: "Loading skeleton", node: <LineageGroupDrawer loading /> },
      { id: "empty", label: "Empty: no members left after filters", node: <LineageGroupDrawer totalMembers={0} members={[]} /> },
      { id: "overflow", label: "Overflow: absurd repo id and member titles",
        node: <LineageGroupDrawer groupId={`gh:MariHQ/${HUGE}:commits`} totalMembers={248} members={MANY_MEMBERS} /> },
      { id: "narrow", label: "Overflow: narrow frame (fixed width must not shrink)", width: 320,
        node: <LineageGroupDrawer /> },
    ],
  },

  /* ── assert / impact drawer ──────────────────────────────────────────── */
  {
    id: "LineageAssertDrawer", title: "LineageAssertDrawer", width: 500,
    states: [
      { id: "default", label: "Completed analysis", node: <LineageAssertDrawer /> },
      { id: "empty", label: "Pre-analysis (no result yet)", node: <LineageAssertDrawer result={null} /> },
      { id: "loading", label: "Loading skeleton", node: <LineageAssertDrawer loading /> },
      { id: "overflow", label: "Overflow: absurd claim, summary and doc titles",
        node: (
          <LineageAssertDrawer
            result={{
              claim: HUGE,
              summary: LONG + " " + LONG,
              docs: Array.from({ length: 12 }, (_, i) => ({
                title: i % 3 === 0 ? LONG : i % 3 === 1 ? HUGE : "Billing FAQ",
                source: "docsite",
                severity: (["update-required", "review", "minor"] as const)[i % 3],
                reason: i % 2 === 0 ? LONG : "states the free tier is permanent",
              })),
            }}
          />) },
      { id: "narrow", label: "Overflow: narrow frame (fixed width must not shrink)", width: 320,
        node: <LineageAssertDrawer /> },
    ],
  },

  /* ── data-display Lineage (upstream → focus → downstream) ────────────── */
  {
    id: "Lineage", title: "Lineage (data-display)", width: 900,
    states: [
      { id: "default", label: "Upstream + focus + downstream", node: <Lineage upstream={UP} focus={FOCUS} downstream={DOWN} onSelect={() => {}} /> },
      { id: "upstream-only", label: "Upstream only", node: <Lineage upstream={UP} focus={FOCUS} /> },
      { id: "downstream-only", label: "Downstream only", node: <Lineage focus={FOCUS} downstream={DOWN} /> },
      { id: "solo", label: "Focus alone (no lineage recorded)", node: <Lineage focus={FOCUS} /> },
      { id: "many", label: "Overflow: many nodes on both sides",
        node: <Lineage
          upstream={Array.from({ length: 7 }, (_, i) => ({ id: `u${i}`, label: `Upstream document ${i + 1}`, sublabel: "docs" }))}
          focus={FOCUS}
          downstream={Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, label: `Downstream document ${i + 1}`, sublabel: "notion" }))} /> },
      { id: "overflow", label: "Overflow: absurd labels + unbreakable string",
        node: <Lineage
          upstream={[{ id: "u1", label: LONG, sublabel: LONG_OWNER }, { id: "u2", label: HUGE, sublabel: HUGE }]}
          focus={{ id: "f", label: LONG, sublabel: HUGE }}
          downstream={[{ id: "d1", label: HUGE, sublabel: "doc site" }]} /> },
      { id: "narrow", label: "Overflow: narrow frame", width: 320,
        node: <Lineage upstream={UP} focus={FOCUS} downstream={DOWN} /> },
    ],
  },
];
