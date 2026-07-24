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
import { Truncate } from "../data-display/Truncate";
import { Scrollable } from "../data-display/Scrollable";
import { PagerBar, ResultCount, usePaged } from "../data-display/Pagination";
import { fmtDate } from "../tokens/format";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";

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

function randomSecret(): string {
  const hex = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  return `mk_live_${hex}`;
}

/** What the API-keys surface can DO.

    `createKey` RETURNS the secret because that is the only moment it exists:
    the server mints it, hands it back once, and stores a hash. Nothing here
    ever re-reads a secret, and nothing logs one. */
export type SettingsApiKeysActions = {
  createKey?: (draft: { name: string; scopes: string }) => string | Promise<string>;
  revokeKey?: (id: number) => void | Promise<void>;
};

export type SettingsApiKeysProps = {
  /** Hide the internal PageHeader when the host page already renders one. */
  embedded?: boolean;
  keys: ApiKey[];
  actions?: SettingsApiKeysActions;
  /** Whether the create form is open. Embedded, the host page owns the
      "Create key" button, so it owns this. */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  loading?: boolean;
  className?: string;
};

export function SettingsApiKeys({
  keys: initialKeys, actions, createOpen, onCreateOpenChange,
  loading = false, embedded = false, className = "",
}: SettingsApiKeysProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [creatingLocal, setCreatingLocal] = useState(false);
  const creating = createOpen ?? creatingLocal;
  const setCreating = (open: boolean) => { setCreatingLocal(open); onCreateOpenChange?.(open); };
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("read");
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  /* Create and revoke both go through `write`: with no `actions` they are the
     local-state changes this panel has always made (which is what the design
     canvas renders), and with actions they are the server's answer. */
  const write = useWrite();

  const createKey = async () => {
    const keyName = name.trim();
    if (!keyName) return;
    const eff = scopes.trim() || "read";
    setSaving(true);
    // The secret comes from the server when there is one, and from here only
    // when there is not. Either way it is shown once and never re-read.
    const secret = actions?.createKey
      ? await write.runFor(() => actions.createKey!({ name: keyName, scopes: eff }))
      : randomSecret();
    setSaving(false);
    if (!secret) return;
    setKeys((k) => [...k, { id: Math.max(0, ...k.map((x) => x.id)) + 1, name: keyName, prefix: `${secret.slice(0, 12)}…`, scopes: eff, created: new Date().toISOString().slice(0, 10), lastUsed: null, revoked: false }]);
    setToken(secret);
    setName(""); setScopes("read"); setCreating(false);
  };

  /* Destructive: the caller is <ConfirmButton>, so this is the second click. */
  const revoke = (id: number) => write.run(
    actions?.revokeKey && (() => actions.revokeKey!(id)),
    () => setKeys((k) => k.map((x) => (x.id === id ? { ...x, revoked: true } : x))),
  );

  const { sort, onSort, sorted } = useSort(keys, {
    name: (k) => k.name,
    key: (k) => k.prefix,
    scopes: (k) => k.scopes,
    created: (k) => k.created,
    lastUsed: (k) => k.lastUsed ?? "",
    status: (k) => (k.revoked ? "Revoked" : "Active"),
  });

  /* CI fleets mint keys by the hundred; the table pages rather than growing
     the card past the fold (CONVENTIONS §13). */
  const pager = usePaged(sorted, 12);

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
      {!embedded && <PageHeader
        title="API keys"
        description="Programmatic access for CI, bots, and the MCP gateway"
        actions={<Button variant="primary" onClick={() => setCreating(!creating)}><Plus size={15} /> Create key</Button>}
      />}

      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>

      {creating && (
        <Card title="New key" hint={TOKEN_REVEAL_WARNING}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" className="w-full" /></Field>
            <Field label="Scopes"><Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="search:read ingest:write" className="w-full font-term" /></Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" disabled={saving || !name.trim()} onClick={() => void createKey()}>{saving ? "Creating…" : "Create key"}</Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {token && <TokenRevealUI token={token} title="Your new key" onDismiss={() => setToken(null)} />}

      <Card variant="flush" title="Keys" hint={`${TOKEN_REVEAL_WARNING} Keys are rate limited individually, and revocation takes effect immediately.`}>
        {keys.length === 0 ? (
          <EmptyState icon={<KeyRound size={24} />} title="No keys yet">Create the first one above to give CI or an agent programmatic access.</EmptyState>
        ) : (
          /* table-fixed so the colgroup widths hold: under auto layout a
             100-character token let the Key column collapse to ~70px and wrap
             one character per line. The table keeps its 720px floor and
             scrolls inside this card. */
          <>
          <ResultCount from={pager.from} to={pager.to} total={pager.total} noun="keys"
            note={`${keys.filter((k) => k.revoked).length} revoked`} />
          <Scrollable>
            <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: 720 }}>
              {/* Widths are binding under table-fixed, so the share is
                  redistributed (not the table widened) to give the trailing
                  columns room for their own one-word headers: "Created",
                  "Status" and "Actions" cannot wrap. */}
              <colgroup>
                <col style={{ width: "20%" }} /><col style={{ width: "17%" }} /><col style={{ width: "17%" }} />
                <col style={{ width: "11.5%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11.5%" }} /><col style={{ width: "13%" }} />
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
                {pager.pageRows.map((k) => (
                  <tr key={k.id} className={`border-b border-ink/10 last:border-0 align-top ${k.revoked ? "bg-flysch/60" : ""}`}>
                    <td className={tdPad}><Truncate className="text-[13px] font-medium text-ink">{k.name}</Truncate></td>
                    {/* A key is opaque: truncate with the full value on hover
                        rather than wrapping a token down the column. */}
                    <td className={tdPad}><Truncate className="font-term text-[12px] text-ink/70">{k.prefix}</Truncate></td>
                    <td className={tdPad}><Truncate className="font-term text-[12px] text-ink/70">{k.scopes}</Truncate></td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{fmtDate(k.created)}</td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{k.lastUsed ? fmtDate(k.lastUsed) : "Never"}</td>
                    <td className={tdPad}><Chip label={k.revoked ? "Revoked" : "Active"} tone={k.revoked ? "blocked" : "ok"} dot caps /></td>
                    <td className={`${tdPad} whitespace-nowrap`}>{!k.revoked && <ConfirmButton compact confirmLabel="Revoke?" onConfirm={() => revoke(k.id)}>Revoke</ConfirmButton>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scrollable>
          {pager.paged && <PagerBar page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} />}
          </>
        )}
      </Card>
    </div>
  );
}
