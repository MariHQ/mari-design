import type { ReactNode } from "react";
import type { ComponentSpec } from "./types";
import {
  AnswerCard, AnswersHarvestWizard,
  SourcesConnectorCard, SourcesConnectorWizard, SourcesSyncStatus, SourcesBots,
  WelcomeGenericConnect, WelcomeGithubConnect, WelcomeGlossaryStep, WelcomeGuideStep,
  WelcomeSyncPanel, WelcomeUploadConnect,
} from "../../features";

/* State matrix for the sources group. Author EVERY state worth reviewing:
   default, each variant, loading, empty, error, disabled, selected, and the
   overflow cases (very long text, unbreakable strings, too many items, a
   frame too narrow). Overflow states are where layout actually breaks. */

const LONG =
  "Quarterly revenue recognition policy for multi-year enterprise agreements with usage-based true-ups and mid-term amendments";
const HUGE =
  "Supercalifragilisticexpialidocious_configuration_parameter_value_that_never_wraps_1234567890";

/* Drawers and dialogs paint over the whole capture viewport, so their frames
   are sized to it. Everything else is sized to the component. */
const OVERLAY_W = 1468;
const Stage = ({ children }: { children: ReactNode }) => <div style={{ height: 850 }}>{children}</div>;

export const SOURCES: ComponentSpec[] = [
  {
    id: "AnswerCard", title: "AnswerCard", width: 760,
    states: [
      { id: "approved", label: "Approved (default)", node: <AnswerCard /> },
      { id: "draft", label: "Draft, no channels", node: (
        <AnswerCard answer={{
          id: 2, question: "Do you support SSO on the team plan?",
          answer: "SSO is available on Business and Enterprise. Team plans can trial it for 14 days.",
          status: "draft", owner: "Devon Park", channels: [],
          sources: [{ source: "notion", title: "Plans and packaging" }],
          served: 0, spark: [], updated: "2026-07-02",
        }} />) },
      { id: "retired", label: "Retired", node: (
        <AnswerCard answer={{
          id: 3, question: "How do I export with the v1 API?",
          answer: "The v1 export API is retired. Use the streaming export endpoint instead.",
          status: "retired", owner: "Priya Nair", channels: [],
          sources: [], served: 0, spark: [], updated: "2026-05-19",
        }} />) },
      { id: "loading", label: "Loading", node: <AnswerCard loading /> },
      { id: "overflow", label: "Overflow: long title, unbreakable string, many sources", node: (
        <AnswerCard answer={{
          id: 4, question: `${LONG}?`,
          answer: `${LONG}. The canonical identifier is ${HUGE} and it must never wrap.`,
          status: "approved", owner: "Aleksandra Konstantinopoulou-Whitfield",
          channels: ["slack-bot", "support-widget", "docs-site"],
          sources: [
            { source: "docs", title: LONG }, { source: "notion", title: HUGE },
            { source: "github", title: "acme/handbook" }, { source: "slack", title: "#engineering" },
          ],
          served: 1284000, spark: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18], updated: "2026-07-16",
        }} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <AnswerCard /> },
    ],
  },
  {
    id: "AnswersHarvestWizard", title: "AnswersHarvestWizard", width: OVERLAY_W,
    states: [
      { id: "closed", label: "Trigger only (closed)", width: 520, node: <AnswersHarvestWizard /> },
      { id: "sources", label: "Step 1: sources", node: <Stage><AnswersHarvestWizard defaultOpen /></Stage> },
      { id: "loading", label: "Loading", width: 520, node: <AnswersHarvestWizard loading /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <AnswersHarvestWizard /> },
    ],
  },
  {
    id: "SourcesConnectorCard", title: "SourcesConnectorCard", width: 1100,
    states: [
      { id: "default", label: "Default grid (every tier and state)", node: <SourcesConnectorCard /> },
      { id: "loading", label: "Loading", node: <SourcesConnectorCard loading /> },
      { id: "empty", label: "Empty", node: <SourcesConnectorCard sources={[]} /> },
      { id: "error", label: "Every source failed", node: (
        <SourcesConnectorCard sources={[
          { id: "a", provider: "confluence", name: "Confluence · Ops", tier: "live", state: "failed",
            docCount: 512, chunkCount: 3100, embeddedCount: 2870, lastSyncAt: "2026-07-20T22:15:00",
            lastError: "GET /rest/api/content returned 401, the token expired." },
          { id: "b", provider: "jira", name: "Jira · PLAT", tier: "live", state: "failed",
            docCount: 88, lastSyncAt: "2026-07-20T21:02:00", lastError: "Rate limited by the provider." },
        ]} />) },
      { id: "paused", label: "Paused / disconnected", node: (
        <SourcesConnectorCard sources={[
          { id: "web", provider: "website", name: "docs.acme.com", tier: "legacy", state: "paused",
            docsCount: 143, lastSyncAt: "2026-07-19T18:02:00" },
          { id: "gd", provider: "gdrive", name: "Google Drive · Design", tier: "actionless", state: "healthy",
            docsCount: 88, lastSyncAt: null },
        ]} />) },
      { id: "overflow", label: "Overflow: long names, unbreakable string, many cards", node: (
        <SourcesConnectorCard sources={Array.from({ length: 9 }, (_, i) => ({
          id: `s${i}`, provider: ["github", "slack", "notion", "confluence", "jira", "linear"][i % 6],
          name: i % 2 === 0 ? `${LONG} ${i}` : HUGE,
          tier: "live" as const, state: (i % 3 === 0 ? "running" : i % 3 === 1 ? "healthy" : "failed") as const,
          phase: "embedding", done: 340, total: 512,
          docCount: 1284000, chunkCount: 8912000, embeddedCount: 8340000,
          lastSyncAt: "2026-07-21T14:12:00", lastError: HUGE,
        }))} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SourcesConnectorCard /> },
    ],
  },
  {
    id: "SourcesConnectorWizard", title: "SourcesConnectorWizard", width: OVERLAY_W,
    states: [
      { id: "closed", label: "Trigger only (closed)", width: 520, node: <SourcesConnectorWizard defaultOpen={false} /> },
      { id: "choose", label: "Step 1: choose a source", node: <Stage><SourcesConnectorWizard /></Stage> },
      { id: "loading", label: "Loading", width: 520, node: <SourcesConnectorWizard loading /> },
      { id: "empty", label: "Empty catalog", node: <Stage><SourcesConnectorWizard providers={[]} /></Stage> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SourcesConnectorWizard defaultOpen={false} /> },
    ],
  },
  {
    id: "SourcesSyncStatus", title: "SourcesSyncStatus", width: 820,
    states: [
      { id: "default", label: "Running (animation frozen)", node: <SourcesSyncStatus animate={false} /> },
      { id: "stuck", label: "Stuck (ERRORS[\"sync.stuck\"] + pause)", node: <SourcesSyncStatus animate={false} stuck /> },
      { id: "loading", label: "Loading", node: <SourcesSyncStatus loading /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SourcesSyncStatus animate={false} /> },
    ],
  },
  {
    id: "SourcesBots", title: "SourcesBots", width: OVERLAY_W,
    states: [
      { id: "default", label: "Both cards, configured", width: 900, node: <SourcesBots defaultOpen={null} /> },
      { id: "notsetup", label: "Not set up / waiting", width: 900, node: (
        <SourcesBots defaultOpen={null} slack={{ configured: false }} github={{ webhookConfigured: false, repos: [] }} />) },
      { id: "error", label: "Slack error state", width: 900, node: (
        <SourcesBots defaultOpen={null} slack={{ configured: true, teamName: "Acme HQ", lastError: "auth.test returned invalid_auth." }} />) },
      { id: "slack-drawer", label: "Slack setup drawer", node: <Stage><SourcesBots defaultOpen="slack" /></Stage> },
      { id: "github-drawer", label: "GitHub webhook drawer", node: <Stage><SourcesBots defaultOpen="github" /></Stage> },
      { id: "loading", label: "Loading", width: 900, node: <SourcesBots loading /> },
      { id: "overflow", label: "Overflow: long workspace, many repos", width: 900, node: (
        <SourcesBots defaultOpen={null}
          slack={{ configured: true, teamName: LONG, lastEventAt: "2026-07-21T13:58:00" }}
          github={{ webhookConfigured: true, lastDeliveryAt: "2026-07-21T13:00:00",
            repos: [...Array.from({ length: 10 }, (_, i) => `acme/repository-with-a-rather-long-name-${i}`), HUGE] }} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <SourcesBots defaultOpen={null} /> },
    ],
  },
  {
    id: "WelcomeGenericConnect", title: "WelcomeGenericConnect", width: OVERLAY_W,
    states: [
      { id: "closed", label: "Trigger only (closed)", width: 520, node: <WelcomeGenericConnect defaultOpen={false} /> },
      { id: "slack", label: "Slack credential drawer", node: <Stage><WelcomeGenericConnect /></Stage> },
      { id: "notion", label: "Notion variant", node: (
        <Stage><WelcomeGenericConnect providerKey="notion" providerName="Notion"
          blurb="Sync pages from a Notion database."
          fields={[{ key: "token", label: "Internal integration token", secret: true, placeholder: "secret_…" },
                   { key: "database_id", label: "Database ID", placeholder: "8a5f…" }]} /></Stage>) },
      { id: "loading", label: "Loading", width: 520, node: <WelcomeGenericConnect loading /> },
      { id: "empty", label: "No credential fields", node: <Stage><WelcomeGenericConnect fields={[]} /></Stage> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeGenericConnect defaultOpen={false} /> },
    ],
  },
  {
    id: "WelcomeGithubConnect", title: "WelcomeGithubConnect", width: OVERLAY_W,
    states: [
      { id: "closed", label: "Trigger only (closed)", width: 520, node: <WelcomeGithubConnect defaultOpen={false} /> },
      { id: "picker", label: "Repo picker drawer", node: <Stage><WelcomeGithubConnect /></Stage> },
      { id: "empty", label: "No repositories in scope", node: <Stage><WelcomeGithubConnect repos={[]} /></Stage> },
      { id: "loading", label: "Loading", width: 520, node: <WelcomeGithubConnect loading /> },
      { id: "overflow", label: "Overflow: long repo names, many rows", node: (
        <Stage><WelcomeGithubConnect repos={Array.from({ length: 12 }, (_, i) => ({
          fullName: i % 3 === 0 ? HUGE : `acme/${LONG.toLowerCase().replace(/\s+/g, "-")}-${i}`,
          description: LONG, private: i % 2 === 0, defaultBranch: "main", connected: i === 1,
        }))} /></Stage>) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeGithubConnect defaultOpen={false} /> },
    ],
  },
  {
    id: "WelcomeGlossaryStep", title: "WelcomeGlossaryStep", width: 720,
    states: [
      { id: "start", label: "Start", node: <WelcomeGlossaryStep /> },
      { id: "review", label: "Review candidates", node: <WelcomeGlossaryStep defaultMode="review" /> },
      { id: "loading", label: "Loading", node: <WelcomeGlossaryStep loading /> },
      { id: "empty", label: "No candidates", node: <WelcomeGlossaryStep defaultMode="review" candidates={[]} /> },
      { id: "fallback", label: "Deterministic fallback warning", node: <WelcomeGlossaryStep defaultMode="review" llm={false} /> },
      { id: "overflow", label: "Overflow: long terms, many candidates", node: (
        <WelcomeGlossaryStep defaultMode="review" candidates={Array.from({ length: 14 }, (_, i) => ({
          term: i % 3 === 0 ? HUGE : `${LONG} ${i}`,
          definition: LONG, evidence: `architecture/very/deep/path/to/${HUGE}.md`,
        }))} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeGlossaryStep /> },
    ],
  },
  {
    id: "WelcomeGuideStep", title: "WelcomeGuideStep", width: 720,
    states: [
      { id: "default", label: "Default (plain selected)", node: <WelcomeGuideStep /> },
      { id: "scratch", label: "Start from scratch selected", node: <WelcomeGuideStep guide="scratch" /> },
      { id: "saving", label: "Saving (disabled)", node: <WelcomeGuideStep saving /> },
      { id: "loading", label: "Loading", node: <WelcomeGuideStep loading /> },
      { id: "empty", label: "No packs", node: <WelcomeGuideStep packs={[]} /> },
      { id: "overflow", label: "Overflow: long names, many packs", node: (
        <WelcomeGuideStep packs={Array.from({ length: 10 }, (_, i) => ({
          id: `p${i}`, name: i % 3 === 0 ? HUGE : `${LONG} ${i}`, description: LONG, rules: 1284,
        }))} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeGuideStep /> },
    ],
  },
  {
    id: "WelcomeSyncPanel", title: "WelcomeSyncPanel", width: 820,
    states: [
      { id: "default", label: "All four states", node: <WelcomeSyncPanel /> },
      { id: "loading", label: "Loading", node: <WelcomeSyncPanel loading /> },
      { id: "empty", label: "Empty", node: <WelcomeSyncPanel sources={[]} /> },
      { id: "error", label: "Every source failed", node: (
        <WelcomeSyncPanel sources={[
          { id: "a", name: "Confluence · Ops", state: "error", error: "GET /rest/api/content returned 401, the token expired." },
          { id: "b", name: "Jira · PLAT", state: "error", error: "Rate limited by the provider." },
        ]} />) },
      { id: "overflow", label: "Overflow: long names, many rows", node: (
        <WelcomeSyncPanel sources={Array.from({ length: 10 }, (_, i) => ({
          id: `s${i}`, name: i % 3 === 0 ? HUGE : `${LONG} ${i}`,
          state: (["syncing", "done", "queued", "error"] as const)[i % 4],
          phase: "Embedding", done: 340, total: 512,
          docCount: 1284000, chunkCount: 8912000, embeddedCount: 8340000, error: HUGE,
        }))} />) },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeSyncPanel /> },
    ],
  },
  {
    id: "WelcomeUploadConnect", title: "WelcomeUploadConnect", width: OVERLAY_W,
    states: [
      { id: "closed", label: "Trigger only (closed)", width: 520, node: <WelcomeUploadConnect defaultOpen={false} /> },
      { id: "dropzone", label: "Upload drawer", node: <Stage><WelcomeUploadConnect /></Stage> },
      { id: "loading", label: "Loading", width: 520, node: <WelcomeUploadConnect loading /> },
      { id: "narrow", label: "Narrow frame (320)", width: 320, node: <WelcomeUploadConnect defaultOpen={false} /> },
    ],
  },
];
