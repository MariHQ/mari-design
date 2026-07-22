import { useState } from "react";
import { Layers, Sparkles, KeyRound, Eye, EyeOff, FileText } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Chip } from "../data-display/Chip";
import { Skeleton, SkeletonLine, SkeletonCard, SkeletonTable } from "../data-display/Skeleton";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";

/* Settings — Models configuration ─────────────────────────────────────────
   Choose which models embed, search, and answer for the workspace: the
   embedding model, the LLM provider+model, provider API keys (with reveal
   toggles), a live-ish connection test, and per-source chunking parameters.
   Source: web/src/pages/settings/Models.tsx. Standalone — Save flashes a
   note, Test connection returns a baked-in healthy result (no network). */

const EMB_OPTIONS = ["openai:text-embedding-3-small", "openai:text-embedding-3-large", "local:bge-base-en"];
const LLM_OPTIONS = ["anthropic:claude-3-5-sonnet", "openai:gpt-4o", "openai:gpt-4o-mini", "ollama:llama3.1"];
const STRATEGIES = ["heading", "thread", "fixed"];
/* Dropdown options that name a strategy are Capitalized (CONVENTIONS.md §7). */
const strategyLabel = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/* The endpoint a provider key is tested against. Empty endpoint or empty key
   is a FAILURE, not a pass: "Test connection" used to report "Connected"
   after the fields had been emptied and saved. */
const PROVIDER_ENDPOINT: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  ollama: "http://localhost:11434",
  local: "",
};

const PROVIDER_LABEL: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", ollama: "Ollama", local: "Local" };
function optionLabel(opt: string): string {
  const [prov, ...rest] = opt.split(":");
  return `${PROVIDER_LABEL[prov] ?? prov}: ${rest.join(":")}`;
}

type ChunkRow = { source: string; strategy: string; max_tokens: number; overlap: number };
const DEMO_CHUNKING: ChunkRow[] = [
  { source: "GitHub", strategy: "heading", max_tokens: 800, overlap: 80 },
  { source: "Slack", strategy: "thread", max_tokens: 512, overlap: 0 },
  { source: "Google Drive", strategy: "fixed", max_tokens: 1024, overlap: 128 },
];

function SavedNote({ show }: { show: boolean }) {
  return show ? <span className="font-term text-[11.5px] text-moss">✓ Saved</span> : null;
}

export type SettingsModelsConfigProps = {
  embedding?: string;
  llm?: string;
  dims?: number;
  chunking?: ChunkRow[];
  loading?: boolean;
  className?: string;
};

export function SettingsModelsConfig({
  embedding = EMB_OPTIONS[0],
  llm = LLM_OPTIONS[0],
  dims = 1536,
  chunking: initialChunking = DEMO_CHUNKING,
  loading = false,
  className = "",
}: SettingsModelsConfigProps) {
  const [emb, setEmb] = useState(embedding);
  const [embSaved, setEmbSaved] = useState(false);
  const [llmSel, setLlmSel] = useState(llm);
  const [openaiKey, setOpenaiKey] = useState("sk-proj-9f2ac0d18b7e4a3c");
  const [anthropicKey, setAnthropicKey] = useState("sk-ant-api03-77de10bc2f");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; text: string } | null>(null);
  const [endpoint, setEndpoint] = useState(PROVIDER_ENDPOINT.anthropic);
  const [chunk, setChunk] = useState<ChunkRow[]>(initialChunking);
  const [chunkSaved, setChunkSaved] = useState(false);

  const flash = (set: (v: boolean) => void) => { set(true); setTimeout(() => set(false), 1600); };

  const setChunkField = (source: string, field: keyof ChunkRow, value: string) =>
    setChunk((c) => c.map((r) => (r.source === source ? { ...r, [field]: field === "strategy" ? value : Number(value) || 0 } : r)));

  const embOpts = EMB_OPTIONS.includes(emb) ? EMB_OPTIONS : [emb, ...EMB_OPTIONS];
  const llmOpts = LLM_OPTIONS.includes(llmSel) ? LLM_OPTIONS : [llmSel, ...LLM_OPTIONS];

  const provider = llmSel.split(":")[0];
  const activeKey = provider === "anthropic" ? anthropicKey : openaiKey;

  /* Genuine validation. No endpoint or no key means the test FAILS. */
  const testConnection = () => {
    const ok = endpoint.trim().length > 0 && activeKey.trim().length > 0;
    setHealth(ok
      ? { ok: true, text: `${endpoint.trim()} · 12,480 documents · 12,201 embedded` }
      : { ok: false, text: endpoint.trim().length === 0 ? "No endpoint is set." : "No API key is set." });
  };

  const { sort, onSort, sorted } = useSort(chunk, {
    source: (r) => r.source,
    strategy: (r) => r.strategy,
    max_tokens: (r) => r.max_tokens,
    overlap: (r) => r.overlap,
  });

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="space-y-2.5"><Skeleton width={130} height={20} /><SkeletonLine w={340} h={11} /></div>
        <div className="grid gap-5 lg:grid-cols-2"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
        <SkeletonCard lines={3} />
        <SkeletonTable rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader title="Models" description="Choose which models embed, search, and answer for this workspace" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={<Layers size={16} className="text-biscay-2" />} title="Embedding model" hint={`${dims} dims`}>
          <Field label="Model">
            <Select value={emb} onChange={(e) => setEmb(e.target.value)} className="w-full">
              {embOpts.map((o, i) => <option key={o} value={o}>{optionLabel(o)}{i === 0 ? " (default)" : ""}</option>)}
            </Select>
          </Field>
          <div className="mt-3 flex items-center gap-3"><Button variant="primary" compact onClick={() => flash(setEmbSaved)}>Save</Button><SavedNote show={embSaved} /></div>
        </Card>

        <Card icon={<Sparkles size={16} className="text-clay" />} title="LLM provider">
          <Field label="Model">
            <Select value={llmSel} onChange={(e) => setLlmSel(e.target.value)} className="w-full">
              {llmOpts.map((o) => <option key={o} value={o}>{optionLabel(o)}</option>)}
            </Select>
          </Field>
          <div className="mt-3 flex items-center gap-3"><Button variant="primary" compact onClick={() => flash(setLlmSaved)}>Save</Button><SavedNote show={llmSaved} /></div>
        </Card>
      </div>

      <Card icon={<KeyRound size={16} className="text-biscay-2" />} title="LLM provider keys" hint="Stored server-side, re-fetchable">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="OpenAI (sk-…)">
            <div className="flex items-center gap-1.5">
              <Input type={showOpenai ? "text" : "password"} value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} className="w-full font-term" />
              <Button icon compact aria-pressed={showOpenai} aria-label={showOpenai ? "Hide key" : "Reveal key"} onClick={() => setShowOpenai((v) => !v)}>{showOpenai ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
            </div>
          </Field>
          <Field label="Anthropic (sk-ant-…)">
            <div className="flex items-center gap-1.5">
              <Input type={showAnthropic ? "text" : "password"} value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} className="w-full font-term" />
              <Button icon compact aria-pressed={showAnthropic} aria-label={showAnthropic ? "Hide key" : "Reveal key"} onClick={() => setShowAnthropic((v) => !v)}>{showAnthropic ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
            </div>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Endpoint">
            <Input type="url" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setHealth(null); }} placeholder="https://api.anthropic.com/v1" className="w-full font-term" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" compact onClick={() => flash(setLlmSaved)}>Save changes</Button>
          <Button compact onClick={testConnection}>Test connection</Button>
          {health?.ok && (
            <span className="inline-flex items-center gap-2">
              <Chip label="Connected" tone="ok" dot caps />
              <span className="font-term text-[11.5px] text-ink/70">{health.text}</span>
            </span>
          )}
        </div>
        {health && !health.ok && (
          <div className="mt-3">
            <ErrorMessage id="model.testFailed" onAction={testConnection} onDismiss={() => setHealth(null)}>
              {health.text}
            </ErrorMessage>
          </div>
        )}
      </Card>

      <Card variant="flush" icon={<FileText size={16} className="text-ink/65" />} title="Chunking">
        {chunk.length === 0 ? (
          <EmptyState title="No chunking rules">Rules appear here once a source has synced at least once.</EmptyState>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 680 }}>
            <colgroup><col style={{ width: "40%" }} /><col style={{ width: "22%" }} /><col style={{ width: "19%" }} /><col style={{ width: "19%" }} /></colgroup>
            <thead>
              <tr>
                <SortHeader label="Source" sortKey="source" sort={sort} onSort={onSort} />
                <SortHeader label="Strategy" sortKey="strategy" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Max tokens" sortKey="max_tokens" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Overlap" sortKey="overlap" sort={sort} onSort={onSort} align="center" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const opts = STRATEGIES.includes(r.strategy) ? STRATEGIES : [r.strategy, ...STRATEGIES];
                return (
                  <tr key={r.source} className="border-b border-ink/10 last:border-0 align-top">
                    <td className={`${tdPad} break-all text-[13px] font-medium text-ink`}>{r.source}</td>
                    <td className={`${tdPad} text-center`}>
                      <Select value={r.strategy} onChange={(e) => setChunkField(r.source, "strategy", e.target.value)} className="h-8">
                        {opts.map((v) => <option key={v} value={v}>{strategyLabel(v)}</option>)}
                      </Select>
                    </td>
                    <td className={`${tdPad} text-center`}><Input type="number" value={r.max_tokens} onChange={(e) => setChunkField(r.source, "max_tokens", e.target.value)} className="h-8 w-24 font-term" /></td>
                    <td className={`${tdPad} text-center`}><Input type="number" value={r.overlap} onChange={(e) => setChunkField(r.source, "overlap", e.target.value)} className="h-8 w-24 font-term" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-ink/10"><Button variant="primary" compact onClick={() => flash(setChunkSaved)}>Save</Button><SavedNote show={chunkSaved} /></div>
      </Card>
    </div>
  );
}
