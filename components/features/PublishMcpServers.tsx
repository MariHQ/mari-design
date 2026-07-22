import { useState } from "react";
import { Plus, KeyRound } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { CopyButton } from "../actions/CopyButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip, CountChip } from "../data-display/Chip";
import { CodeBlock } from "../data-display/CodeBlock";
import { EmptyState } from "../data-display/EmptyState";
import { TokenReveal as TokenRevealUI } from "../data-display/TokenReveal";
import { focusRing } from "../tokens/focusRing";

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

type McpServer = { id: number; name: string; url: string; scope: "project" | "org"; status: "connected" | "idle"; capabilities: string[] };
type McpTest = { ok: boolean; latency_ms: number; checks: Record<string, number> } | "error" | null;

const DEMO_SERVERS: McpServer[] = [
  { id: 1, name: "support-kb", url: "https://mcp.acme.com/s/support-kb", scope: "project", status: "connected", capabilities: ["search", "facts", "answers"] },
  { id: 2, name: "eng-lineage", url: "https://mcp.acme.com/s/eng-lineage", scope: "org", status: "idle", capabilities: ["search", "lineage"] },
  { id: 3, name: "legacy-bot", url: "https://mcp.acme.com/s/legacy-bot", scope: "project", status: "idle", capabilities: [] },
];

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
              <span className="font-term text-[11.5px] text-ink/45"> · {c.tools} tools</span>
              <span className="block text-[12px] text-ink/55">{c.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type PublishMcpServersProps = { servers?: McpServer[]; className?: string };

export function PublishMcpServers({ servers: initialServers = DEMO_SERVERS, className = "" }: PublishMcpServersProps) {
  const [servers, setServers] = useState<McpServer[]>(initialServers);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"project" | "org">("project");
  const [caps, setCaps] = useState<string[]>(["search", "facts"]);
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);

  const toggleCap = (setter: (fn: (c: string[]) => string[]) => void) => (k: string) =>
    setter((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const create = () => {
    if (!name.trim() || caps.length === 0) return;
    const token = randomToken();
    const id = Math.max(0, ...servers.map((s) => s.id)) + 1;
    const url = `https://mcp.acme.com/s/${name.trim()}`;
    setServers((s) => [...s, { id, name: name.trim(), url, scope, status: "idle", capabilities: caps }]);
    setFresh({ name: name.trim(), token });
    setName(""); setScope("project"); setCaps(["search", "facts"]); setCreating(false);
  };

  const del = (id: number) => setServers((s) => s.filter((x) => x.id !== id));
  const saveCaps = (id: number, scope: "project" | "org", capabilities: string[]) =>
    setServers((s) => s.map((x) => (x.id === id ? { ...x, scope, capabilities } : x)));

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader
        title="MCP servers"
        description="Expose your curated knowledge to Claude and other agents — per-project, capability-scoped."
        actions={<><CountChip count={servers.length} /><Button variant="primary" onClick={() => setCreating((v) => !v)}><Plus size={15} /> New server</Button></>}
      />

      {fresh && (
        <TokenRevealUI token={fresh.token} title={`${fresh.name} is live — here's your bearer token`} onDismiss={() => setFresh(null)} />
      )}

      {creating && (
        <Card title="New MCP server">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><SectionLabel>Name</SectionLabel><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="support-kb" className="w-full" /></label>
            <label className="flex flex-col gap-1.5"><SectionLabel>Scope</SectionLabel><Select value={scope} onChange={(e) => setScope(e.target.value as "project" | "org")} className="w-full"><option value="project">project</option><option value="org">org</option></Select></label>
          </div>
          <div className="mt-4"><SectionLabel>Capabilities — {capTools(caps)} tools selected</SectionLabel><div className="mt-1.5"><CapPicker selected={caps} onToggle={toggleCap(setCaps)} /></div></div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="primary" disabled={!name.trim() || caps.length === 0} onClick={create}>Create server</Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {servers.length === 0 ? (
        <Card><EmptyState icon={<KeyRound size={24} />} title="No MCP servers yet">Create one to expose this knowledge base to agents.</EmptyState></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {servers.map((s) => (
            <ServerCard key={s.id} server={s} freshToken={fresh?.name === s.name ? fresh.token : undefined} onDelete={() => del(s.id)} onSave={(scope, caps) => saveCaps(s.id, scope, caps)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerCard({ server, freshToken, onDelete, onSave }: {
  server: McpServer; freshToken?: string; onDelete: () => void; onSave: (scope: "project" | "org", caps: string[]) => void;
}) {
  const [open, setOpen] = useState<null | "test" | "configure" | "connect">(null);
  const [test, setTest] = useState<McpTest>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [draftScope, setDraftScope] = useState(server.scope);
  const [draftCaps, setDraftCaps] = useState<string[]>(server.capabilities);

  const runTest = () => {
    setOpen("test");
    const checks: Record<string, number> = {};
    server.capabilities.forEach((c) => { checks[c] = Math.floor(Math.random() * 400) + 20; });
    setTest({ ok: server.status === "connected", latency_ms: 40 + Math.floor(Math.random() * 60), checks });
  };
  const toggleDraft = (k: string) => setDraftCaps((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const dotColor = server.status === "connected" ? "bg-moss" : "bg-[#c9bda0]";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-[14px] font-semibold text-ink">{server.name}</span>
        <Chip label={server.scope} tone="neutral" caps />
        <span className="font-term text-[11.5px] text-ink/50">{capTools(server.capabilities)} tools</span>
        <span className="font-term text-[11.5px] text-ink/40 truncate max-w-[220px] hidden sm:inline">{server.url}</span>
        <CopyButton value={server.url} label="Copy" className="ml-auto" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {server.capabilities.length === 0 ? <span className="text-[12.5px] italic text-ink/45">capabilities not set</span> : server.capabilities.map((c) => <Chip key={c} label={c} tone="info" caps />)}
        <span className="ml-auto flex items-center gap-1.5">
          <Button compact onClick={() => setOpen(open === "configure" ? null : "configure")}>Configure</Button>
          <Button compact onClick={runTest}>Test</Button>
          <Button compact onClick={() => setOpen(open === "connect" ? null : "connect")}>How to connect</Button>
          {confirmDel ? (
            <><Button compact variant="danger" onClick={onDelete}>Really delete?</Button><Button compact onClick={() => setConfirmDel(false)}>Keep</Button></>
          ) : <Button compact variant="danger" onClick={() => setConfirmDel(true)}>Delete</Button>}
        </span>
      </div>

      {open === "test" && test && (
        <div className="mt-3 rounded-md border border-ink/15 p-3">
          {test === "error" ? <p className="text-[13px] text-espelette">Test failed — is the API running?</p> : (
            <>
              <p className="text-[13px] font-medium text-ink">{test.ok ? "Connected" : "Not responding"} <span className="font-term text-[11.5px] text-ink/50">· {test.latency_ms}ms</span></p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {Object.entries(test.checks).map(([k, n]) => <li key={k} className="font-term text-[12px] text-ink/70"><span className="text-ink/50">{k}</span> ✓ {n} {MCP_UNITS[k] ?? "items"}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {open === "configure" && (
        <div className="mt-3 rounded-md border border-ink/15 p-3">
          {server.capabilities.length === 0 && <p className="mb-2 text-[12px] text-clay">Legacy server — capabilities were never set. Pick some below.</p>}
          <div className="grid gap-2 sm:grid-cols-2 mb-3">
            <label className="flex flex-col gap-1.5"><SectionLabel>Scope</SectionLabel><Select value={draftScope} onChange={(e) => setDraftScope(e.target.value as "project" | "org")}><option value="project">project</option><option value="org">org</option></Select></label>
          </div>
          <SectionLabel>Capabilities — {capTools(draftCaps)} tools</SectionLabel>
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
          {!freshToken && <p className="mt-1.5 text-[12px] text-ink/50">Replace <span className="font-term">YOUR_TOKEN</span> with the bearer token shown once at creation.</p>}
        </div>
      )}
    </Card>
  );
}
