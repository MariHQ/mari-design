import { useState } from "react";
import { Layers, Sparkles, KeyRound, Eye, EyeOff, FileText } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Chip } from "../data-display/Chip";

/* Settings — Models configuration ─────────────────────────────────────────
   Choose which models embed, search, and answer for the workspace: the
   embedding model, the LLM provider+model, provider API keys (with reveal
   toggles), a live-ish connection test, and per-source chunking parameters.
   Source: web/src/pages/settings/Models.tsx. Standalone — Save flashes a
   note, Test connection returns a baked-in healthy result (no network). */

const EMB_OPTIONS = ["openai:text-embedding-3-small", "openai:text-embedding-3-large", "local:bge-base-en"];
const LLM_OPTIONS = ["anthropic:claude-3-5-sonnet", "openai:gpt-4o", "openai:gpt-4o-mini", "ollama:llama3.1"];
const STRATEGIES = ["heading", "thread", "fixed"];

const PROVIDER_LABEL: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", ollama: "Ollama", local: "Local" };
function optionLabel(opt: string): string {
  const [prov, ...rest] = opt.split(":");
  return `${PROVIDER_LABEL[prov] ?? prov} — ${rest.join(":")}`;
}

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

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
  className?: string;
};

export function SettingsModelsConfig({
  embedding = EMB_OPTIONS[0],
  llm = LLM_OPTIONS[0],
  dims = 1536,
  chunking: initialChunking = DEMO_CHUNKING,
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
  const [chunk, setChunk] = useState<ChunkRow[]>(initialChunking);
  const [chunkSaved, setChunkSaved] = useState(false);

  const flash = (set: (v: boolean) => void) => { set(true); setTimeout(() => set(false), 1600); };

  const setChunkField = (source: string, field: keyof ChunkRow, value: string) =>
    setChunk((c) => c.map((r) => (r.source === source ? { ...r, [field]: field === "strategy" ? value : Number(value) || 0 } : r)));

  const embOpts = EMB_OPTIONS.includes(emb) ? EMB_OPTIONS : [emb, ...EMB_OPTIONS];
  const llmOpts = LLM_OPTIONS.includes(llmSel) ? LLM_OPTIONS : [llmSel, ...LLM_OPTIONS];

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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" compact onClick={() => flash(setLlmSaved)}>Save changes</Button>
          <Button compact onClick={() => setHealth({ ok: true, text: "mari-api · 12,480 documents · 12,201 embedded" })}>Test connection</Button>
          {health && (
            <span className="inline-flex items-center gap-2">
              <Chip label={health.ok ? "Connected" : "Unhealthy"} tone={health.ok ? "ok" : "blocked"} dot caps />
              <span className="font-term text-[11.5px] text-ink/60">{health.text}</span>
            </span>
          )}
        </div>
      </Card>

      <Card variant="flush" icon={<FileText size={16} className="text-ink/50" />} title="Chunking">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 640 }}>
            <thead><tr>{["Source", "Strategy", "Max tokens", "Overlap"].map((h) => <th key={h} className={`${thClass} px-4 py-2.5 border-y border-ink/10`}>{h}</th>)}</tr></thead>
            <tbody>
              {chunk.map((r) => {
                const opts = STRATEGIES.includes(r.strategy) ? STRATEGIES : [r.strategy, ...STRATEGIES];
                return (
                  <tr key={r.source} className="border-b border-ink/10 last:border-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.source}</td>
                    <td className="px-4 py-3"><Select value={r.strategy} onChange={(e) => setChunkField(r.source, "strategy", e.target.value)} className="h-8">{opts.map((s) => <option key={s} value={s}>{s}</option>)}</Select></td>
                    <td className="px-4 py-3"><Input type="number" value={r.max_tokens} onChange={(e) => setChunkField(r.source, "max_tokens", e.target.value)} className="h-8 w-24 font-term" /></td>
                    <td className="px-4 py-3"><Input type="number" value={r.overlap} onChange={(e) => setChunkField(r.source, "overlap", e.target.value)} className="h-8 w-24 font-term" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-t border-ink/10"><Button variant="primary" compact onClick={() => flash(setChunkSaved)}>Save</Button><SavedNote show={chunkSaved} /></div>
      </Card>
    </div>
  );
}
