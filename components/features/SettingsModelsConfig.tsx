import { useState } from "react";
import { Layers, Sparkles, KeyRound, Eye, EyeOff, FileText } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Chip } from "../data-display/Chip";
import { SkeletonCard, SkeletonTable } from "../data-display/Skeleton";
import { Spinner } from "../data-display/Spinner";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { Scrollable } from "../data-display/Scrollable";
import { PagerBar, ResultCount, usePaged } from "../data-display/Pagination";
import { Truncate } from "../data-display/Truncate";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";

/* Settings — Models configuration ─────────────────────────────────────────
   Choose which models embed, search, and answer for the workspace: the
   embedding model, the LLM provider+model, provider API keys (with reveal
   toggles), a live-ish connection test, and per-source chunking parameters.
   Source: web/src/pages/settings/Models.tsx. Every control writes through
   `actions` when the host supplies them; with none, each keeps the local echo
   `useWrite` defines, and Test connection falls back to validating what is on
   screen rather than claiming to have reached a provider. */

/* Fallbacks for a caller that has no catalog of its own. A workspace's real
   options arrive as props: this list is what the panel offers when nobody has
   said what the deployment supports. */
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

/** How one connected source is split before embedding. */
export type ChunkRow = { source: string; strategy: string; max_tokens: number; overlap: number };

/** Provider API keys, as the server hands them back. */
export type ProviderKeys = { openai: string; anthropic: string };

function SavedNote({ show }: { show: boolean }) {
  return show ? <span className="font-term text-[11.5px] text-moss">✓ Saved</span> : null;
}

/** What the model configuration can DO.

    `saveLlm` is given whatever is in the key fields. Keys arrive from the
    server MASKED, so a field the user never touched still holds "••••…1234";
    a handler must not write that back over a real key. */
export type SettingsModelsActions = {
  /** `dims` is null when the model has just been changed: vector width is a
      property of the model, and this panel does not know what the new one's
      is. The server sets it when it takes the model. Only an unchanged model
      reports the dimensions it is already indexed at. */
  saveEmbedding?: (m: { model: string; dims: number | null }) => void | Promise<void>;
  saveLlm?: (m: { model: string; openai: string; anthropic: string }) => void | Promise<void>;
  /** Ask the server whether the provider actually answers. Optional, and the
      only reason "Testing…" is a real state rather than a picture of one: with
      no handler the button falls back to the local validation below, which
      checks that an endpoint and a key are set and says so honestly, without
      claiming to have reached OpenAI. */
  testConnection?: (p: { model: string; endpoint: string }) => { ok: boolean; text: string } | Promise<{ ok: boolean; text: string }>;
  /** Persist the chunking table. The rows name sources the way the console
      does, not by the key the `chunking` setting is stored under, so an app
      can only implement this if it can map a row back to its source. With no
      handler the Save keeps the local echo every other control here uses. */
  saveChunking?: (rows: ChunkRow[]) => void | Promise<void>;
};

export type SettingsModelsConfigProps = {
  /** Hide the internal PageHeader when the host page already renders one. */
  embedded?: boolean;
  embedding: string;
  llm: string;
  dims: number;
  /** What this deployment actually offers. Empty falls back to the built-in
      catalog: a workspace running its own models is not limited to the three
      names this file happens to know. */
  embeddingOptions?: string[];
  llmOptions?: string[];
  chunking: ChunkRow[];
  keys: ProviderKeys;
  actions?: SettingsModelsActions;
  /** Corpus line appended to a healthy connection test. */
  indexSummary: string;
  /* ── Lifecycle pins, for a canvas that has to capture a step without
     clicking through to it. Same purpose as `confirmRevokeId` on the API-keys
     panel, and the reason the Models PAGE no longer keeps a static twin of
     this form: every step below is now this component, in that state. */
  /** Show a section as having unsaved changes. */
  unsaved?: "embedding" | "llm" | null;
  /** Pin the connection test's outcome. */
  testStatus?: { status: "testing" | "ok" | "fail"; text: string } | null;
  /** Pin the "✓ Saved" notes. */
  savedFlash?: boolean;
  loading?: boolean;
  className?: string;
};

export function SettingsModelsConfig({
  embedding,
  llm,
  dims,
  embeddingOptions,
  llmOptions,
  chunking: initialChunking,
  keys,
  actions,
  indexSummary,
  unsaved = null,
  testStatus = null,
  savedFlash = false,
  loading = false,
  embedded = false,
  className = "",
}: SettingsModelsConfigProps) {
  const [emb, setEmb] = useState(embedding);
  const [embSaved, setEmbSaved] = useState(false);
  const [llmSel, setLlmSel] = useState(llm);
  const [openaiKey, setOpenaiKey] = useState(keys.openai);
  const [anthropicKey, setAnthropicKey] = useState(keys.anthropic);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testDismissed, setTestDismissed] = useState(false);
  const [endpoint, setEndpoint] = useState(PROVIDER_ENDPOINT.anthropic);
  const [chunk, setChunk] = useState<ChunkRow[]>(initialChunking);
  const [chunkSaved, setChunkSaved] = useState(false);

  /* Every buffer above is seeded from a prop, and `useState` reads its seed
     once — so after a refetch this panel kept editing the FIRST response and
     a save would have written it back over the newer one (C1). */
  const [seen, setSeen] = useState({ embedding, llm, keys, initialChunking });
  if (seen.embedding !== embedding || seen.llm !== llm || seen.keys !== keys || seen.initialChunking !== initialChunking) {
    setSeen({ embedding, llm, keys, initialChunking });
    setEmb(embedding);
    setLlmSel(llm);
    setOpenaiKey(keys.openai);
    setAnthropicKey(keys.anthropic);
    setChunk(initialChunking);
  }

  const flash = (set: (v: boolean) => void) => { set(true); setTimeout(() => set(false), 1600); };

  /* With no `actions` these are the same "✓ Saved" flashes this panel has
     always shown, which is what the design canvas renders. With actions the
     flash only happens once the server has taken the change. */
  const write = useWrite();
  /* Changing the embedding model re-indexes the whole corpus, so the dims the
     workspace is indexed at describe the SAVED model, not the one just picked
     (P-SD-2: a hardcoded 768/1536/3072 menu let you claim 3072 for a 768-dim
     model). Null means "the server decides, from the model". */
  const embChanged = emb !== embedding;
  const saveEmbedding = () => write.run(
    actions?.saveEmbedding && (() => actions.saveEmbedding!({ model: emb, dims: embChanged ? null : dims })),
    () => flash(setEmbSaved),
  );
  const saveLlm = () => write.run(
    actions?.saveLlm && (() => actions.saveLlm!({ model: llmSel, openai: openaiKey, anthropic: anthropicKey })),
    () => flash(setLlmSaved),
  );

  const saveChunking = () => write.run(
    actions?.saveChunking && (() => actions.saveChunking!(chunk)),
    () => flash(setChunkSaved),
  );

  const setChunkField = (source: string, field: keyof ChunkRow, value: string) =>
    setChunk((c) => c.map((r) => (r.source === source ? { ...r, [field]: field === "strategy" ? value : Number(value) || 0 } : r)));

  const embCatalog = embeddingOptions?.length ? embeddingOptions : EMB_OPTIONS;
  const llmCatalog = llmOptions?.length ? llmOptions : LLM_OPTIONS;
  const embOpts = embCatalog.includes(emb) ? embCatalog : [emb, ...embCatalog];
  const llmOpts = llmCatalog.includes(llmSel) ? llmCatalog : [llmSel, ...llmCatalog];

  const provider = llmSel.split(":")[0];
  const activeKey = provider === "anthropic" ? anthropicKey : openaiKey;

  /* With a handler this is the server's answer, and "Testing…" is a real
     wait. With none it is genuine local validation: no endpoint or no key
     means the test FAILS rather than reporting a connection nobody made. */
  const testConnection = async () => {
    setTestDismissed(false);
    if (actions?.testConnection) {
      setTesting(true);
      const result = await write.runFor(() => actions.testConnection!({ model: llmSel, endpoint: endpoint.trim() }));
      setTesting(false);
      if (result) setHealth(result);
      return;
    }
    const ok = endpoint.trim().length > 0 && activeKey.trim().length > 0;
    setHealth(ok
      ? { ok: true, text: `${endpoint.trim()} · ${indexSummary}` }
      : { ok: false, text: endpoint.trim().length === 0 ? "No endpoint is set." : "No API key is set." });
  };

  /* What is on screen: this panel's own state, or the step a canvas pinned.
     Dismissing clears both, so the dismiss control is never a picture. */
  const busyTest = (testing || testStatus?.status === "testing") && !testDismissed;
  const pinned = testStatus && testStatus.status !== "testing" && !testDismissed
    ? { ok: testStatus.status === "ok", text: testStatus.text }
    : null;
  const shownHealth = health ?? pinned;
  const embDirty = embChanged || unsaved === "embedding";
  const llmDirty = llmSel !== llm || openaiKey !== keys.openai || anthropicKey !== keys.anthropic || unsaved === "llm";

  const { sort, onSort, sorted } = useSort(chunk, {
    source: (r) => r.source,
    strategy: (r) => r.strategy,
    max_tokens: (r) => r.max_tokens,
    overlap: (r) => r.overlap,
  });

  /* One chunking row per connected source: a large workspace has dozens. */
  const pager = usePaged(sorted, 10);

  /* Which four panels this page has, and what they are called, is settled
     here and not by the server: only WHICH model is selected in each is in
     flight. The panel headings render at their real sizes so the four cards
     do not resize on arrival. */
  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-busy="true">
        {!embedded && <PageHeader title="Models" description="Choose which models embed, search, and answer for this workspace" />}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SkeletonCard title="Embedding model" lines={2} />
          <SkeletonCard title="LLM provider" lines={2} />
        </div>
        <SkeletonCard title="LLM provider keys" lines={3} />
        <Card variant="flush" title="Chunking">
          <SkeletonTable rows={3} columns={["Source", "Strategy", "Max tokens", "Overlap"]} className="border-0 rounded-none" />
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      {!embedded && <PageHeader title="Models" description="Choose which models embed, search, and answer for this workspace" />}

      {/* One failure surface for both saves, in the server's own words (§8). */}
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Dimensions are a fact about the SAVED model, so the hint stops
            claiming a number the moment the selection changes. */}
        <Card icon={<Layers size={16} className="text-biscay-2" />} title="Embedding model" hint={embChanged ? "Dimensions follow the model" : dims ? `${dims} dims` : undefined}>
          <Field label="Model">
            <Select
              value={emb}
              onChange={(e) => setEmb(e.target.value)}
              className={`w-full ${embDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {embOpts.map((o, i) => <option key={o} value={o}>{optionLabel(o)}{i === 0 ? " (default)" : ""}</option>)}
            </Select>
            {embDirty && <p className="mt-1 text-[11.5px] text-ink/70">Saving re-indexes every document. Search is degraded until the run finishes.</p>}
          </Field>
          <div className="mt-3 flex items-center gap-3">
            {/* Re-indexing the corpus is not a first-click action (§2, P-SD-3).
                An unchanged model has nothing to re-index, so it saves plain. */}
            {embChanged ? (
              <ConfirmButton compact confirmVariant="primary" confirmLabel="Re-index everything?" disabled={write.busy} onConfirm={() => void saveEmbedding()}>Save</ConfirmButton>
            ) : (
              <Button variant="primary" compact disabled={write.busy || !embDirty} onClick={() => void saveEmbedding()}>Save</Button>
            )}
            <SavedNote show={embSaved || savedFlash} />
          </div>
        </Card>

        <Card icon={<Sparkles size={16} className="text-clay" />} title="LLM provider" hint={llmDirty ? "Unsaved changes" : undefined}>
          <Field label="Model">
            <Select
              value={llmSel}
              onChange={(e) => setLlmSel(e.target.value)}
              className={`w-full ${llmDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {llmOpts.map((o) => <option key={o} value={o}>{optionLabel(o)}</option>)}
            </Select>
          </Field>
          <div className="mt-3 flex items-center gap-3"><Button variant="primary" compact disabled={write.busy} onClick={() => void saveLlm()}>Save</Button><SavedNote show={llmSaved || savedFlash} /></div>
        </Card>
      </div>

      <Card icon={<KeyRound size={16} className="text-biscay-2" />} title="LLM provider keys" hint="Stored server-side, re-fetchable">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <Button variant="primary" compact disabled={write.busy} onClick={() => void saveLlm()}>Save changes</Button>
          <Button compact disabled={busyTest} onClick={() => void testConnection()}>{busyTest ? "Testing…" : "Test connection"}</Button>
          {busyTest && <span className="inline-flex items-center gap-2 text-[11.5px] text-ink/70"><Spinner size="sm" /> Contacting provider…</span>}
          {!busyTest && shownHealth?.ok && (
            <span className="inline-flex items-center gap-2">
              <Chip label="Connected" tone="ok" dot caps />
              <span className="font-term text-[11.5px] text-ink/70">{shownHealth.text}</span>
            </span>
          )}
          <SavedNote show={savedFlash} />
        </div>
        {!busyTest && shownHealth && !shownHealth.ok && (
          <div className="mt-3">
            <ErrorMessage id="model.testFailed" onAction={() => void testConnection()} onDismiss={() => { setHealth(null); setTestDismissed(true); }}>
              {shownHealth.text}
            </ErrorMessage>
          </div>
        )}
      </Card>

      <Card variant="flush" icon={<FileText size={16} className="text-ink/65" />} title="Chunking">
        {chunk.length === 0 ? (
          <EmptyState title="No chunking rules">Rules appear here once a source has synced at least once.</EmptyState>
        ) : (
        <>
        <ResultCount from={pager.from} to={pager.to} total={pager.total} noun="sources" />
        <Scrollable>
          <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: 680 }}>
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
              {pager.pageRows.map((r) => {
                const opts = STRATEGIES.includes(r.strategy) ? STRATEGIES : [r.strategy, ...STRATEGIES];
                return (
                  <tr key={r.source} className="border-b border-ink/10 last:border-0 align-top">
                    {/* Source names truncate; they never widen the column
                        (CONVENTIONS §12). */}
                    <td className={tdPad}><Truncate className="text-[13px] font-medium text-ink">{r.source}</Truncate></td>
                    <td className={`${tdPad} text-center`}>
                      {/* max-w: a <select> sizes itself to its WIDEST option, so
                          a strategy name from a stored config (user data) drove
                          the cell 696px past the table. The control is bounded;
                          the option text ellipsises inside it. */}
                      <Select value={r.strategy} onChange={(e) => setChunkField(r.source, "strategy", e.target.value)} className="h-8 w-full max-w-[190px]">
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
        </Scrollable>
        {pager.paged && <PagerBar page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} />}
        </>
        )}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-ink/10">
          <Button variant="primary" compact disabled={write.busy} onClick={() => void saveChunking()}>Save</Button>
          <SavedNote show={chunkSaved} />
        </div>
      </Card>
    </div>
  );
}
