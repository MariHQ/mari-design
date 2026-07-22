import { useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Field } from "../forms/Field";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { TokenReveal as TokenRevealUI, TOKEN_REVEAL_WARNING } from "../data-display/TokenReveal";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Skeleton, SkeletonLine, SkeletonButton, SkeletonTable } from "../data-display/Skeleton";
import { fmtDate } from "../tokens/format";

/* Settings — API keys ─────────────────────────────────────────────────────
   Create and revoke programmatic-access keys (CI, bots, the MCP gateway).
   Keys show only a masked prefix in the table; the full secret is revealed
   exactly once after creation via TokenReveal. Revocation is immediate.
   Source: web/src/pages/settings/ApiKeys.tsx. Standalone — the "created"
   secret is a locally generated demo string, no network. */

export type ApiKey = {
  id: number;
  name: string;
  prefix: string;
  scopes: string;
  created: string;
  lastUsed: string | null;
  revoked: boolean;
};

const DEMO_KEYS: ApiKey[] = [
  { id: 1, name: "CI pipeline", prefix: "mk_live_a91f…", scopes: "search:read ingest:write", created: "2025-02-11", lastUsed: "2025-07-18", revoked: false },
  { id: 2, name: "MCP gateway", prefix: "mk_live_7c02…", scopes: "search:read facts:read", created: "2025-04-02", lastUsed: "2025-07-20", revoked: false },
  { id: 3, name: "Old bot (rotated)", prefix: "mk_live_3de8…", scopes: "search:read", created: "2024-12-01", lastUsed: "2025-03-30", revoked: true },
];

function randomSecret(): string {
  const hex = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  return `mk_live_${hex}`;
}

export type SettingsApiKeysProps = { keys?: ApiKey[]; loading?: boolean; className?: string };

export function SettingsApiKeys({ keys: initialKeys = DEMO_KEYS, loading = false, className = "" }: SettingsApiKeysProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("read");
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const createKey = () => {
    if (!name.trim()) return;
    setSaving(true);
    setTimeout(() => {
      const secret = randomSecret();
      const eff = scopes.trim() || "read";
      setKeys((k) => [...k, { id: Math.max(0, ...k.map((x) => x.id)) + 1, name: name.trim(), prefix: `${secret.slice(0, 12)}…`, scopes: eff, created: new Date().toISOString().slice(0, 10), lastUsed: null, revoked: false }]);
      setToken(secret);
      setName(""); setScopes("read"); setCreating(false); setSaving(false);
    }, 500);
  };

  const revoke = (id: number) => setKeys((k) => k.map((x) => (x.id === id ? { ...x, revoked: true } : x)));

  const { sort, onSort, sorted } = useSort(keys, {
    name: (k) => k.name,
    key: (k) => k.prefix,
    scopes: (k) => k.scopes,
    created: (k) => k.created,
    lastUsed: (k) => k.lastUsed ?? "",
    status: (k) => (k.revoked ? "Revoked" : "Active"),
  });

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5"><Skeleton width={150} height={20} /><SkeletonLine w={300} h={11} /></div>
          <SkeletonButton w={110} />
        </div>
        <SkeletonTable rows={4} cols={7} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader
        title="API keys"
        description="Programmatic access for CI, bots, and the MCP gateway"
        actions={<Button variant="primary" onClick={() => setCreating((v) => !v)}><Plus size={15} /> Create key</Button>}
      />

      {creating && (
        <Card title="New key" hint={TOKEN_REVEAL_WARNING}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" className="w-full" /></Field>
            <Field label="Scopes"><Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="search:read ingest:write" className="w-full font-term" /></Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" disabled={saving || !name.trim()} onClick={createKey}>{saving ? "Creating…" : "Create key"}</Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {token && <TokenRevealUI token={token} title="Your new key" onDismiss={() => setToken(null)} />}

      <Card variant="flush" title="Keys" hint={`${TOKEN_REVEAL_WARNING} Keys are rate limited individually, and revocation takes effect immediately.`}>
        {keys.length === 0 ? (
          <EmptyState icon={<KeyRound size={24} />} title="No keys yet">Create the first one above to give CI or an agent programmatic access.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: 860 }}>
              <colgroup>
                <col style={{ width: "20%" }} /><col style={{ width: "18%" }} /><col style={{ width: "22%" }} />
                <col style={{ width: "11%" }} /><col style={{ width: "11%" }} /><col style={{ width: "9%" }} /><col style={{ width: "9%" }} />
              </colgroup>
              <thead>
                <tr>
                  <SortHeader label="Name" sortKey="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Key" sortKey="key" sort={sort} onSort={onSort} />
                  <SortHeader label="Scopes" sortKey="scopes" sort={sort} onSort={onSort} />
                  <SortHeader label="Created" sortKey="created" sort={sort} onSort={onSort} align="center" />
                  <SortHeader label="Last used" sortKey="lastUsed" sort={sort} onSort={onSort} align="center" />
                  {/* Rows carry a clickable action, so status is second to last. */}
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Actions" sortable={false} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((k) => (
                  <tr key={k.id} className={`border-b border-ink/10 last:border-0 align-top ${k.revoked ? "bg-flysch/60" : ""}`}>
                    <td className={`${tdPad} break-words text-[13px] font-medium text-ink`}>{k.name}</td>
                    <td className={`${tdPad} break-all font-term text-[12px] text-ink/70`}>{k.prefix}</td>
                    <td className={`${tdPad} break-words font-term text-[12px] text-ink/70`}>{k.scopes}</td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{fmtDate(k.created)}</td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{k.lastUsed ? fmtDate(k.lastUsed) : "Never"}</td>
                    <td className={tdPad}><Chip label={k.revoked ? "Revoked" : "Active"} tone={k.revoked ? "blocked" : "ok"} dot caps /></td>
                    <td className={tdPad}>{!k.revoked && <ConfirmButton compact confirmLabel="Revoke?" onConfirm={() => revoke(k.id)}>Revoke</ConfirmButton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
