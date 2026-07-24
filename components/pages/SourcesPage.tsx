import { useState, type ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Layers, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink, UploadCloud, FileText } from "lucide-react";
import { card } from "../tokens/card";
import { PageHeader } from "../layout/PageHeader";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { Stepper } from "../data-display/Stepper";
import { IconRing } from "../data-display/IconRing";
import { Chip } from "../data-display/Chip";
import { PropertyList } from "../data-display/PropertyList";
import { Button } from "../actions/Button";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { SectionLabel } from "../forms/SectionLabel";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark } from "../icons/marks";
import { SourcesConnectorCard, type Source } from "../features/SourcesConnectorCard";
import { SourcesConnectorWizard, type WizardProviderSpec } from "../features/SourcesConnectorWizard";
import { SourcesSyncStatus, PhaseTracker } from "../features/SourcesSyncStatus";
import { SourcesBots, type GithubStatus, type SlackStatus } from "../features/SourcesBots";
import { Truncate } from "../data-display/Truncate";
import type { PropertyItem } from "../data-display/PropertyList";

/* Sources & connectors (pages/sources.md). Settings → Sources: the hub for
   bringing every product conversation into one trusted library. Two tabs —
   Connectors (source cards + live ingestion status + the Add-source wizard)
   and Bots (Slack + GitHub setup).

   Beyond the grid, this page enumerates a full inline connect *workflow* per
   provider — choose → configure credentials → syncing → done — composed
   directly in the page body (provider header, credential Fields, a live
   SyncPanel) rather than a portalled dialog, so a static screenshot reads the
   whole flow. States: connect-<provider>-configure / -sync / -done.

   Pure presenter: the connector catalog, the connected sources, the connect
   flow's credential fields, the first-sync row and the bot statuses all arrive
   in `data`. Brand marks are derived from the provider key, never carried in
   the data. "No sources connected" is derived from the source list. */

type Tab = "connectors" | "bots";

const TAB_OPTIONS: TabOption<Tab>[] = [
  { id: "connectors", label: "Connectors" },
  { id: "bots", label: "Bots" },
];

/* ── §11 page grid ─────────────────────────────────────────────────────────
   Same container and main/rail split as the five Settings tabs, so the outer
   border does not move when you cross from Sources into Settings. */
const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";
const FORM_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function SplitBody({ mobile, rail, children }: { mobile: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className={mobile ? "flex flex-col gap-5" : SPLIT[320]}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

/* ── Inline connect flow ───────────────────────────────────────────────────
   Credential fields come in already filled so the configure screenshot reads
   populated; the sync counts feed the SyncPanel step. */

/** One credential field on the configure step. */
export type ConnField = { label: string; value: string; secret?: boolean; help?: string; multiline?: boolean };

/** The provider being connected, and what its first sync will report. */
export type Connector = {
  /** Provider key: also selects the brand mark. */
  key: string;
  name: string;
  blurb: string;
  docsUrl?: string;
  detail: string;
  fields: ConnField[];
  /** File-upload connector: no credentials, a drop zone instead. */
  upload?: boolean;
  sync: { done: number; total: number; docCount: number; chunkCount: number; embeddedCount: number };
};

/** Which screen of Sources is on. An app drives it from its own route. */
export type SourcesView = "grid" | "wizard" | "bots" | "connect" | "sync-status";
/** Step of the inline per-provider connect flow. */
export type ConnectPhase = "configure" | "sync" | "done";
/** State of the standalone first-sync row. */
export type SyncPhase = "queued" | "syncing" | "done" | "error";

/** The one source the first-sync panel is reporting on. */
export type FirstSync = {
  /** Provider key, which selects the brand mark. */
  provider: string;
  name: string;
  phase: string;
  done: number;
  total: number;
  docCount: number;
  chunkCount: number;
  embeddedCount: number;
  lastSyncAt: string;
  error: string;
};

/** Everything Sources renders. */
export type SourcesData = {
  view: SourcesView;
  /** Connectors already wired up. */
  sources: Source[];
  /** Catalog the Add-source wizard offers. */
  catalog: WizardProviderSpec[];
  /** `connect` view: the provider being set up and how far it has got. */
  connector: Connector | null;
  connectPhase: ConnectPhase;
  /** Files chosen for the upload connector. */
  uploadFiles: string[];
  /** `sync-status` view. */
  syncPhase: SyncPhase;
  firstSync: FirstSync;
  /** Bots tab. */
  slack: SlackStatus;
  github: GithubStatus;
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
};

function DocsLink({ c }: { c: Connector }) {
  if (!c.docsUrl) return null;
  return (
    <a className="inline-flex items-center gap-1 text-[12px] text-biscay-2 hover:underline" href={c.docsUrl} target="_blank" rel="noreferrer">
      {c.name} setup docs <ExternalLink size={11} />
    </a>
  );
}

function ConfigureBody({ c, uploadFiles }: { c: Connector; uploadFiles: string[] }) {
  if (c.upload) {
    return (
      <div>
        <div className="grid place-items-center gap-2 rounded-md border border-dashed border-ink/25 bg-ink/[0.015] px-4 py-8 text-center">
          <span className="text-ink/65"><UploadCloud size={30} /></span>
          <p className="text-[13px] text-ink/70">Drag files here, or <span className="text-biscay-2">browse</span></p>
          <p className="font-term text-[11px] text-ink/65">PDF · Markdown · Word · text · up to 50 MB each</p>
        </div>
        <div className="mt-3">
          <SectionLabel>Selected files — {uploadFiles.length}</SectionLabel>
          <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {uploadFiles.map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-[4px] border border-ink/12 px-2.5 py-1.5 text-[12.5px] text-ink/80">
                <FileText size={13} className="text-ink/65" /> {f}
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
      <div className={`mt-3 ${FORM_GRID}`}>
        {c.fields.map((f) => (
          <Field key={f.label} label={f.label}>
            {f.multiline ? (
              <Textarea rows={4} className="w-full font-term text-[12px]" readOnly value={f.value} />
            ) : (
              <Input className="w-full font-term" type={f.secret ? "password" : "text"} readOnly value={f.value} />
            )}
            {f.help && <p className="mt-1 text-[11.5px] text-ink/65">{f.help}</p>}
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

function ConnectFlow({ c, phase, uploadFiles }: { c: Connector; phase: ConnectPhase; uploadFiles: string[] }) {
  const stepIdx = phase === "configure" ? 1 : 2;
  const configuring = phase === "configure";
  return (
    <div className="min-w-0">
      <div className={`${card} p-5`}>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <IconRing size={42}><SourceMark provider={c.key} size={22} /></IconRing>
          <div className="min-w-0 flex-1 basis-[14rem]">
            <Truncate as="h3" className="text-[16px] font-semibold text-ink" title={`Connect ${c.name}`}>Connect {c.name}</Truncate>
            <Truncate className="text-[12.5px] text-ink/60">{c.blurb}</Truncate>
          </div>
          <Chip className="ml-auto" label={configuring ? "Step 2 of 3" : phase === "done" ? "Synced" : "Syncing"} tone={phase === "done" ? "ok" : configuring ? "neutral" : "info"} dot />
        </div>

        <div className="mt-5"><Stepper labels={["Choose source", "Configure", "Sync"]} current={stepIdx} ariaLabel="Connector setup progress" /></div>

        <div className="mt-5 min-h-[200px]">
          {/* Phase tracker lives in the 320px rail (§11) so the panel below can
              run the full width of the main column. */}
          {configuring ? <ConfigureBody c={c} uploadFiles={uploadFiles} /> : <SyncPanel sources={[connectorSyncSource(c, phase)]} />}
        </div>

        {/* Primary bottom LEFT, secondaries to its right (§2). */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
          {configuring ? (
            <>
              <Button variant="primary">Connect &amp; sync <ArrowRight size={14} /></Button>
              <Button><ShieldCheck size={13} /> Test connection</Button>
            </>
          ) : phase === "done" ? (
            <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
          ) : null}
          <Button disabled={configuring}>Back</Button>
          {!configuring && phase !== "done" && (
            <span className="text-[12px] text-ink/65">Sync continues in the background.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Standalone sync-status phases ─────────────────────────────────────────*/
function syncPhaseSource(f: FirstSync, phase: SyncPhase): SyncSource {
  /* The brand mark is built here from the provider key: the data stays plain
     JSON, exactly as an API would return it. */
  const base = { id: f.provider, name: f.name, mark: <SourceMark provider={f.provider} size={24} /> } as const;
  switch (phase) {
    case "queued": return { ...base, state: "queued" };
    case "syncing": return { ...base, state: "syncing", phase: f.phase, done: f.done, total: f.total, chunkCount: f.chunkCount, embeddedCount: f.embeddedCount };
    case "done": return { ...base, state: "done", docCount: f.docCount, chunkCount: f.chunkCount, embeddedCount: f.chunkCount, lastSyncAt: f.lastSyncAt };
    case "error": return { ...base, state: "error", error: f.error };
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

/* Supporting rail (§11, 320px). Same shape as the Settings rails: one
   read-only summary card plus one explanatory card. The connect and first-sync
   states swap the summary for the live phase tracker, which is what used to
   sit above the panel and force a half-width body. */
function SourcesRail({ data }: { data: SourcesData }) {
  const connect = data.view === "connect" && data.connector !== null;
  const syncing = data.view === "sync-status";

  if (connect || syncing) {
    const current = connect
      ? (data.connectPhase === "configure" ? 0 : data.connectPhase === "done" ? 5 : 3)
      : data.syncPhase === "queued" ? 0 : data.syncPhase === "done" ? 5 : 2;
    return (
      <>
        <div className={`${card} p-4`}>
          <SectionLabel>{connect ? "Sync phases" : "First-sync status"}</SectionLabel>
          <div className="mt-3"><PhaseTracker current={current} failed={data.syncPhase === "error" && syncing} /></div>
        </div>
        <div className={`${card} p-4`}>
          <SectionLabel>What happens next</SectionLabel>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">
            Sync runs on the server. Documents are fetched, chunked, embedded,
            and indexed; unchanged chunks are skipped by content hash.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`${card} p-4`}>
        <SectionLabel>At a glance</SectionLabel>
        <PropertyList className="mt-3" items={data.summary} />
      </div>
      <div className={`${card} p-4`}>
        <SectionLabel>Credentials</SectionLabel>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">
          Tokens are stored server-side and never shown again. Read-only scopes
          are enough for every connector here.
        </p>
      </div>
    </>
  );
}

/** A workspace with nothing connected at all. Derived from the data. */
function isEmpty(d: SourcesData): boolean {
  return d.sources.length === 0 && d.connector === null && d.view === "grid";
}

function Body({ data, error, tab }: { data: SourcesData; error: string | null; tab: Tab }): ReactNode {
  if (error) return <EmptyState title="API offline">{error}</EmptyState>;
  if (isEmpty(data)) return <EmptyState title="No sources connected yet">Connect GitHub or another source to start building your knowledge base.</EmptyState>;

  if (data.view === "connect" && data.connector) {
    return <ConnectFlow c={data.connector} phase={data.connectPhase} uploadFiles={data.uploadFiles} />;
  }
  if (data.view === "sync-status") {
    return <SyncPanel sources={[syncPhaseSource(data.firstSync, data.syncPhase)]} onRetry={() => {}} />;
  }
  if (data.view === "bots" || tab === "bots") {
    return <SourcesBots defaultOpen={null} slack={data.slack} github={data.github} />;
  }

  // grid / wizard → connectors grid
  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <SourcesConnectorWizard defaultOpen={data.view === "wizard"} providers={data.catalog} />
      </div>
      <SourcesConnectorCard sources={data.sources} />
      <SourcesSyncStatus animate={false} />
    </div>
  );
}

function SourcesPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<SourcesData>) {
  const [tab, setTab] = useState<Tab>(data.view === "bots" ? "bots" : "connectors");
  const pinned = data.view === "connect" || data.view === "sync-status";
  const bare = error !== null || isEmpty(data);

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("sources")} title="Sources & connectors" mobile={mobile}>
        <SkeletonPage variant="gallery" />
      </PageFrame>
    );
  }

  return (
    <PageFrame active={navFor("sources")} title="Sources & connectors" mobile={mobile}>
      <div className={PAGE}>
        <PageHeader
          eyebrow="Settings"
          title="Sources & connectors"
          description="Bring every product conversation into one trusted library."
          icon={<span className="text-moss"><Layers size={24} /></span>}
        />
        {!bare && (
          <div className="mt-5">
            <Tabs<Tab> ariaLabel="Sources sections" variant="underline" options={TAB_OPTIONS} value={pinned ? "connectors" : tab} onChange={setTab} />
          </div>
        )}
        <div className="mt-6">
          <SplitBody mobile={mobile} rail={<SourcesRail data={data} />}>
            <Body data={data} error={error} tab={tab} />
          </SplitBody>
        </div>
      </div>
    </PageFrame>
  );
}

export const page: PageModule<SourcesData> = {
  id: "sources",
  title: "Sources & connectors",
  route: "/sources",
  component: SourcesPage,
  states: STATES.map((s) => ({ ...s })),
};
