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
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <AuthSession /> },
    ],
  },
  {
    id: "PublishSiteEditor", title: "PublishSiteEditor", width: 1100,
    states: [
      { id: "default", label: "Default (theme tab)", node: <PublishSiteEditor /> },
      { id: "loading", label: "Loading", node: <PublishSiteEditor loading /> },
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
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <DecisionCardFeature /> },
    ],
  },
  {
    id: "GlobalIconsArt", title: "GlobalIconsArt", width: 940,
    states: [
      { id: "default", label: "Default", node: <GlobalIconsArt /> },
      { id: "loading", label: "Loading", node: <GlobalIconsArt loading /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <GlobalIconsArt /> },
    ],
  },
  {
    id: "ChatDockFeature", title: "ChatDockFeature", width: OVERLAY_W,
    states: [
      { id: "open", label: "Dock open", node: <Stage><ChatDockFeature /></Stage> },
      { id: "closed", label: "Dock closed", node: <Stage><ChatDockFeature defaultOpen={false} /></Stage> },
      { id: "loading", label: "Loading", node: <Stage><ChatDockFeature loading /></Stage> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <ChatDockFeature defaultOpen={false} /> },
    ],
  },
];
