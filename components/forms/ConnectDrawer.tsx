import { useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";
import { Drawer } from "../layout/Drawer";
import { Button } from "../actions/Button";
import { Field } from "./Field";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Spinner } from "../data-display/Spinner";
import { Chip } from "../data-display/Chip";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import type { ConnectorField, ConnectTestResult } from "./ConnectorWizard";

/* ConnectDrawer — a slide-over connect flow, ported from
   pages/welcome/GenericConnect.tsx: renders a provider's credential fields
   (secret → password, multiline → textarea), an optional "Test connection",
   then Connect & sync. The gql/validate/connect network layer is abstracted
   away — fields arrive as props and the flow exposes onConnect(values). Once
   the parent supplies a `syncStatus`, the drawer switches to live sync (built
   on our SyncPanel). Built on Drawer + Field + Input + Button. */

export type ConnectDrawerProps = {
  open: boolean;
  onClose: () => void;
  providerName: string;
  blurb?: string;
  /** Provider logo/mark shown in the drawer header. */
  icon?: ReactNode;
  fields: ConnectorField[];
  docsUrl?: string;
  /** Fired with trimmed credential values when Connect & sync is clicked. */
  onConnect: (values: Record<string, string>) => void;
  /** Optional "Test connection" handler — omit to hide the button. */
  onTest?: (values: Record<string, string>) => Promise<ConnectTestResult> | ConnectTestResult;
  /** Extra note rendered under the fields (e.g. a Slack bot reminder). */
  note?: ReactNode;
  /** When present, the drawer shows live sync instead of the form. */
  syncStatus?: SyncSource | null;
  onRetrySync?: () => void;
};

export function ConnectDrawer({
  open, onClose, providerName, blurb, icon, fields, docsUrl,
  onConnect, onTest, note, syncStatus = null, onRetrySync,
}: ConnectDrawerProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [test, setTest] = useState<{ busy: boolean; ok: boolean | null; error: string }>({ busy: false, ok: null, error: "" });

  const filled = fields.every((f) => (config[f.key] ?? "").trim().length > 0);
  const set = (key: string, value: string) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setTest({ busy: false, ok: null, error: "" });
  };
  const trimmed = () => Object.fromEntries(Object.entries(config).map(([k, v]) => [k, v.trim()]));

  const runTest = async () => {
    if (!filled || !onTest || test.busy) return;
    setTest({ busy: true, ok: null, error: "" });
    try {
      const r = await onTest(trimmed());
      setTest({ busy: false, ok: r.ok, error: r.error ?? "" });
    } catch {
      setTest({ busy: false, ok: false, error: "The test handler threw an error." });
    }
  };

  const connected = syncStatus != null;

  const footer = connected ? (
    <div className="flex items-center gap-3 w-full">
      <span className="text-[12px] text-ink/55 flex-1">Sync continues on the server — closing won’t interrupt it.</span>
      <Button variant="primary" onClick={onClose}>Done <CheckCircle2 size={14} /></Button>
    </div>
  ) : (
    <div className="flex items-center gap-2 w-full justify-end">
      {onTest && (
        <Button disabled={!filled || test.busy} onClick={runTest}>
          {test.busy ? <><Spinner size="sm" /> Testing…</> : <><ShieldCheck size={14} /> Test connection</>}
        </Button>
      )}
      <Button variant="primary" disabled={!filled} onClick={() => onConnect(trimmed())}>
        Connect &amp; sync <ArrowRight size={14} />
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Connect ${providerName}`}
      subtitle="Connector setup"
      icon={icon}
      footer={footer}
    >
      {connected ? (
        <>
          <p className="text-[13px] text-ink/70 mb-3">The initial sync runs on the server — live status below.</p>
          <SyncPanel sources={[syncStatus!]} onRetry={onRetrySync ? () => onRetrySync() : undefined} />
        </>
      ) : (
        <>
          <p className="text-[13px] text-ink/70">
            {blurb}{" "}
            {docsUrl && (
              <a className="inline-flex items-center gap-1 text-biscay-2 hover:underline" href={docsUrl} target="_blank" rel="noreferrer">
                Where do I get these? <ExternalLink size={11} />
              </a>
            )}
          </p>
          <div className="mt-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.multiline ? (
                  <Textarea
                    rows={5}
                    className="font-term"
                    autoComplete="off"
                    placeholder={f.placeholder}
                    value={config[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="w-full"
                    type={f.secret ? "password" : "text"}
                    autoComplete="off"
                    placeholder={f.placeholder}
                    value={config[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.help && <p className="mt-1 text-[11.5px] text-ink/55">{f.help}</p>}
              </Field>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-ink/55">
            Credentials are stored server-side and never shown again.
          </p>
          {test.ok === true && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-moss">
              <CheckCircle2 size={14} /> Connection test passed. <Chip label="Valid" tone="ok" caps />
            </div>
          )}
          {test.ok === false && (
            <div className="mt-3 rounded-[4px] border border-espelette/30 bg-espelette/[0.05] px-3 py-2 text-[12.5px] text-espelette" role="alert">
              <b className="font-semibold">Connection test failed.</b> {test.error}
            </div>
          )}
          {note && (
            <div className="mt-3 flex items-start gap-2 rounded-[4px] border border-ink/12 bg-flysch px-3 py-2 text-[12px] text-ink/70">
              {note}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
