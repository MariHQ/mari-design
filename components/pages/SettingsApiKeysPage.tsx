import { useState, type ReactNode } from "react";
import { KeyRound, Plus } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Tabs, type TabOption } from "../navigation/Tabs";
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
import { AvatarGroup } from "../data-display/AvatarGroup";
import { SettingsApiKeys, type ApiKey } from "../features/SettingsApiKeys";
import {
  LONG_TITLE, LONG_SOURCE, LONG_URL, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT,
  HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS, repeat,
} from "./stress";

/* Settings → API keys (pages/settings-api-keys.md). Create and revoke
   programmatic-access keys. List variants render the SettingsApiKeys feature;
   the create / key-created (one-time reveal) / revoke-confirm variants render
   inline so each lifecycle step is captured. Under the shared settings tab
   strip. */

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

type SettingsTab =
  | "general" | "members" | "models" | "sources" | "api-keys" | "audit" | "design";

const SETTINGS_TABS: TabOption<SettingsTab>[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "models", label: "Models" },
  { id: "sources", label: "Sources" },
  { id: "api-keys", label: "API keys" },
  { id: "audit", label: "Audit log" },
  { id: "design", label: "Design & brand" },
];

function SettingsTabs({ active }: { active: SettingsTab }) {
  const [value, setValue] = useState<SettingsTab>(active);
  return (
    <Tabs
      ariaLabel="Workspace settings"
      variant="underline"
      options={SETTINGS_TABS}
      value={value}
      onChange={setValue}
    />
  );
}

/* ── §11 page grid ─────────────────────────────────────────────────────────
   Shared verbatim with the other four Settings pages: one container width, one
   main/rail split, one form-field grid. */
const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";
const FORM_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function SettingsBody({ mobile, rail, children }: { mobile: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className={mobile ? "mt-6 flex flex-col gap-5" : "mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-5"}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

const DEMO_KEYS: ApiKey[] = [
  { id: 1, name: "CI pipeline", prefix: "mk_live_a91f…", scopes: "search:read ingest:write", created: "2025-02-11", lastUsed: "2025-07-18", revoked: false },
  { id: 2, name: "MCP gateway", prefix: "mk_live_7c02…", scopes: "search:read facts:read", created: "2025-04-02", lastUsed: "2025-07-20", revoked: false },
  { id: 3, name: "Old bot (rotated)", prefix: "mk_live_3de8…", scopes: "search:read", created: "2024-12-01", lastUsed: "2025-03-30", revoked: true },
];

const MANY_KEYS: ApiKey[] = [
  ...DEMO_KEYS,
  { id: 4, name: "Staging ingest", prefix: "mk_live_ b21c…", scopes: "ingest:write", created: "2025-05-03", lastUsed: "2025-07-19", revoked: false },
  { id: 5, name: "Docs preview bot", prefix: "mk_live_f440…", scopes: "search:read", created: "2025-05-22", lastUsed: "2025-07-15", revoked: false },
  { id: 6, name: "Grafana exporter", prefix: "mk_live_09aa…", scopes: "metrics:read", created: "2025-06-01", lastUsed: null, revoked: false },
  { id: 7, name: "Legacy sync (rotated)", prefix: "mk_live_1188…", scopes: "search:read", created: "2024-09-14", lastUsed: "2025-01-02", revoked: true },
];

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

function KeysTable({ keys, confirmId }: { keys: ApiKey[]; confirmId?: number }) {
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

function StressKeys({ extreme }: { extreme: boolean }) {
  const keys: ApiKey[] = extreme
    ? repeat((i) => ({
        id: i + 1,
        name: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3],
        prefix: UNBREAKABLE,
        scopes: MANY_TAGS.join(" "),
        created: "2025-01-01",
        lastUsed: i % 2 === 0 ? "2025-07-20" : null,
        revoked: i % 3 === 0,
      }), 5)
    : repeat((i) => ({
        id: i + 1,
        name: LONG_TITLE,
        prefix: LONG_URL,
        scopes: MANY_TAGS.slice(0, 10).map((t) => `${t}:read`).join(" "),
        created: "2025-01-01",
        lastUsed: i % 2 === 0 ? "2025-07-20" : null,
        revoked: i % 3 === 0,
      }), 4);
  return (
    <>
      <SettingsApiKeys embedded keys={keys} />
      <Card title={extreme ? UNBREAKABLE : "Scopes granted across every key in this workspace"} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
        <div className="flex items-center gap-3">
          <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={5} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink/60">{extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} requests served last month`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(extreme ? [UNBREAKABLE, LONG_WORD, ...MANY_TAGS] : MANY_TAGS).map((t, i) => <Chip key={i} label={t} tone="info" caps />)}
        </div>
      </Card>
    </>
  );
}

/* Supporting rail (§11, 320px) — matches the other four Settings rails. */
function KeysRail() {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList
          items={[
            { label: "Active keys", value: "2" },
            { label: "Revoked keys", value: "1" },
            { label: "Requests, 30 days", value: "184,220" },
            { label: "Oldest key", value: "Dec 1, 2024" },
          ]}
        />
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

function Body({ state }: { state: string }) {
  if (state === "overflow" || state === "stress") return <StressKeys extreme={state === "stress"} />;
  if (state === "error") {
    return (
      <EmptyState icon={<KeyRound size={22} />} title="API offline">
        Your API keys are temporarily unavailable. Retrying…
      </EmptyState>
    );
  }
  if (state === "empty") {
    return (
      <EmptyState icon={<KeyRound size={22} />} title="No keys yet">
        Create a key to authenticate CI, bots, and the MCP gateway.
      </EmptyState>
    );
  }
  if (state === "single") return <SettingsApiKeys embedded keys={[DEMO_KEYS[0]]} />;
  if (state === "many") return <SettingsApiKeys embedded keys={MANY_KEYS} />;
  if (state === "revoked") return <KeysTable keys={MANY_KEYS} />;

  if (state === "create-key") {
    return (
      <>
        <Card title="New key" hint="Scopes are space-separated, e.g. search:read ingest:write">
          <div className={FORM_GRID}>
            <Field label="Name"><Input defaultValue="Nightly export bot" placeholder="CI pipeline" className="w-full" /></Field>
            <Field label="Scopes"><Input defaultValue="search:read ingest:write" className="w-full font-term" /></Field>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-ink/10 pt-4">
            <Button variant="primary"><Plus size={15} /> Create key</Button>
            <Button>Cancel</Button>
          </div>
        </Card>
        <KeysTable keys={DEMO_KEYS} />
      </>
    );
  }
  if (state === "key-created") {
    return (
      <>
        <TokenReveal token="mk_live_9f2ac0d18b7e4a3c1d5e6f708192a3b4" title="Your new key" masked={false} onDismiss={() => {}} />
        <KeysTable keys={[{ id: 99, name: "Nightly export bot", prefix: "mk_live_9f2a…", scopes: "search:read ingest:write", created: "2026-07-21", lastUsed: null, revoked: false }, ...DEMO_KEYS]} />
      </>
    );
  }
  if (state === "revoke-confirm") {
    return (
      <>
        <Alert tone="attention" title="Revoke MCP gateway?" action={<span className="inline-flex gap-2"><Button compact variant="danger">Revoke now</Button><Button compact>Cancel</Button></span>}>
          Revocation is immediate and cannot be undone. Any service using this key will start receiving 401s.
        </Alert>
        <KeysTable keys={DEMO_KEYS} confirmId={2} />
      </>
    );
  }
  return <SettingsApiKeys embedded />;
}

function SettingsApiKeysPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="API keys"
            description="Programmatic access for CI, bots, and the MCP gateway."
            actions={<Button variant="primary"><Plus size={15} /> Create key</Button>}
          />
          <div className="mt-5"><SettingsTabs active="api-keys" /></div>
          <SettingsBody mobile={mobile} rail={<KeysRail />}>
            <Body state={state} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "settings-api-keys",
  title: "Settings · API keys",
  route: "/settings/api-keys",
  component: SettingsApiKeysPage,
  states: STATES.map((s) => ({ ...s })),
};
