import type { ReactNode } from "react";
import type { ComponentSpec } from "./types";
import {
  SettingsMembersTable, SettingsApiKeys, SettingsAuditLog, SettingsModelsConfig,
  BrandingEditor, AuthSession, PublishSiteEditor, PublishMcpServers,
  TagPickerFeature, TokenRevealFeature, ImpactPanelFeature, DecisionCardFeature,
  GlobalIconsArt, ChatDockFeature,
} from "../../features";

/* State matrix for the admin group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and mid-term amendments";
const HUGE =
  "Supercalifragilisticexpialidocious_configuration_parameter_value_that_never_wraps_1234567890";

const OVERLAY_W = 1468;
const Stage = ({ children }: { children: ReactNode }) => <div style={{ height: 850 }}>{children}</div>;

/* ── Volume fixtures ──────────────────────────────────────────────────────
   The `stress` state of every spec below is the realistic worst case, not a
   slightly longer demo: a 400-person workspace, a 1,200-event access log, a
   240-key fleet. These are the states that prove a card paginates or scrolls
   instead of growing to ten thousand pixels. */

const FIRST = ["Maya", "Devon", "Priya", "Sam", "Aleksandra", "Marcus", "Dana", "Rin", "Tobias", "Ines"];
const LAST = ["Chen", "Park", "Nair", "Okafor", "Konstantinopoulou-Whitfield", "Vale", "Osei", "Ito", "Lindqvist", "Alvarez"];
const person = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
const inits = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const MANY_MEMBERS = Array.from({ length: 400 }, (_, i) => ({
  id: i + 1,
  name: person(i),
  initials: inits(person(i)),
  email: i % 17 === 0 ? `${HUGE}@team.com` : `${person(i).split(" ")[0].toLowerCase()}.${i}@team.com`,
  role: (["admin", "manager", "user"] as const)[i % 3],
  status: i % 6 === 0 ? "invited" : "active",
  joined: `202${4 + (i % 2)}-0${(i % 9) + 1}-1${i % 9}`,
}));

const MANY_KEYS = Array.from({ length: 240 }, (_, i) => ({
  id: i + 1,
  name: i % 11 === 0 ? `${LONG} ${i}` : `${["CI pipeline", "MCP gateway", "Support bot", "Nightly export", "Ingest worker"][i % 5]} ${i}`,
  prefix: `mk_live_${i.toString(16).padStart(4, "0")}a91f…`,
  scopes: i % 4 === 0 ? "search:read ingest:write facts:read facts:write glossary:read lineage:read answers:write" : "search:read",
  created: "2025-02-11",
  lastUsed: i % 5 === 0 ? null : "2026-07-18",
  revoked: i % 7 === 0,
}));

const MANY_EVENTS = Array.from({ length: 1200 }, (_, i) => ({
  id: i + 1,
  actor: person(i),
  verb: ["invited member", "revoked API key", "changed role", "deployed site", "synced source", "updated setting"][i % 6],
  target: i % 13 === 0 ? HUGE : `${["sam@team.com", "Old bot (rotated)", "docs.acme.com v14", "GitHub · acme/handbook", "llm set to anthropic:claude-3.5"][i % 5]} ${i}`,
  at: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T1${i % 9}:42:00`,
}));

const MANY_CHUNKING = Array.from({ length: 60 }, (_, i) => ({
  source: i % 9 === 0 ? HUGE : `${["GitHub", "Slack", "Google Drive", "Notion", "Confluence", "Zendesk"][i % 6]} workspace ${i}`,
  strategy: (["heading", "thread", "fixed"] as const)[i % 3],
  max_tokens: 512 + (i % 4) * 256,
  overlap: (i % 5) * 32,
}));

const MANY_SERVERS = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: i % 12 === 0 ? HUGE : `${["support-kb", "eng-lineage", "sales-answers", "ops-runbooks"][i % 4]}-${i}`,
  url: `https://mcp.acme.com/s/${i % 12 === 0 ? HUGE : `server-${i}`}`,
  scope: (["workspace", "product", "team", "org", "public"] as const)[i % 5],
  status: (i % 2 === 0 ? "connected" : "idle") as "connected" | "idle",
  capabilities: i === 3 ? [] : ["search", "facts", "glossary", "chat", "lineage", "answers"].slice(0, (i % 6) + 1),
}));

const BIG_SITE = {
  id: 7,
  name: "Acme Docs",
  domain: "docs.acme.com",
  status: "live" as const,
  docs: 18420,
  warnings: 312,
  sources: ["canonical", "customer-facing", "verified", "internal", "needs-review", "stale", "deprecated", "runbook", "draft", "decision", "policy", "reference"],
  gates: Array.from({ length: 40 }, (_, i) => ({
    name: i % 8 === 0 ? LONG : `Gate ${i + 1}: every fact verified`,
    ok: i % 3 !== 0,
    note: i % 3 !== 0 ? `${1000 + i}/${1000 + i} verified` : `${i} terms undefined`,
  })),
  nav: Array.from({ length: 120 }, (_, i) => ({
    label: i % 10 === 0 ? LONG : `Section ${i + 1}`,
    active: i === 0,
    children: i % 4 === 0 ? Array.from({ length: 6 }, (_, j) => `Page ${i + 1}.${j + 1}`) : undefined,
  })),
  releases: Array.from({ length: 300 }, (_, i) => ({
    id: 300 - i,
    version: `v${300 - i}`,
    status: i === 0 ? "live" : "superseded",
    deployed: "2026-07-19T09:55:00",
    notes: i % 6 === 0 ? LONG : "Deployed to S3 · acme-docs-prod",
  })),
};

const MANY_DOCS = Array.from({ length: 120 }, (_, i) => ({
  id: `d${i}`,
  title: i % 9 === 0 ? LONG : `Runbook ${i + 1}: incident response`,
  provider: ["notion", "github", "slack", "docs"][i % 4],
  source: i % 11 === 0 ? `notion · ${HUGE}` : `notion · space ${i}`,
  updatedAt: "2026-07-20T10:00:00",
  tags: ["canonical", "draft", "stale", "deprecated", "internal", "customer-facing", "needs-review"].slice(0, (i % 7) + 1),
}));

const MANY_TOKENS = Array.from({ length: 180 }, (_, i) => ({
  id: `k${i}`,
  label: i % 10 === 0 ? HUGE : `Service account ${i + 1}`,
  prefix: `mari_sk_live_${i.toString(16).padStart(6, "0")}`,
  createdAt: "2026-05-02",
  lastUsed: i % 2 ? null : "2026-07-20T10:00:00",
}));

const MANY_IMPACT = Array.from({ length: 250 }, (_, i) => ({
  title: i % 8 === 0 ? LONG : `Regional addendum ${i + 1}`,
  source: i % 12 === 0 ? `gdocs · ${HUGE}` : `gdocs · handbook ${i}`,
  severity: (["update-required", "review", "minor"] as const)[i % 3],
  reason: i % 5 === 0 ? LONG : "Restates the retired figure in the fine print.",
}));

const MANY_DECISIONS = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  statement: i % 7 === 0 ? LONG : `Decision ${i + 1}: trials run for 21 days.`,
  context: i % 4 === 0 ? LONG : "Raised at the pricing review.",
  status: (["proposed", "ratified", "ignored"] as const)[i % 3],
  source: i % 9 === 0 ? HUGE : `slack · #pricing`,
  provider: "slack",
  owners: Array.from({ length: (i % 9) + 1 }, (_, j) => person(i + j)),
  decidedOn: "2026-07-09",
  ignoredFor: i % 3 === 2 ? LONG : undefined,
  impact: { open: false, loading: false, docs: null, tasksCreated: false, count: i, summary: LONG },
}));

export const ADMIN: ComponentSpec[] = [
  {
    id: "SettingsMembersTable", title: "SettingsMembersTable", width: 980,
    states: [
      { id: "default", label: "Default", node: <SettingsMembersTable /> },
      { id: "loading", label: "Loading", node: <SettingsMembersTable loading /> },
      { id: "empty", label: "No members", node: <SettingsMembersTable members={[]} /> },
      { id: "disconnected", label: "GitHub team not connected", node: (
        <SettingsMembersTable githubTeam={{ connected: false, team: "" }} />) },
      { id: "overflow", label: "Overflow: long names, unbreakable email, many rows", node: (
        <SettingsMembersTable workspaceName={LONG} members={Array.from({ length: 18 }, (_, i) => ({
          id: i + 1,
          name: i % 4 === 0 ? "Aleksandra Konstantinopoulou-Whitfield" : `${LONG} ${i}`,
          initials: "AK",
          email: i % 3 === 0 ? `${HUGE}@team.com` : `member${i}@team.com`,
          role: (["admin", "manager", "user"] as const)[i % 3],
          status: i % 5 === 0 ? "invited" : "active",
          joined: "2025-06-30",
        }))} />) },
      { id: "stress", label: "Volume: 400 members", node: <SettingsMembersTable members={MANY_MEMBERS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SettingsMembersTable /> },
    ],
  },
  {
    id: "SettingsApiKeys", title: "SettingsApiKeys", width: 980,
    states: [
      { id: "default", label: "Default", node: <SettingsApiKeys /> },
      { id: "loading", label: "Loading", node: <SettingsApiKeys loading /> },
      { id: "empty", label: "No keys", node: <SettingsApiKeys keys={[]} /> },
      { id: "revoked", label: "All revoked", node: (
        <SettingsApiKeys keys={[
          { id: 1, name: "Old bot", prefix: "mk_live_3de8…", scopes: "search:read", created: "2024-12-01", lastUsed: "2025-03-30", revoked: true },
        ]} />) },
      { id: "overflow", label: "Overflow: long names, many scopes, many rows", node: (
        <SettingsApiKeys keys={Array.from({ length: 16 }, (_, i) => ({
          id: i + 1, name: i % 3 === 0 ? HUGE : `${LONG} ${i}`,
          prefix: `mk_live_${HUGE}`,
          scopes: "search:read ingest:write facts:read facts:write glossary:read lineage:read answers:write",
          created: "2025-02-11", lastUsed: i % 4 === 0 ? null : "2026-07-18", revoked: i % 5 === 0,
        }))} />) },
      { id: "stress", label: "Volume: 240 keys, wide scope strings", node: <SettingsApiKeys keys={MANY_KEYS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SettingsApiKeys /> },
    ],
  },
  {
    id: "SettingsAuditLog", title: "SettingsAuditLog", width: 980,
    states: [
      { id: "default", label: "Default", node: <SettingsAuditLog /> },
      { id: "loading", label: "Loading", node: <SettingsAuditLog loading /> },
      { id: "empty", label: "No events", node: <SettingsAuditLog events={[]} total={0} /> },
      { id: "overflow", label: "Overflow: long targets, many rows", node: (
        <SettingsAuditLog total={4210} events={Array.from({ length: 20 }, (_, i) => ({
          id: i + 1, actor: i % 3 === 0 ? "Aleksandra Konstantinopoulou-Whitfield" : "Maya Chen",
          verb: i % 2 === 0 ? "updated setting" : "changed role",
          target: i % 3 === 0 ? HUGE : `${LONG} ${i}`,
          at: "2026-07-20T15:42:00",
        }))} />) },
      { id: "stress", label: "Volume: 1,200 events", node: <SettingsAuditLog events={MANY_EVENTS} total={MANY_EVENTS.length} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SettingsAuditLog /> },
    ],
  },
  {
    id: "SettingsModelsConfig", title: "SettingsModelsConfig", width: 980,
    states: [
      { id: "default", label: "Default", node: <SettingsModelsConfig /> },
      { id: "loading", label: "Loading", node: <SettingsModelsConfig loading /> },
      { id: "empty", label: "No chunking rules", node: <SettingsModelsConfig chunking={[]} /> },
      { id: "unknown", label: "Unknown model + strategy (custom values)", node: (
        <SettingsModelsConfig embedding="custom:in-house-embedder" llm="custom:in-house-llm" dims={4096}
          chunking={[{ source: "Custom feed", strategy: "semantic", max_tokens: 2048, overlap: 256 }]} />) },
      { id: "overflow", label: "Overflow: long source names, many rows", node: (
        <SettingsModelsConfig chunking={Array.from({ length: 12 }, (_, i) => ({
          source: i % 3 === 0 ? HUGE : `${LONG} ${i}`, strategy: "heading", max_tokens: 800, overlap: 80,
        }))} />) },
      { id: "stress", label: "Volume: 60 chunking rules", node: <SettingsModelsConfig chunking={MANY_CHUNKING} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SettingsModelsConfig /> },
    ],
  },
  {
    id: "BrandingEditor", title: "BrandingEditor", width: 980,
    states: [
      { id: "default", label: "Default (no branding set)", node: <BrandingEditor /> },
      { id: "loading", label: "Loading", node: <BrandingEditor loading /> },
      { id: "branded", label: "Branding applied", node: (
        <BrandingEditor branding={{ accent: "#0B5CAD", green: "#1F7A4C", blue: "#1E6FA8", gold: "#A05E1C",
          displayFont: "Sora", bodyFont: "Source Serif Pro", logoAlt: "Northwind Analytics" }} />) },
      { id: "overflow", label: "Overflow: unbreakable logo alt", node: (
        <BrandingEditor branding={{ accent: "#7A2E1F", logoAlt: HUGE, displayFont: LONG }} />) },
      { id: "stress", label: "Volume: every field at maximum length", node: (
        <BrandingEditor branding={{ accent: "#7A2E1F", green: "#1F7A4C", blue: "#1E6FA8", gold: "#A05E1C", logoAlt: `${LONG} ${HUGE}`, displayFont: LONG, bodyFont: HUGE }} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <BrandingEditor /> },
    ],
  },
  {
    id: "AuthSession", title: "AuthSession", width: 520,
    states: [
      { id: "signin", label: "Sign in", node: <AuthSession /> },
      { id: "session", label: "Signed in", node: (
        <AuthSession initialUser={{ name: "Maya Chen", email: "maya@team.com", role: "admin", initials: "MC", provider: "password" }} />) },
      { id: "loading", label: "Loading", node: <AuthSession loading /> },
      { id: "no-oauth", label: "No OAuth, no bypass", node: <AuthSession bypassEnabled={false} oauth={{ github: false, google: false }} /> },
      { id: "overflow", label: "Overflow: long name and email", node: (
        <AuthSession initialUser={{ name: "Aleksandra Konstantinopoulou-Whitfield", email: `${HUGE}@team.com`, role: "workspace administrator", initials: "AK", provider: "github" }} />) },
      { id: "stress", label: "Volume: maximal identity strings", node: (
        <AuthSession initialUser={{ name: `${person(4)} ${person(5)}`, email: `${HUGE}@team.com`, role: LONG, initials: "AK", provider: "github" }} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <AuthSession /> },
    ],
  },
  {
    id: "PublishSiteEditor", title: "PublishSiteEditor", width: 1100,
    states: [
      { id: "default", label: "Default (theme tab)", node: <PublishSiteEditor /> },
      { id: "loading", label: "Loading", node: <PublishSiteEditor loading /> },
      { id: "content", label: "Variant: Content tab", node: <PublishSiteEditor defaultTab="content" /> },
      { id: "deploy", label: "Variant: Deploy tab", node: <PublishSiteEditor defaultTab="deploy" /> },
      { id: "stress", label: "Volume: 300 releases (Deploy tab)", node: <PublishSiteEditor defaultTab="deploy" site={BIG_SITE} /> },
      { id: "stress-nav", label: "Volume: 120 nav entries (Nav tab)", node: <PublishSiteEditor defaultTab="nav" site={BIG_SITE} /> },
      { id: "stress-content", label: "Volume: 40 gates, 12 source tags (Content tab)", node: <PublishSiteEditor defaultTab="content" site={BIG_SITE} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <PublishSiteEditor /> },
    ],
  },
  {
    id: "PublishMcpServers", title: "PublishMcpServers", width: 980,
    states: [
      { id: "default", label: "Default", node: <PublishMcpServers /> },
      { id: "loading", label: "Loading", node: <PublishMcpServers loading /> },
      { id: "empty", label: "No servers", node: <PublishMcpServers servers={[]} /> },
      { id: "overflow", label: "Overflow: long names, many servers", node: (
        <PublishMcpServers servers={Array.from({ length: 8 }, (_, i) => ({
          id: i + 1, name: i % 3 === 0 ? HUGE : `${LONG} ${i}`.replace(/\s+/g, "-").toLowerCase(),
          url: `https://mcp.acme.com/s/${HUGE}`,
          scope: (["workspace", "product", "team", "org", "public"] as const)[i % 5],
          status: (i % 2 === 0 ? "connected" : "idle") as "connected" | "idle",
          capabilities: i === 1 ? [] : ["search", "facts", "glossary", "chat", "lineage", "answers"],
        }))} />) },
      { id: "stress", label: "Volume: 60 servers", node: <PublishMcpServers servers={MANY_SERVERS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <PublishMcpServers /> },
    ],
  },
  {
    id: "TagPickerFeature", title: "TagPickerFeature", width: 760,
    states: [
      { id: "default", label: "Default", node: <TagPickerFeature /> },
      { id: "empty", label: "No documents", node: <TagPickerFeature docs={[]} /> },
      { id: "untagged", label: "Untagged document", node: (
        <TagPickerFeature docs={[{ id: "d1", title: "Untitled draft", provider: "docs", source: "docs · scratch", updatedAt: "2026-07-20T10:00:00", tags: [] }]} />) },
      { id: "overflow", label: "Overflow: long titles, every tag", node: (
        <TagPickerFeature docs={Array.from({ length: 6 }, (_, i) => ({
          id: `d${i}`, title: i % 2 === 0 ? LONG : HUGE, provider: "notion", source: `notion · ${HUGE}`,
          updatedAt: "2026-07-20T10:00:00",
          tags: ["canonical", "draft", "stale", "deprecated", "internal", "customer-facing", "needs-review"],
        }))} />) },
      { id: "stress", label: "Volume: 120 documents, every tag", node: <TagPickerFeature docs={MANY_DOCS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <TagPickerFeature /> },
    ],
  },
  {
    id: "TokenRevealFeature", title: "TokenRevealFeature", width: 720,
    states: [
      { id: "default", label: "Default", node: <TokenRevealFeature /> },
      { id: "empty", label: "No keys", node: <TokenRevealFeature keys={[]} /> },
      { id: "overflow", label: "Overflow: long labels, many keys", node: (
        <TokenRevealFeature keys={Array.from({ length: 12 }, (_, i) => ({
          id: `k${i}`, label: i % 3 === 0 ? HUGE : `${LONG} ${i}`,
          prefix: `mari_sk_live_${HUGE}`, createdAt: "2026-05-02", lastUsed: i % 2 ? null : "2026-07-20T10:00:00",
        }))} />) },
      { id: "stress", label: "Volume: 180 keys", node: <TokenRevealFeature keys={MANY_TOKENS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <TokenRevealFeature /> },
    ],
  },
  {
    id: "ImpactPanelFeature", title: "ImpactPanelFeature", width: 780,
    states: [
      { id: "idle", label: "Idle (run affordance)", node: <ImpactPanelFeature /> },
      { id: "analyzed", label: "Analyzed", node: <ImpactPanelFeature analyzed /> },
      { id: "loading", label: "Loading", node: <ImpactPanelFeature loading /> },
      { id: "empty", label: "No impacted documents", node: <ImpactPanelFeature analyzed docs={[]} summary="No documents reference this claim." /> },
      { id: "overflow", label: "Overflow: long claim, many documents", node: (
        <ImpactPanelFeature analyzed claim={`${LONG}. Identifier ${HUGE}.`} source={`github · ${HUGE}`}
          summary={LONG}
          docs={Array.from({ length: 12 }, (_, i) => ({
            title: i % 2 === 0 ? LONG : HUGE, source: `gdocs · ${HUGE}`,
            severity: (["update-required", "review", "minor"] as const)[i % 3], reason: LONG,
          }))} />) },
      { id: "stress", label: "Volume: 250 impacted documents", node: (
        <ImpactPanelFeature analyzed claim={LONG} summary={LONG} docs={MANY_IMPACT} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <ImpactPanelFeature analyzed /> },
    ],
  },
  {
    id: "DecisionCardFeature", title: "DecisionCardFeature", width: 780,
    states: [
      { id: "default", label: "Default ledger", node: <DecisionCardFeature /> },
      { id: "loading", label: "Loading", node: <DecisionCardFeature loading /> },
      { id: "empty", label: "No decisions", node: <DecisionCardFeature decisions={[]} /> },
      { id: "overflow", label: "Overflow: long statements, many rows", node: (
        <DecisionCardFeature decisions={Array.from({ length: 8 }, (_, i) => ({
          id: i + 1, statement: i % 2 === 0 ? LONG : HUGE, context: LONG,
          status: (["proposed", "ratified", "ignored"] as const)[i % 3],
          source: HUGE, provider: "slack",
          owners: ["Aleksandra Konstantinopoulou-Whitfield", "Dana Ito", "Reza Okafor", "Priya Nair"],
          decidedOn: "2026-07-09", ignoredFor: HUGE,
          impact: { open: false, loading: false, docs: null, tasksCreated: false, count: 5, summary: LONG },
        }))} />) },
      { id: "stress", label: "Volume: 120 decisions, 9 owners each", node: <DecisionCardFeature decisions={MANY_DECISIONS} /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <DecisionCardFeature /> },
    ],
  },
  {
    id: "GlobalIconsArt", title: "GlobalIconsArt", width: 940,
    states: [
      { id: "default", label: "Default", node: <GlobalIconsArt /> },
      { id: "loading", label: "Loading", node: <GlobalIconsArt loading /> },
      { id: "stress", label: "Volume: the whole icon catalog", node: <GlobalIconsArt /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <GlobalIconsArt /> },
    ],
  },
  {
    id: "ChatDockFeature", title: "ChatDockFeature", width: OVERLAY_W,
    states: [
      { id: "open", label: "Dock open", node: <Stage><ChatDockFeature /></Stage> },
      { id: "closed", label: "Dock closed", node: <Stage><ChatDockFeature defaultOpen={false} /></Stage> },
      { id: "loading", label: "Loading", node: <Stage><ChatDockFeature loading /></Stage> },
      { id: "stress", label: "Volume: full transcript in the dock", node: <Stage><ChatDockFeature /></Stage> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <ChatDockFeature defaultOpen={false} /> },
    ],
  },
];
