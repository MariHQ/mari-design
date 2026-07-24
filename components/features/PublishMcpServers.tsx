import { useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { ConfirmButton } from "../actions/ConfirmButton";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { CopyButton } from "../actions/CopyButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip, ChipList, CountChip } from "../data-display/Chip";
import { ResultCount } from "../data-display/Pagination";
import { Truncate, TruncateInline } from "../data-display/Truncate";
import { CodeBlock } from "../data-display/CodeBlock";
import { EmptyState } from "../data-display/EmptyState";
import { TokenReveal as TokenRevealUI } from "../data-display/TokenReveal";
import { Skeleton, SkeletonLine, SkeletonButton, SkeletonCard } from "../data-display/Skeleton";
import { focusRing } from "../tokens/focusRing";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";

/* Publish · MCP servers ───────────────────────────────────────────────────
   Expose the curated knowledge base to Claude and other agents as
   capability-scoped MCP servers. List, create, configure, test, connect, and
   delete each. A newly created server's bearer token is shown once via
   TokenReveal. Source: web/src/pages/publish/McpServersTab.tsx.
   Standalone — create/test/delete are local state, tokens are demo strings. */

const MCP_CAPS = [
  { key: "search", tools: 3, desc: "hybrid search over documents" },
  { key: "facts", tools: 4, desc: "verified facts + verify" },
  { key: "glossary", tools: 2, desc: "term definitions" },
  { key: "chat", tools: 1, desc: "ask Mari" },
  { key: "lineage", tools: 2, desc: "graph edges" },
  { key: "answers", tools: 2, desc: "approved answers, served verbatim" },
] as const;

const MCP_UNITS: Record<string, string> = { search: "documents", facts: "facts", glossary: "terms", chat: "sessions", lineage: "edges", answers: "answers" };
const capTools = (keys: string[]) => keys.reduce((n, k) => n + (MCP_CAPS.find((c) => c.key === k)?.tools ?? 0), 0);

/* Scope used to be project-or-org only, which cannot express a workspace that
   ships more than one product. It is now a real ladder. */
export const MCP_SCOPES = [
  { value: "workspace", label: "Workspace (this project only)" },
  { value: "product", label: "Product (every project in one product)" },
  { value: "team", label: "Team (every product a team owns)" },
  { value: "org", label: "Organization (everything)" },
  { value: "public", label: "Public (anyone with the token)" },
] as const;
export type McpScope = (typeof MCP_SCOPES)[number]["value"];
const SCOPE_LABEL: Record<string, string> = Object.fromEntries(MCP_SCOPES.map((s) => [s.value, s.label.split(" (")[0]]));
/** Legacy rows still say "project". */
const normalizeScope = (s: string): McpScope => (s === "project" ? "workspace" : (s as McpScope));

export type McpServer = { id: number; name: string; url: string; scope: McpScope | "project"; status: "connected" | "idle"; capabilities: string[] };

/** What a real reachability check reports back. Every field is optional: the
    report is the server's own JSON and an older API may say less. A failed
    check answers `{ok: false, error}` rather than throwing, so `error` is the
    reason the card has to show. */
export type McpTestReport = {
  ok?: boolean; latency_ms?: number; checks?: Record<string, number>; error?: string;
};

/** A server the API has just created: the row it minted, plus the bearer token
    that exists only in this response and is shown exactly once. */
export type CreatedMcpServer = { id: number; url: string; token: string };

/** What the MCP surface can DO. All optional: with none, the controls keep the
    local behaviour below, which is what the design canvas renders. */
export type PublishMcpActions = {
  createServer?: (draft: { name: string; scope: string; capabilities: string[] }) => CreatedMcpServer | Promise<CreatedMcpServer>;
  updateServer?: (id: number, next: { scope: string; capabilities: string[] }) => void | Promise<void>;
  deleteServer?: (id: number) => void | Promise<void>;
  testServer?: (id: number) => McpTestReport | Promise<McpTestReport>;
};

type McpTest = { ok: boolean; latency_ms: number; checks: Record<string, number>; error?: string } | "error" | null;

function connectSnippet(name: string, url: string, token?: string) {
  return `claude mcp add ${name} --transport http ${url || "<url>"} \\\n  --header "Authorization: Bearer ${token ?? "YOUR_TOKEN"}"`;
}
function randomToken() {
  return "mcp_" + Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

function CapPicker({ selected, onToggle }: { selected: string[]; onToggle: (k: string) => void }) {
  return (
    <div className="grid gap-1.5">
      {MCP_CAPS.map((c) => {
        const on = selected.includes(c.key);
        return (
          <button key={c.key} type="button" onClick={() => onToggle(c.key)} aria-pressed={on}
            className={`flex items-start gap-2.5 p-2.5 rounded-[5px] border text-left transition-colors ${focusRing} ${on ? "border-biscay-2 bg-biscay-2/[0.04]" : "border-ink/15 hover:border-ink/30"}`}>
            <span className={`mt-0.5 grid place-items-center w-4 h-4 rounded-[3px] border ${on ? "bg-biscay border-biscay text-white" : "border-ink/30"}`}>{on && "✓"}</span>
            <span className="min-w-0">
              <span className="text-[13px] font-semibold text-ink">{c.key}</span>
              <span className="font-term text-[11.5px] text-ink/65"> · {c.tools} tools</span>
              <span className="block text-[12px] text-ink/65">{c.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type PublishMcpServersProps = { servers: McpServer[]; actions?: PublishMcpActions; loading?: boolean; className?: string };

export function PublishMcpServers({ servers: initialServers, actions, loading = false, className = "" }: PublishMcpServersProps) {
  const [servers, setServers] = useState<McpServer[]>(initialServers);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<McpScope>("workspace");
  const [caps, setCaps] = useState<string[]>(["search", "facts"]);
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);
  /* A platform team runs dozens of servers. Show a screenful of cards and name
     the remainder rather than stacking 60 cards (CONVENTIONS §13). */
  const [showAll, setShowAll] = useState(false);
  const PAGE = 8;

  const toggleCap = (setter: (fn: (c: string[]) => string[]) => void) => (k: string) =>
    setter((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  /* Create / configure / delete / test all go through `write`: with no
     `actions` they are the local-state changes this panel has always made, and
     with actions they are the server's answer (actions/useWrite.ts). */
  const write = useWrite();

  const create = async () => {
    const serverName = name.trim();
    if (!serverName || caps.length === 0) return;
    // The id, the URL and the token are all the server's to mint. Only when
    // there is no server behind the page does this panel invent them.
    const made = actions?.createServer
      ? await write.runFor(() => actions.createServer!({ name: serverName, scope, capabilities: caps }))
      : {
          id: Math.max(0, ...servers.map((s) => s.id)) + 1,
          url: `https://mcp.acme.com/s/${serverName}`,
          token: randomToken(),
        };
    if (!made) return;
    setServers((s) => [...s, { id: made.id, name: serverName, url: made.url, scope, status: "idle", capabilities: caps }]);
    setFresh({ name: serverName, token: made.token });
    setName(""); setScope("workspace"); setCaps(["search", "facts"]); setCreating(false);
  };

  /* Destructive: the caller is <ConfirmButton>, so this is the second click. */
  const del = (id: number) => write.run(
    actions?.deleteServer && (() => actions.deleteServer!(id)),
    () => setServers((s) => s.filter((x) => x.id !== id)),
  );
  const saveCaps = (id: number, scope: McpScope, capabilities: string[]) => write.run(
    actions?.updateServer && (() => actions.updateServer!(id, { scope, capabilities })),
    () => setServers((s) => s.map((x) => (x.id === id ? { ...x, scope, capabilities } : x))),
  );

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton width={160} height={20} />
            <SkeletonLine w={300} h={10} />
          </div>
          <SkeletonButton w={120} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} footer />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader
        title="MCP servers"
        description="Expose your curated knowledge to Claude and other agents, scoped to exactly what they may read."
        actions={<><CountChip count={servers.length} /><Button variant="primary" onClick={() => setCreating((v) => !v)}><Plus size={15} /> New server</Button></>}
      />

      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>

      {fresh && (
        <TokenRevealUI token={fresh.token} title={`${fresh.name} is live. Here is your bearer token`} onDismiss={() => setFresh(null)} />
      )}

      {creating && (
        <Card title="New MCP server">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><SectionLabel>Name</SectionLabel><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="support-kb" className="w-full" /></label>
            <label className="flex flex-col gap-1.5"><SectionLabel>Scope</SectionLabel><Select value={scope} onChange={(e) => setScope(e.target.value as McpScope)} className="w-full">{MCP_SCOPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></label>
          </div>
          <div className="mt-4"><SectionLabel>Capabilities, {capTools(caps)} tools selected</SectionLabel><div className="mt-1.5"><CapPicker selected={caps} onToggle={toggleCap(setCaps)} /></div></div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="primary" disabled={write.busy || !name.trim() || caps.length === 0} onClick={() => void create()}>{write.busy ? "Creating…" : "Create server"}</Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {servers.length === 0 ? (
        <Card><EmptyState icon={<KeyRound size={24} />} title="No MCP servers yet">Create one to expose this knowledge base to agents.</EmptyState></Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-md border border-ink/12 bg-paper">
            <ResultCount
              from={1} to={showAll ? servers.length : Math.min(PAGE, servers.length)} total={servers.length} noun="servers"
              className="border-b-0"
              actions={servers.length > PAGE && (
                <Button variant="link" compact onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show fewer" : `Show all ${servers.length}`}
                </Button>
              )}
            />
          </div>
          {(showAll ? servers : servers.slice(0, PAGE)).map((s) => (
            <ServerCard
              key={s.id}
              server={s}
              freshToken={fresh?.name === s.name ? fresh.token : undefined}
              onDelete={() => del(s.id)}
              onSave={(scope, caps) => saveCaps(s.id, scope, caps)}
              onTest={actions?.testServer && (() => actions.testServer!(s.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerCard({ server, freshToken, onDelete, onSave, onTest }: {
  server: McpServer; freshToken?: string; onDelete: () => void;
  onSave: (scope: McpScope, caps: string[]) => void;
  /** A real reachability check. Absent means there is no server behind the
      page and the card reports what it can see locally instead. */
  onTest?: () => McpTestReport | Promise<McpTestReport>;
}) {
  const [open, setOpen] = useState<null | "test" | "configure" | "connect">(null);
  const [test, setTest] = useState<McpTest>(null);
  const [testing, setTesting] = useState(false);
  const [draftScope, setDraftScope] = useState<McpScope>(normalizeScope(server.scope));
  const [draftCaps, setDraftCaps] = useState<string[]>(server.capabilities);

  const runTest = async () => {
    setOpen("test");
    if (!onTest) {
      const checks: Record<string, number> = {};
      server.capabilities.forEach((c) => { checks[c] = Math.floor(Math.random() * 400) + 20; });
      setTest({ ok: server.status === "connected", latency_ms: 40 + Math.floor(Math.random() * 60), checks });
      return;
    }
    setTesting(true);
    setTest(null);
    try {
      const r = await onTest();
      // The report is the server's own JSON, so read it defensively rather
      // than asserting a shape an older API may not send.
      setTest({
        ok: Boolean(r?.ok),
        latency_ms: Number(r?.latency_ms ?? 0),
        checks: r?.checks ?? {},
        error: r?.error,
      });
    } catch {
      setTest("error");
    } finally {
      setTesting(false);
    }
  };
  const toggleDraft = (k: string) => setDraftCaps((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const dotColor = server.status === "connected" ? "bg-moss" : "bg-[#c9bda0]";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`w-2 h-2 shrink-0 rounded-full ${dotColor}`} />
        {/* A server name is a slug of arbitrary length: one line, ellipsised,
            full value on hover (CONVENTIONS §12). */}
        <Truncate className="min-w-0 max-w-[18rem] flex-1 basis-[10rem] text-[14px] font-semibold text-ink">{server.name}</Truncate>
        <Chip label={SCOPE_LABEL[normalizeScope(server.scope)] ?? server.scope} tone="neutral" caps />
        <span className="shrink-0 font-term text-[11.5px] text-ink/65">{capTools(server.capabilities)} tools</span>
        <TruncateInline className="hidden max-w-[220px] font-term text-[11.5px] text-ink/65 sm:inline-block">{server.url}</TruncateInline>
        <CopyButton value={server.url} label="Copy" className="ml-auto shrink-0" />
      </div>

      {server.capabilities.length === 0 ? (
        <div className="mt-3 text-[12.5px] italic text-ink/65">Capabilities not set</div>
      ) : (
        <ChipList max={8} className="mt-3">
          {server.capabilities.map((c) => <Chip key={c} label={c} tone="info" caps />)}
        </ChipList>
      )}

      {/* Actions bottom LEFT, primary first (CONVENTIONS.md §2). */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button compact variant="primary" onClick={() => setOpen(open === "configure" ? null : "configure")}>Configure</Button>
        <Button compact disabled={testing} onClick={() => void runTest()}>{testing ? "Testing…" : "Test"}</Button>
        <Button compact onClick={() => setOpen(open === "connect" ? null : "connect")}>How to connect</Button>
        <ConfirmButton compact confirmLabel="Delete server?" onConfirm={onDelete}>Delete</ConfirmButton>
      </div>

      {open === "test" && (testing || test) && (
        <div className="mt-3 rounded-md border border-ink/15 p-3">
          {testing && <p className="text-[13px] text-ink/70">Contacting the server…</p>}
          {test === "error" ? <p className="text-[13px] text-espelette">Test failed. Check that the API is running.</p> : test && (
            <>
              <p className="text-[13px] font-medium text-ink">
                {test.ok ? "Connected" : "Not responding"}
                {test.latency_ms > 0 && <span className="font-term text-[11.5px] text-ink/65"> · {test.latency_ms}ms</span>}
              </p>
              {/* A failed check answers with a reason instead of throwing, so
                  the card says what the server said (CONVENTIONS §8). */}
              {!test.ok && test.error && <p className="mt-1 font-term text-[12px] text-espelette">{test.error}</p>}
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {Object.entries(test.checks).map(([k, n]) => <li key={k} className="font-term text-[12px] text-ink/70"><span className="text-ink/65">{k}</span> ✓ {n} {MCP_UNITS[k] ?? "items"}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {open === "configure" && (
        <div className="mt-3 rounded-md border border-ink/15 p-3">
          {server.capabilities.length === 0 && <p className="mb-2 text-[12px] text-clay">Legacy server: capabilities were never set. Pick some below.</p>}
          <div className="grid gap-2 sm:grid-cols-2 mb-3">
            <label className="flex flex-col gap-1.5"><SectionLabel>Scope</SectionLabel><Select value={draftScope} onChange={(e) => setDraftScope(e.target.value as McpScope)}>{MCP_SCOPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></label>
          </div>
          <SectionLabel>Capabilities, {capTools(draftCaps)} tools</SectionLabel>
          <div className="mt-1.5"><CapPicker selected={draftCaps} onToggle={toggleDraft} /></div>
          <div className="mt-3 flex items-center gap-2">
            <Button compact variant="primary" disabled={draftCaps.length === 0} onClick={() => { onSave(draftScope, draftCaps); setOpen(null); }}>Save</Button>
            <Button compact onClick={() => setOpen(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {open === "connect" && (
        <div className="mt-3">
          <SectionLabel>Connect from claude-code</SectionLabel>
          <div className="mt-1.5"><CodeBlock language="bash" code={connectSnippet(server.name, server.url, freshToken)} wrap /></div>
          {!freshToken && <p className="mt-1.5 text-[12px] text-ink/70">Replace <span className="font-term">YOUR_TOKEN</span> with the bearer token shown once at creation.</p>}
        </div>
      )}
    </Card>
  );
}
