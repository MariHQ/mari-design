import { useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Alert } from "../feedback/Alert";
import {
  ConnectorWizard as ConnectorWizardUI,
  type WizardProvider,
  type ConnectTestResult,
} from "../forms/ConnectorWizard";
import { type SyncSource } from "../feedback/SyncPanel";
import { Button } from "../actions/Button";
import { SkeletonButton } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";

/* SourcesConnectorWizard — the Sources page "Add source" flow: choose a
   provider → enter credentials → watch the first sync. Composes the catalog
   <ConnectorWizard> and feeds it the console's connector catalog (server truth
   in production; baked here). Test-connection is advisory and never gates
   Connect; once Connect fires, a live <SyncPanel> step is driven by a simulated
   sync-status. Standalone: opens by default and via a visible trigger. */

const CATALOG: WizardProvider[] = [
  {
    key: "github", name: "GitHub", blurb: "Sync Markdown docs from a repository, read-only.",
    mark: <SourceMark provider="github" size={22} />, connected: false,
    docsUrl: "https://docs.github.com/authentication",
    fields: [
      { key: "repo", label: "Repository", placeholder: "acme/handbook", help: "owner/name of a repo your token can read." },
      { key: "paths", label: "Paths filter (glob)", placeholder: "**/*.md" },
    ],
  },
  {
    key: "slack", name: "Slack", blurb: "Import channel history into your knowledge library.",
    mark: <SourceMark provider="slack" size={22} />,
    fields: [
      { key: "bot_token", label: "Bot token", secret: true, placeholder: "xoxb-…", help: "Needs channels:history + channels:read." },
      { key: "channel", label: "Channel", placeholder: "#engineering" },
    ],
  },
  {
    key: "gdrive", name: "Google Drive", blurb: "Index docs from a shared Drive folder.",
    mark: <SourceMark provider="gdrive" size={22} />,
    fields: [
      { key: "service_account_json", label: "Service account JSON", secret: true, multiline: true, placeholder: '{ "type": "service_account", … }' },
      { key: "folder_id", label: "Folder ID", placeholder: "1a2B3c…" },
    ],
  },
  {
    key: "notion", name: "Notion", blurb: "Sync pages from a Notion database.",
    mark: <SourceMark provider="notion" size={22} />,
    fields: [
      { key: "token", label: "Internal integration token", secret: true, placeholder: "secret_…" },
      { key: "database_id", label: "Database ID", placeholder: "8a5f…" },
    ],
  },
  {
    key: "granola", name: "Granola", blurb: "Bring in meeting notes and transcripts.",
    mark: <SourceMark provider="granola" size={22} />,
    fields: [{ key: "api_key", label: "API key", secret: true, placeholder: "gr-…" }],
  },
  {
    key: "confluence", name: "Confluence", blurb: "Index spaces and pages from Confluence Cloud.",
    mark: <SourceMark provider="confluence" size={22} />,
    fields: [
      { key: "base_url", label: "Base URL", placeholder: "https://acme.atlassian.net/wiki" },
      { key: "email", label: "Email", placeholder: "you@acme.com" },
      { key: "api_token", label: "API token", secret: true, placeholder: "ATATT…" },
    ],
  },
  {
    key: "jira", name: "Jira", blurb: "Sync issues and comments from a Jira project.",
    mark: <SourceMark provider="jira" size={22} />,
    fields: [
      { key: "base_url", label: "Base URL", placeholder: "https://acme.atlassian.net" },
      { key: "email", label: "Email", placeholder: "you@acme.com" },
      { key: "api_token", label: "API token", secret: true },
    ],
  },
  {
    key: "linear", name: "Linear", blurb: "Index issues and docs from Linear.",
    mark: <SourceMark provider="linear" size={22} />,
    fields: [{ key: "api_key", label: "API key", secret: true, placeholder: "lin_api_…" }],
  },
];

function demoTest(_provider: string, _config: Record<string, string>): ConnectTestResult {
  return { ok: true };
}

export type SourcesConnectorWizardProps = {
  /** Override the baked-in provider catalog. */
  providers?: WizardProvider[];
  /** Open the wizard on mount so it shows in a static gallery. */
  defaultOpen?: boolean;
  loading?: boolean;
  className?: string;
};

export function SourcesConnectorWizard({
  providers = CATALOG, defaultOpen = true, loading = false, className = "",
}: SourcesConnectorWizardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [sync, setSync] = useState<SyncSource | null>(null);
  /* Where the connected source LANDED. Connecting used to end on "Done" with
     no statement of where the source went, so the flow felt like it dropped
     the source on the floor. */
  const [landed, setLanded] = useState<string | null>(null);

  const finish = ({ provider, config }: { provider: string; config: Record<string, string> }) => {
    const p = providers.find((x) => x.key === provider);
    const detail = config.repo || config.channel || config.folder_id || p?.name || "source";
    const running: SyncSource = {
      id: provider,
      name: `${p?.name ?? provider} · ${detail}`,
      mark: <SourceMark provider={provider} size={24} />,
      state: "syncing", phase: "Embedding", done: 120, total: 460,
      chunkCount: 3120, embeddedCount: 1180,
    };
    setSync(running);
    setLanded(running.name);
    window.setTimeout(() => {
      setSync({
        ...running, state: "done", phase: undefined,
        docCount: 460, chunkCount: 3120, embeddedCount: 3120,
        lastSyncAt: new Date().toISOString(),
      });
    }, 1600);
  };

  if (loading) {
    return <div className={className} aria-hidden="true"><SkeletonButton w={124} /></div>;
  }

  return (
    <div className={className}>
      <Button variant="primary" onClick={() => { setSync(null); setOpen(true); }}>
        <Plus size={14} /> Add source
      </Button>
      {landed && !open && (
        <div className="mt-3">
          <Alert tone="info" title="Source connected" onDismiss={() => setLanded(null)}
            action={<Button compact onClick={() => setLanded(null)}>Open Connectors</Button>}>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-moss" />
              {landed} now lives on Sources, under the Connectors tab. Its first sync keeps running there.
            </span>
          </Alert>
        </div>
      )}
      <ConnectorWizardUI
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setSync(null); }}
        providers={providers}
        title="Connect a source"
        onTest={demoTest}
        onFinish={finish}
        syncStatus={sync}
        onRetrySync={() => setSync((s) => (s ? { ...s, state: "syncing" } : s))}
      />
    </div>
  );
}
