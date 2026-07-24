import { useState, type ReactNode } from "react";
import { KeyRound, Plus } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { SettingsTabs } from "./SettingsTabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Field } from "../forms/Field";
import { Scrollable } from "../data-display/Scrollable";
import { Chip } from "../data-display/Chip";
import { PropertyList } from "../data-display/PropertyList";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Alert } from "../feedback/Alert";
import { TokenReveal } from "../data-display/TokenReveal";
import { fmtDate } from "../tokens/format";
import { SettingsApiKeys, type ApiKey, type SettingsApiKeysActions } from "../features/SettingsApiKeys";
import type { PropertyItem } from "../data-display/PropertyList";

/** What Settings → API keys can do. Defined with the panel that renders the
    controls and re-exported here, so an app types its handlers off the page. */
export type { SettingsApiKeysActions };

/* Settings → API keys (pages/settings-api-keys.md). Create and revoke
   programmatic-access keys. List variants render the SettingsApiKeys feature;
   the create / key-created (one-time reveal) / revoke-confirm variants render
   inline so each lifecycle step is captured. Under the shared settings tab
   strip.

   Pure presenter: the key list, the draft being created, the one-time secret
   and the rail summary all arrive in `data`. "No keys yet" is derived from the
   list being empty. */

const STATES = [
  { id: "default", label: "Keys list" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No keys yet" },
  { id: "single", label: "Single key" },
  { id: "many", label: "Many keys" },
  { id: "create-key", label: "Create-key form" },
  { id: "key-created", label: "Key created (revealed)" },
  { id: "revoke-confirm", label: "Revoke key (confirm)" },
  { id: "revoked", label: "Revoked key in list" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which lifecycle step of key management is on screen. */
export type KeysPhase =
  | "list" | "plain-table" | "create-key" | "key-created" | "revoke-confirm";

/** A key being created, before the server has minted it. */
export type ApiKeyDraft = { name: string; scopes: string };

/** Everything Settings → API keys renders. */
export type SettingsApiKeysData = {
  phase: KeysPhase;
  keys: ApiKey[];
  /** The create form's current values. */
  draft: ApiKeyDraft;
  /** The one-time secret, shown once right after creation. `null` = none. */
  newSecret: string | null;
  /** The key a revoke confirmation is pending on. */
  confirmKeyId: number | null;
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
};


/* ── §11 page grid ─────────────────────────────────────────────────────────
   Shared verbatim with the other four Settings pages: one container width, one
   main/rail split, one form-field grid. */
const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";
const FORM_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function SettingsBody({ mobile, rail, children }: { mobile: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

function KeysTable({ keys, confirmId = null }: { keys: ApiKey[]; confirmId?: number | null }) {
  return (
    <Card variant="flush" title="Keys" hint="Rate-limited per key. Revocation is immediate.">
      <Scrollable>
        <table className="w-full text-left border-collapse" style={{ minWidth: 780 }}>
          <thead><tr>{["Name", "Key", "Scopes", "Created", "Last used", "Status", ""].map((h, i) => <th key={i} className={`${thClass} px-4 py-2.5 border-y border-ink/10`} style={i === 6 ? { width: 110 } : undefined}>{h}</th>)}</tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className={`border-b border-ink/10 last:border-0 ${k.revoked ? "opacity-45" : ""}`}>
                <td className="px-4 py-3 text-[13px] font-medium text-ink">{k.name}</td>
                <td className="px-4 py-3 font-term text-[12px] text-ink/70">{k.prefix}</td>
                <td className="px-4 py-3 font-term text-[12px] text-ink/60">{k.scopes}</td>
                <td className="px-4 py-3 font-term text-[12px] text-ink/60">{fmtDate(k.created)}</td>
                <td className="px-4 py-3 font-term text-[12px] text-ink/60">{k.lastUsed ? fmtDate(k.lastUsed) : "never"}</td>
                <td className="px-4 py-3"><Chip label={k.revoked ? "Revoked" : "Active"} tone={k.revoked ? "blocked" : "ok"} dot caps /></td>
                <td className="px-4 py-3">{!k.revoked && <Button compact variant={confirmId === k.id ? "danger" : "default"}>{confirmId === k.id ? "Revoke?" : "Revoke"}</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scrollable>
    </Card>
  );
}

/* Supporting rail (§11, 320px) — matches the other four Settings rails. */
function KeysRail({ summary }: { summary: PropertyItem[] }) {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList items={summary} />
      </Card>
      <Card title="Scopes">
        <ul className="flex flex-col gap-2 font-term text-[12px] text-ink/70">
          <li><b className="text-ink">search:read</b> query the index</li>
          <li><b className="text-ink">ingest:write</b> push documents</li>
          <li><b className="text-ink">facts:read</b> read verified facts</li>
          <li><b className="text-ink">metrics:read</b> export usage</li>
        </ul>
      </Card>
    </>
  );
}

/** No keys at all. Derived from the list, so it is true in the real app for
    exactly the same reason it is true on the canvas. */
function isEmpty(d: SettingsApiKeysData): boolean {
  return d.keys.length === 0;
}

function Body({ data, error, actions, createOpen, onCreateOpenChange }: {
  data: SettingsApiKeysData;
  error: string | null;
  actions?: SettingsApiKeysActions;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  if (error) {
    return <EmptyState icon={<KeyRound size={22} />} title="API offline">{error}</EmptyState>;
  }
  if (isEmpty(data)) {
    return (
      <EmptyState icon={<KeyRound size={22} />} title="No keys yet">
        Create a key to authenticate CI, bots, and the MCP gateway.
      </EmptyState>
    );
  }
  if (data.phase === "plain-table") return <KeysTable keys={data.keys} />;

  if (data.phase === "create-key") {
    return (
      <>
        <Card title="New key" hint="Scopes are space-separated, e.g. search:read ingest:write">
          <div className={FORM_GRID}>
            <Field label="Name"><Input defaultValue={data.draft.name} placeholder="CI pipeline" className="w-full" /></Field>
            <Field label="Scopes"><Input defaultValue={data.draft.scopes} className="w-full font-term" /></Field>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-ink/10 pt-4">
            <Button variant="primary"><Plus size={15} /> Create key</Button>
            <Button>Cancel</Button>
          </div>
        </Card>
        <KeysTable keys={data.keys} />
      </>
    );
  }
  if (data.phase === "key-created" && data.newSecret) {
    return (
      <>
        <TokenReveal token={data.newSecret} title="Your new key" masked={false} onDismiss={() => {}} />
        <KeysTable keys={data.keys} />
      </>
    );
  }
  if (data.phase === "revoke-confirm" && data.confirmKeyId !== null) {
    const target = data.keys.find((k) => k.id === data.confirmKeyId);
    return (
      <>
        <Alert tone="attention" title={`Revoke ${target ? target.name : "this key"}?`} action={<span className="inline-flex gap-2"><Button compact variant="danger">Revoke now</Button><Button compact>Cancel</Button></span>}>
          Revocation is immediate and cannot be undone. Any service using this key will start receiving 401s.
        </Alert>
        <KeysTable keys={data.keys} confirmId={data.confirmKeyId} />
      </>
    );
  }
  return (
    <SettingsApiKeys
      embedded
      keys={data.keys}
      actions={actions}
      createOpen={createOpen}
      onCreateOpenChange={onCreateOpenChange}
    />
  );
}

function SettingsApiKeysPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<SettingsApiKeysData, SettingsApiKeysActions>) {
  /* The header owns the "Create key" button, so it owns whether the form
     below it is open: the panel's own header is hidden when embedded (§2). */
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <PageFrame chrome={chrome} active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="API keys"
            description="Programmatic access for CI, bots, and the MCP gateway."
            actions={<Button variant="primary" onClick={() => setCreateOpen((v) => !v)}><Plus size={15} /> Create key</Button>}
          />
          <div className="mt-5"><SettingsTabs active="api-keys" onNavigate={chrome?.onNavigate} /></div>
          <SettingsBody mobile={mobile} rail={<KeysRail summary={data.summary} />}>
            <Body data={data} error={error} actions={actions} createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsApiKeysData, SettingsApiKeysActions> = {
  id: "settings-api-keys",
  title: "Settings · API keys",
  route: "/settings/api-keys",
  component: SettingsApiKeysPage,
  states: STATES.map((s) => ({ ...s })),
};
