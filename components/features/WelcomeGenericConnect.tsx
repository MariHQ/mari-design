import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { ConnectDrawer } from "../forms/ConnectDrawer";
import { type ConnectorField, type ConnectTestResult } from "../forms/ConnectorWizard";
import { type SyncSource } from "../feedback/SyncPanel";
import { Button } from "../actions/Button";
import { SourceMark } from "../icons/marks";

/* WelcomeGenericConnect — the Welcome wizard's Step 1 sub-flow for any catalog
   provider that isn't GitHub or Upload (Slack, Notion, Drive, Confluence, …).
   A dynamic credential form driven by the provider's field spec, with an
   advisory "Test connection" and "Connect & sync" that hands off to a live
   <SyncPanel>. Composes the catalog <ConnectDrawer>; validate/connect are
   baked in. Standalone: opens by default and via a visible trigger. */

const SLACK_FIELDS: ConnectorField[] = [
  { key: "bot_token", label: "Bot token", secret: true, placeholder: "xoxb-…", help: "Needs channels:history and channels:read." },
  { key: "app_token", label: "App-level token", secret: true, placeholder: "xapp-…" },
  { key: "channel", label: "Channel", placeholder: "#engineering" },
];

export type WelcomeGenericConnectProps = {
  providerKey?: string;
  providerName?: string;
  blurb?: string;
  fields?: ConnectorField[];
  docsUrl?: string;
  defaultOpen?: boolean;
  className?: string;
};

export function WelcomeGenericConnect({
  providerKey = "slack",
  providerName = "Slack",
  blurb = "Import channel history into your shared knowledge library.",
  fields = SLACK_FIELDS,
  docsUrl = "https://api.slack.com/authentication/token-types",
  defaultOpen = true,
  className = "",
}: WelcomeGenericConnectProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [sync, setSync] = useState<SyncSource | null>(null);

  const test = (_v: Record<string, string>): ConnectTestResult => ({ ok: true });

  const connect = (values: Record<string, string>) => {
    const detail = values.channel || providerName;
    const running: SyncSource = {
      id: providerKey, name: `${providerName} · ${detail}`, mark: <SourceMark provider={providerKey} size={24} />,
      state: "syncing", phase: "Chunking", done: 40, total: 210, chunkCount: 640, embeddedCount: 210,
    };
    setSync(running);
    window.setTimeout(() => setSync({
      ...running, state: "done", phase: undefined,
      docCount: 210, chunkCount: 1980, embeddedCount: 1980, lastSyncAt: new Date().toISOString(),
    }), 1600);
  };

  return (
    <div className={className}>
      <Button variant="primary" onClick={() => { setSync(null); setOpen(true); }}>Connect {providerName}</Button>
      <ConnectDrawer
        open={open}
        onClose={() => { setOpen(false); setSync(null); }}
        providerName={providerName}
        blurb={blurb}
        icon={<SourceMark provider={providerKey} size={20} />}
        fields={fields}
        docsUrl={docsUrl}
        onTest={test}
        onConnect={connect}
        note={providerKey === "slack" ? (
          <span><MessageSquare size={13} className="inline mr-1" /> Importing channel history is separate from the answering bot — set that up under Settings → Sources → Bots.</span>
        ) : undefined}
        syncStatus={sync}
        onRetrySync={() => setSync((s) => (s ? { ...s, state: "syncing" } : s))}
      />
    </div>
  );
}
