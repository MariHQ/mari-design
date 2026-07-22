import { useState } from "react";
import { GitFork, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Drawer } from "../layout/Drawer";
import { Button } from "../actions/Button";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Chip } from "../data-display/Chip";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { GithubMark } from "../icons/marks";
import { focusRing } from "../tokens/focusRing";

/* WelcomeGithubConnect — the Welcome wizard's GitHub sub-flow: pick a repo from
   the token-scoped list, set a paths glob, connect (creates a source), then
   watch the first sync in a live <SyncPanel>. Shares the exact repo-picker →
   connect → sync shape as the Sources ConnectorWizard. The local RepoPicker is
   built here (a filterable single-select radio list); githubRepos /
   connectGithubRepo / syncStatus are baked in. Standalone: opens by default. */

const DEFAULT_PATHS = "**/*.md";

type Repo = { fullName: string; description: string; private: boolean; defaultBranch: string; connected: boolean };

const REPOS: Repo[] = [
  { fullName: "acme/handbook", description: "Company handbook & policies", private: true, defaultBranch: "main", connected: false },
  { fullName: "acme/api-docs", description: "Public API reference", private: false, defaultBranch: "main", connected: false },
  { fullName: "acme/design-system", description: "Component library docs", private: true, defaultBranch: "main", connected: true },
  { fullName: "acme/runbooks", description: "On-call runbooks", private: true, defaultBranch: "master", connected: false },
  { fullName: "acme/blog", description: "Engineering blog (Markdown)", private: false, defaultBranch: "main", connected: false },
];

function RepoPicker({
  repos, selected, onSelect,
}: { repos: Repo[]; selected: string | null; onSelect: (name: string) => void }) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const shown = repos.filter((r) => !q || r.fullName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  return (
    <div>
      <Input className="w-full mb-2" placeholder="Filter repositories…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {shown.length === 0 ? (
        <p className="text-[12.5px] text-ink/55 py-3">No repositories match "{filter}".</p>
      ) : (
        <div role="radiogroup" aria-label="Repositories" className="grid gap-1.5 max-h-[300px] overflow-y-auto">
          {shown.map((r) => {
            const active = selected === r.fullName;
            return (
              <label
                key={r.fullName}
                className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${focusRing} ${
                  r.connected ? "opacity-55 cursor-not-allowed border-ink/12" : active ? "border-biscay-2 ring-1 ring-biscay-2/40 bg-biscay/[0.04]" : "border-ink/15 hover:border-ink/35"
                }`}
              >
                <input type="radio" name="wc-repo" className="accent-biscay" disabled={r.connected} checked={active} onChange={() => onSelect(r.fullName)} />
                <GitFork size={14} className="text-ink/45 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <b className="text-[13px] font-semibold text-ink truncate">{r.fullName}</b>
                    {r.private && <Chip label="Private" tone="neutral" icon={<Lock size={10} />} />}
                  </span>
                  <span className="block text-[11.5px] text-ink/55 truncate">{r.description}</span>
                </span>
                {r.connected
                  ? <Chip label="Connected" tone="ok" className="shrink-0" />
                  : <span className="shrink-0 font-term text-[11px] text-ink/45">{r.defaultBranch}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type WelcomeGithubConnectProps = {
  repos?: Repo[];
  defaultOpen?: boolean;
  className?: string;
};

export function WelcomeGithubConnect({ repos = REPOS, defaultOpen = true, className = "" }: WelcomeGithubConnectProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [repo, setRepo] = useState<string | null>(null);
  const [paths, setPaths] = useState(DEFAULT_PATHS);
  const [sync, setSync] = useState<SyncSource | null>(null);

  const reset = () => { setRepo(null); setPaths(DEFAULT_PATHS); setSync(null); };

  const connect = () => {
    if (!repo) return;
    const running: SyncSource = {
      id: "github", name: `GitHub · ${repo}`, mark: <GithubMark size={24} />,
      state: "syncing", phase: "Fetching", done: 30, total: 240, chunkCount: 410, embeddedCount: 90,
    };
    setSync(running);
    window.setTimeout(() => setSync({
      ...running, state: "done", phase: undefined,
      docCount: 240, chunkCount: 3180, embeddedCount: 3180, lastSyncAt: new Date().toISOString(),
    }), 1600);
  };

  const connected = sync != null;
  const footer = connected ? (
    <div className="flex-1 flex items-center gap-3">
      <span className="text-[12px] text-ink/55 flex-1">Sync continues on the server — closing won't interrupt it.</span>
      <Button variant="primary" onClick={() => { setOpen(false); reset(); }}>Done <CheckCircle2 size={14} /></Button>
    </div>
  ) : (
    <div className="flex-1 flex items-center gap-3">
      <span className="text-[12px] text-ink/55 flex-1">Mari Cloud syncs Markdown docs read-only.</span>
      <Button variant="primary" disabled={!repo} onClick={connect}>Connect &amp; sync <ArrowRight size={14} /></Button>
    </div>
  );

  return (
    <div className={className}>
      <Button variant="primary" onClick={() => { reset(); setOpen(true); }}><GithubMark size={15} /> Connect GitHub</Button>
      <Drawer open={open} onClose={() => { setOpen(false); reset(); }} title="Connect GitHub" subtitle="Connector setup"
        icon={<GithubMark size={20} />} footer={footer}>
        {connected ? (
          <>
            <p className="text-[13px] text-ink/70 mb-3">The initial sync runs on the server — live status below.</p>
            <SyncPanel sources={[sync!]} onRetry={() => setSync((s) => (s ? { ...s, state: "syncing" } : s))} />
          </>
        ) : (
          <>
            <p className="text-[13px] text-ink/70 mb-3">Pick a repository from your token's scope, then optionally narrow to a paths glob.</p>
            <RepoPicker repos={repos} selected={repo} onSelect={(n) => setRepo(n)} />
            <div className="mt-3">
              <Field label="Paths filter (glob)">
                <Input className="w-full font-term" value={paths} onChange={(e) => setPaths(e.target.value)} placeholder={DEFAULT_PATHS} />
              </Field>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
