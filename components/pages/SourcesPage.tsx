import { useState, type ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Layers, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, UploadCloud, FileText } from "lucide-react";
import { card } from "../tokens/card";
import { PageHeader } from "../layout/PageHeader";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { Stepper } from "../data-display/Stepper";
import { IconRing } from "../data-display/IconRing";
import { Chip } from "../data-display/Chip";
import { Button } from "../actions/Button";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { SectionLabel } from "../forms/SectionLabel";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark } from "../icons/marks";
import { SourcesConnectorCard } from "../features/SourcesConnectorCard";
import { SourcesConnectorWizard } from "../features/SourcesConnectorWizard";
import { SourcesSyncStatus, PhaseTracker } from "../features/SourcesSyncStatus";
import { SourcesBots } from "../features/SourcesBots";
import { Avatar } from "../data-display/Avatar";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_DOC_TITLE, LONG_URL,
  UNBREAKABLE, LONG_WORD, HUGE_NUMBER, MIXED_SCRIPT, MANY_INITIALS,
} from "./stress";

/* Sources & connectors (pages/sources.md). Settings → Sources: the hub for
   bringing every product conversation into one trusted library. Two tabs —
   Connectors (source cards + live ingestion status + the Add-source wizard)
   and Bots (Slack + GitHub setup).

   Beyond the grid, this page enumerates a full inline connect *workflow* per
   provider — choose → configure credentials → syncing → done — composed
   directly in the page body (provider header, credential Fields, a live
   SyncPanel) rather than a portalled dialog, so a static screenshot reads the
   whole flow. States: connect-<provider>-configure / -sync / -done. */

type Tab = "connectors" | "bots";

const TAB_OPTIONS: TabOption<Tab>[] = [
  { id: "connectors", label: "Connectors" },
  { id: "bots", label: "Bots" },
];

/* ── Inline connector catalog ──────────────────────────────────────────────
   Sample-filled credential fields so the configure screenshot reads populated;
   sync/done counts feed the SyncPanel step. */
type ConnField = { label: string; value: string; secret?: boolean; help?: string; multiline?: boolean };
type Connector = {
  key: string;
  name: string;
  blurb: string;
  docsUrl?: string;
  detail: string;
  fields: ConnField[];
  upload?: boolean;
  sync: { done: number; total: number; docCount: number; chunkCount: number; embeddedCount: number };
};

const CONNECTORS: Record<string, Connector> = {
  github: {
    key: "github", name: "GitHub", blurb: "Sync Markdown docs from a repository, read-only.",
    docsUrl: "https://docs.github.com/authentication", detail: "acme/handbook",
    fields: [
      { label: "Repository", value: "acme/handbook", help: "owner/name of a repo your token can read." },
      { label: "Access token", value: "ghp_R8xQ2v••••••••••••••", secret: true },
      { label: "Paths filter (glob)", value: "**/*.md" },
    ],
    sync: { done: 340, total: 512, docCount: 1284, chunkCount: 8912, embeddedCount: 8340 },
  },
  slack: {
    key: "slack", name: "Slack", blurb: "Import channel history into your knowledge library.",
    detail: "#engineering",
    fields: [
      { label: "Bot token", value: "xoxb-2481••••••••••••", secret: true, help: "Needs channels:history + channels:read." },
      { label: "Channel", value: "#engineering" },
    ],
    sync: { done: 210, total: 480, docCount: 4210, chunkCount: 15330, embeddedCount: 12040 },
  },
  notion: {
    key: "notion", name: "Notion", blurb: "Sync pages from a Notion database.",
    detail: "Product wiki",
    fields: [
      { label: "Internal integration token", value: "secret_9Fa2••••••••", secret: true },
      { label: "Database ID", value: "8a5f0e2c-91d4-4b77-a1e2-6f3c" },
    ],
    sync: { done: 88, total: 240, docCount: 620, chunkCount: 3120, embeddedCount: 2140 },
  },
  gdrive: {
    key: "gdrive", name: "Google Drive", blurb: "Index docs from a shared Drive folder.",
    detail: "Design",
    fields: [
      { label: "Service account JSON", value: '{ "type": "service_account", "project_id": "acme-docs", "private_key_id": "a1b2c3" … }', secret: true, multiline: true },
      { label: "Folder ID", value: "1a2B3c4D5e6F7g8H9i0J" },
    ],
    sync: { done: 44, total: 120, docCount: 340, chunkCount: 1980, embeddedCount: 1120 },
  },
  confluence: {
    key: "confluence", name: "Confluence", blurb: "Index spaces and pages from Confluence Cloud.",
    detail: "Ops space",
    fields: [
      { label: "Base URL", value: "https://acme.atlassian.net/wiki" },
      { label: "Email", value: "dana@acme.com" },
      { label: "API token", value: "ATATT3xFfGF0••••••••", secret: true },
    ],
    sync: { done: 160, total: 512, docCount: 512, chunkCount: 3100, embeddedCount: 2870 },
  },
  jira: {
    key: "jira", name: "Jira", blurb: "Sync issues and comments from a Jira project.",
    detail: "PLAT project",
    fields: [
      { label: "Base URL", value: "https://acme.atlassian.net" },
      { label: "Email", value: "dana@acme.com" },
      { label: "API token", value: "ATATT3xFfGF0••••••••", secret: true },
      { label: "Project key", value: "PLAT" },
    ],
    sync: { done: 96, total: 320, docCount: 780, chunkCount: 4200, embeddedCount: 3010 },
  },
  linear: {
    key: "linear", name: "Linear", blurb: "Index issues and docs from Linear.",
    detail: "Engineering team",
    fields: [
      { label: "API key", value: "lin_api_9Xa2••••••••", secret: true },
      { label: "Team", value: "Engineering" },
    ],
    sync: { done: 120, total: 260, docCount: 430, chunkCount: 1740, embeddedCount: 1290 },
  },
  upload: {
    key: "upload", name: "Upload", blurb: "Drop files to index them directly — no credentials needed.",
    detail: "6 files", upload: true, fields: [],
    sync: { done: 4, total: 6, docCount: 6, chunkCount: 210, embeddedCount: 140 },
  },
};

const UPLOAD_FILES = [
  "product-brief.pdf", "pricing-2026.md", "security-overview.docx",
  "onboarding-runbook.md", "faq.md", "architecture.pdf",
];

function DocsLink({ c }: { c: Connector }) {
  if (!c.docsUrl) return null;
  return (
    <a className="inline-flex items-center gap-1 text-[12px] text-biscay-2 hover:underline" href={c.docsUrl} target="_blank" rel="noreferrer">
      {c.name} setup docs <ExternalLink size={11} />
    </a>
  );
}

function ConfigureBody({ c }: { c: Connector }) {
  if (c.upload) {
    return (
      <div>
        <div className="grid place-items-center gap-2 rounded-md border border-dashed border-ink/25 bg-ink/[0.015] px-4 py-8 text-center">
          <span className="text-ink/40"><UploadCloud size={30} /></span>
          <p className="text-[13px] text-ink/70">Drag files here, or <span className="text-biscay-2">browse</span></p>
          <p className="font-term text-[11px] text-ink/45">PDF · Markdown · Word · text · up to 50 MB each</p>
        </div>
        <div className="mt-3">
          <SectionLabel>Selected files — {UPLOAD_FILES.length}</SectionLabel>
          <ul className="mt-1.5 grid gap-1">
            {UPLOAD_FILES.map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-[4px] border border-ink/12 px-2.5 py-1.5 text-[12.5px] text-ink/80">
                <FileText size={13} className="text-ink/45" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1 text-[13px] text-ink/70">{c.blurb} Credentials stay on the server and are never shown again.</p>
      <DocsLink c={c} />
      <div className="mt-2 grid gap-1">
        {c.fields.map((f) => (
          <Field key={f.label} label={f.label}>
            {f.multiline ? (
              <Textarea rows={4} className="w-full font-term text-[12px]" readOnly value={f.value} />
            ) : (
              <Input className="w-full font-term" type={f.secret ? "password" : "text"} readOnly value={f.value} />
            )}
            {f.help && <p className="mt-1 text-[11.5px] text-ink/55">{f.help}</p>}
          </Field>
        ))}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-moss">
        <CheckCircle2 size={14} /> Connection OK — credentials verified.
      </div>
    </div>
  );
}

function connectorSyncSource(c: Connector, phase: "sync" | "done"): SyncSource {
  const base = { id: c.key, name: `${c.name} · ${c.detail}`, mark: <SourceMark provider={c.key} size={24} /> } as const;
  if (phase === "done") {
    return {
      ...base, state: "done",
      docCount: c.sync.docCount, chunkCount: c.sync.chunkCount, embeddedCount: c.sync.chunkCount,
      lastSyncAt: "2026-07-21T14:12:00",
    };
  }
  return {
    ...base, state: "syncing", phase: "Embedding",
    done: c.sync.done, total: c.sync.total,
    chunkCount: c.sync.chunkCount, embeddedCount: c.sync.embeddedCount,
  };
}

function ConnectFlow({ c, phase }: { c: Connector; phase: "configure" | "sync" | "done" }) {
  const stepIdx = phase === "configure" ? 1 : 2;
  const configuring = phase === "configure";
  return (
    <div className="mx-auto max-w-2xl">
      <div className={`${card} p-5`}>
        <div className="flex items-center gap-3">
          <IconRing size={42}><SourceMark provider={c.key} size={22} /></IconRing>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-ink">Connect {c.name}</h3>
            <p className="truncate text-[12.5px] text-ink/60">{c.blurb}</p>
          </div>
          <Chip className="ml-auto" label={configuring ? "Step 2 of 3" : phase === "done" ? "Synced" : "Syncing"} tone={phase === "done" ? "ok" : configuring ? "neutral" : "info"} dot />
        </div>

        <div className="mt-5"><Stepper labels={["Choose source", "Configure", "Sync"]} current={stepIdx} ariaLabel="Connector setup progress" /></div>

        <div className="mt-5 min-h-[200px]">
          {configuring ? (
            <ConfigureBody c={c} />
          ) : (
            <div className="grid gap-3">
              <div className={`${card} p-4`}>
                <SectionLabel>Sync phases</SectionLabel>
                <div className="mt-3"><PhaseTracker current={phase === "done" ? 5 : 3} /></div>
              </div>
              <SyncPanel sources={[connectorSyncSource(c, phase)]} />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-ink/10 pt-4">
          <Button disabled={configuring}>Back</Button>
          {configuring ? (
            <span className="flex items-center gap-2">
              <Button><ShieldCheck size={13} /> Test connection</Button>
              <Button variant="primary">Connect &amp; sync <ArrowRight size={14} /></Button>
            </span>
          ) : phase === "done" ? (
            <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
          ) : (
            <span className="text-[12px] text-ink/55">Sync continues in the background.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Standalone sync-status phases ─────────────────────────────────────────*/
function syncPhaseSource(phase: "queued" | "syncing" | "done" | "error"): SyncSource {
  const base = { id: "gh", name: "GitHub · acme/handbook", mark: <SourceMark provider="github" size={24} /> } as const;
  switch (phase) {
    case "queued": return { ...base, state: "queued" };
    case "syncing": return { ...base, state: "syncing", phase: "Chunking", done: 180, total: 512, chunkCount: 8912, embeddedCount: 3100 };
    case "done": return { ...base, state: "done", docCount: 500, chunkCount: 8912, embeddedCount: 8912, lastSyncAt: "2026-07-21T14:12:00" };
    case "error": return { ...base, state: "error", error: "GET /repos/acme/handbook returned 401 — the token expired or was revoked." };
  }
}

const STATES = [
  { id: "default", label: "Default · Connectors grid" },
  { id: "bots", label: "Bots · Slack + webhook" },
  { id: "adding", label: "Add-source wizard" },
  // First-sync status phases
  { id: "sync-queued", label: "Sync · Queued" },
  { id: "sync-syncing", label: "Sync · Syncing" },
  { id: "sync-done", label: "Sync · Done" },
  { id: "sync-error", label: "Sync · Error" },
  // Per-connector inline workflows
  { id: "connect-github-configure", label: "GitHub · Configure" },
  { id: "connect-github-sync", label: "GitHub · Syncing" },
  { id: "connect-github-done", label: "GitHub · Done" },
  { id: "connect-slack-configure", label: "Slack · Configure" },
  { id: "connect-slack-sync", label: "Slack · Syncing" },
  { id: "connect-notion-configure", label: "Notion · Configure" },
  { id: "connect-notion-sync", label: "Notion · Syncing" },
  { id: "connect-gdrive-configure", label: "Google Drive · Configure" },
  { id: "connect-gdrive-sync", label: "Google Drive · Syncing" },
  { id: "connect-confluence-configure", label: "Confluence · Configure" },
  { id: "connect-confluence-sync", label: "Confluence · Syncing" },
  { id: "connect-jira-configure", label: "Jira · Configure" },
  { id: "connect-jira-sync", label: "Jira · Syncing" },
  { id: "connect-linear-configure", label: "Linear · Configure" },
  { id: "connect-linear-sync", label: "Linear · Syncing" },
  { id: "connect-upload-configure", label: "Upload · Choose files" },
  { id: "connect-upload-sync", label: "Upload · Processing" },
  // Shared
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No sources connected" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* ── Overflow / stress fixtures (see pages/stress.ts) ───────────────────────
   Long connector names + the credential token/URL fields are the prime
   horizontal-overflow cases here. Injected via data props into the real
   connector grid, the SyncPanel row, and an inline connect flow. */
function SourcesStressBody({ stress }: { stress: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {stress && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {MANY_INITIALS.map((ini, n) => (
              <span key={n} className="rounded-full ring-2 ring-paper"><Avatar initials={ini} /></span>
            ))}
          </div>
          <span className="min-w-0 break-words font-term text-[11px] text-ink/45">{MIXED_SCRIPT}</span>
        </div>
      )}

      <SourcesConnectorCard
        sources={
          stress
            ? [
                { id: "gh", provider: "github", name: UNBREAKABLE, tier: "live", state: "running", phase: "embedding", done: 340, total: 512, docCount: HUGE_NUMBER, chunkCount: HUGE_NUMBER, embeddedCount: HUGE_NUMBER, lastSyncAt: "2026-07-21T14:12:00", bars: [3, 5, 4, 8, 6, 9, 7, 11] },
                { id: "conf", provider: "confluence", name: LONG_WORD, tier: "live", state: "failed", docCount: HUGE_NUMBER, chunkCount: HUGE_NUMBER, embeddedCount: HUGE_NUMBER, lastSyncAt: "2026-07-20T22:15:00", lastError: `${UNBREAKABLE} ${LONG_URL}` },
                { id: "mix", provider: "slack", name: MIXED_SCRIPT, tier: "legacy", state: "healthy", docsCount: HUGE_NUMBER, lastSyncAt: "2026-07-19T18:02:00" },
              ]
            : [
                { id: "gh", provider: "github", name: `GitHub · ${LONG_SOURCE}`, tier: "live", state: "running", phase: "embedding", done: 340, total: 512, docCount: 1284, chunkCount: 8912, embeddedCount: 8340, lastSyncAt: "2026-07-21T14:12:00", bars: [3, 5, 4, 8, 6, 9, 7, 11] },
                { id: "conf", provider: "confluence", name: `Confluence · ${LONG_TITLE}`, tier: "live", state: "failed", docCount: 512, chunkCount: 3100, embeddedCount: 2870, lastSyncAt: "2026-07-20T22:15:00", lastError: LONG_PARAGRAPH },
                { id: "web", provider: "website", name: LONG_DOC_TITLE, tier: "legacy", state: "paused", docsCount: 143, lastSyncAt: "2026-07-19T18:02:00", bars: [4, 3, 5, 2, 4, 3, 4, 3] },
              ]
        }
      />

      <SyncPanel
        sources={[
          stress
            ? { id: "gh", name: MIXED_SCRIPT, mark: <SourceMark provider="github" size={24} />, state: "error", error: `${UNBREAKABLE} ${LONG_URL}` }
            : { id: "gh", name: `GitHub · ${LONG_SOURCE}`, mark: <SourceMark provider="github" size={24} />, state: "syncing", phase: "Embedding chunks across every service, region, and on-call team", done: 340, total: 512, chunkCount: 8912, embeddedCount: 8340 },
        ]}
        onRetry={() => {}}
      />

      <ConnectFlow
        c={
          stress
            ? { key: "github", name: UNBREAKABLE, blurb: MIXED_SCRIPT, detail: LONG_URL, fields: [
                { label: "Base URL", value: LONG_URL },
                { label: "Access token", value: UNBREAKABLE, secret: true, help: LONG_URL },
                { label: "Service account JSON", value: `${MIXED_SCRIPT} ${UNBREAKABLE}`, secret: true, multiline: true },
              ], sync: { done: 340, total: 512, docCount: HUGE_NUMBER, chunkCount: HUGE_NUMBER, embeddedCount: HUGE_NUMBER } }
            : { key: "github", name: LONG_SOURCE, blurb: LONG_PARAGRAPH, docsUrl: LONG_URL, detail: LONG_TITLE, fields: [
                { label: "Repository", value: LONG_SOURCE, help: LONG_PARAGRAPH },
                { label: "Access token", value: "ghp_R8xQ2v••••••••••••••", secret: true },
                { label: "Paths filter (glob)", value: "docs/**/runbooks/**/incident-response/**/*.md" },
              ], sync: { done: 340, total: 512, docCount: 1284, chunkCount: 8912, embeddedCount: 8340 } }
        }
        phase="configure"
      />
    </div>
  );
}

function tabForState(state: string): Tab {
  return state === "bots" ? "bots" : "connectors";
}

/** Parse a connect-<provider>-<phase> state id. */
function parseConnect(state: string): { c: Connector; phase: "configure" | "sync" | "done" } | null {
  if (!state.startsWith("connect-")) return null;
  const rest = state.slice("connect-".length);
  const idx = rest.lastIndexOf("-");
  if (idx < 0) return null;
  const key = rest.slice(0, idx);
  const p = rest.slice(idx + 1);
  const c = CONNECTORS[key];
  if (!c) return null;
  if (p !== "configure" && p !== "sync" && p !== "done") return null;
  return { c, phase: p };
}

function Body({ state, tab }: { state: string; tab: Tab }): ReactNode {
  if (state === "error") return <div className="mt-6"><EmptyState title="API offline">The API didn't answer. If the server is still starting up, retry in a moment.</EmptyState></div>;
  if (state === "empty") return <div className="mt-6"><EmptyState title="No sources connected yet">Connect GitHub or another source to start building your knowledge base.</EmptyState></div>;
  if (state === "overflow" || state === "stress") return <SourcesStressBody stress={state === "stress"} />;

  const connect = parseConnect(state);
  if (connect) return <div className="mt-6"><ConnectFlow c={connect.c} phase={connect.phase} /></div>;

  if (state.startsWith("sync-")) {
    const phase = state.slice("sync-".length) as "queued" | "syncing" | "done" | "error";
    return (
      <div className="mt-6 mx-auto max-w-2xl grid gap-3">
        <div className={`${card} p-4`}>
          <SectionLabel>First-sync status</SectionLabel>
          <div className="mt-3"><PhaseTracker current={phase === "queued" ? 0 : phase === "done" ? 5 : 2} failed={phase === "error"} /></div>
        </div>
        <SyncPanel sources={[syncPhaseSource(phase)]} onRetry={() => {}} />
      </div>
    );
  }

  if (tab === "bots") return <div className="mt-6"><SourcesBots defaultOpen={null} /></div>;

  // default / adding → connectors grid
  return (
    <div className="mt-6 space-y-6">
      <div className="flex justify-end">
        <SourcesConnectorWizard defaultOpen={state === "adding"} />
      </div>
      <SourcesConnectorCard />
      <SourcesSyncStatus animate={false} />
    </div>
  );
}

function SourcesPage({ state = "default", mobile = false }: PageProps) {
  const [tab, setTab] = useState<Tab>(tabForState(state));
  const isConnect = state.startsWith("connect-");
  const isSyncPhase = state.startsWith("sync-");
  const bareState = state === "loading" || state === "error" || state === "empty";
  const showTabs = !bareState;

  if (state === "loading") {
    return (
      <PageFrame active={navFor("sources")} title="Sources & connectors" mobile={mobile}>
        <SkeletonPage variant="gallery" />
      </PageFrame>
    );
  }

  return (
    <PageFrame active={navFor("sources")} title="Sources & connectors" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Settings"
          title="Sources & connectors"
          description="Bring every product conversation into one trusted library."
          icon={<span className="text-moss"><Layers size={24} /></span>}
        />
        {showTabs && (
          <div className="mt-5">
            <Tabs<Tab> ariaLabel="Sources sections" variant="underline" options={TAB_OPTIONS} value={isConnect || isSyncPhase ? "connectors" : tab} onChange={setTab} />
          </div>
        )}
        <Body state={state} tab={tab} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "sources",
  title: "Sources & connectors",
  route: "/sources",
  component: SourcesPage,
  states: STATES.map((s) => ({ ...s })),
};
