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
   <ConnectorWizard> and feeds it the connector catalog it is handed. Test-connection is advisory and never gates
   Connect; once Connect fires, a live <SyncPanel> step is driven by a simulated
   sync-status. Standalone: opens by default and via a visible trigger. */

/** A provider the wizard can offer, in plain JSON: `key` names the brand
    mark, so nothing here is a React element and the catalog can come straight
    off an API. */
export type WizardProviderSpec = Omit<WizardProvider, "mark">;

function demoTest(_provider: string, _config: Record<string, string>): ConnectTestResult {
  return { ok: true };
}

/** What the Add-source wizard can DO.
    `connectSource` throws on refusal and the sync step shows that message: a
    connector fails for reasons the user can fix (wrong token, repo not
    visible, workspace already connected), so the wording must survive intact.
    `testConnection` answers rather than throws, because "not ok" is a normal
    outcome of a test. */
export type ConnectorWizardActions = {
  connectSource?: (v: { provider: string; config: Record<string, string> }) => void | Promise<void>;
  testConnection?: (v: { provider: string; config: Record<string, string> }) => Promise<ConnectTestResult>;
};

export type SourcesConnectorWizardProps = {
  /** The connector catalog this workspace can add from. */
  providers: WizardProviderSpec[];
  actions?: ConnectorWizardActions;
  /** Open the wizard on mount so it shows in a static gallery. */
  defaultOpen?: boolean;
  loading?: boolean;
  className?: string;
};

export function SourcesConnectorWizard({
  providers: providerSpecs, actions, defaultOpen = true, loading = false, className = "",
}: SourcesConnectorWizardProps) {
  /* The brand mark is derived from the provider key, never carried in the
     data: an API returns strings, not React elements. */
  const providers: WizardProvider[] = providerSpecs.map((p) => ({
    ...p, provider: p.key,
  }));
  const [open, setOpen] = useState(defaultOpen);
  const [sync, setSync] = useState<SyncSource | null>(null);
  /* Where the connected source LANDED. Connecting used to end on "Done" with
     no statement of where the source went, so the flow felt like it dropped
     the source on the floor. */
  const [landed, setLanded] = useState<string | null>(null);
  /* The last connect attempt, so "Retry" re-sends the credentials the user
     typed instead of flipping the row back to "Syncing" while nothing runs. */
  const [attempt, setAttempt] = useState<{ provider: string; config: Record<string, string> } | null>(null);

  const rowFor = (provider: string, config: Record<string, string>) => {
    const p = providers.find((x) => x.key === provider);
    const detail = config.repo || config.channel || config.folder_id || p?.name || "source";
    return { id: provider, name: `${p?.name ?? provider} · ${detail}`, provider };
  };

  const finish = ({ provider, config }: { provider: string; config: Record<string, string> }) => {
    const base = rowFor(provider, config);
    setAttempt({ provider, config });

    if (!actions?.connectSource) {
      // Canvas: no server behind the page, so the step animates locally.
      const running: SyncSource = {
        ...base, state: "syncing", phase: "Embedding", done: 120, total: 460,
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
      return;
    }

    /* Real connect. "Queued" is the honest state while the POST is in flight,
       and it stays "Syncing" afterwards with NO counts — the server started a
       background sync and this dialog does not know how far it has got. The
       Connectors grid behind it does. */
    setSync({ ...base, state: "queued" });
    setLanded(null);
    void (async () => {
      try {
        await actions.connectSource!({ provider, config });
        setSync({ ...base, state: "syncing", phase: "Listing" });
        setLanded(base.name);
      } catch (err) {
        setSync({
          ...base, state: "error",
          error: err instanceof Error ? err.message : "The source could not be connected.",
        });
      }
    })();
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
        onTest={actions?.testConnection
          ? (provider, config) => actions.testConnection!({ provider, config })
          : demoTest}
        onFinish={finish}
        syncStatus={sync}
        onRetrySync={() => {
          if (attempt) { finish(attempt); return; }
          setSync((s) => (s ? { ...s, state: "syncing" } : s));
        }}
      />
    </div>
  );
}
