import { useState, type ReactNode } from "react";
import { Layers, Sparkles, KeyRound, Eye, EyeOff } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PageHeader } from "../layout/PageHeader";
import { SkeletonPage } from "../data-display/Skeletons";
import { PropertyList, type PropertyItem } from "../data-display/PropertyList";
import {
  SettingsModelsConfig, type ChunkRow, type ProviderKeys,
} from "../features/SettingsModelsConfig";

/* Settings → Models (pages/settings-models.md). Configure the embedding model,
   LLM provider + keys, connection test, and per-source chunking. The default
   view renders the SettingsModelsConfig feature; the editing / test-connection
   / saved variants render inline cards so each lifecycle step (edit embedding,
   edit LLM, test idle/testing/ok/fail, saved) is captured directly. Under the
   shared settings tab strip.

   Pure presenter: the model selection, the provider keys, the chunking table
   and the rail summary all arrive in `data`. "Not configured" is derived from
   there being no model and no provider, never from a flag. */

const STATES = [
  { id: "default", label: "Model config" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Not configured" },
  { id: "editing-embedding", label: "Editing embedding model" },
  { id: "editing-llm", label: "Editing LLM provider" },
  { id: "test-idle", label: "Test connection (idle)" },
  { id: "test-testing", label: "Testing connection…" },
  { id: "test-ok", label: "Connection OK" },
  { id: "test-fail", label: "Connection failed" },
  { id: "saved", label: "Saved" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which lifecycle step of the model form is on screen. */
export type ModelsPhase =
  | "config" | "editing-embedding" | "editing-llm"
  | "test-idle" | "test-testing" | "test-ok" | "test-fail" | "saved";

/** Everything Settings → Models renders. */
export type SettingsModelsData = {
  phase: ModelsPhase;
  /** The models this workspace is configured with. Empty strings mean the
      workspace has not chosen one yet. */
  embedding: string;
  llm: string;
  dims: number;
  /** What the two dropdowns can offer. */
  embeddingOptions: string[];
  llmOptions: string[];
  /** Per-source chunking table. */
  chunking: ChunkRow[];
  keys: ProviderKeys;
  /** Corpus line appended to a healthy connection test. */
  indexSummary: string;
  /** Detail lines the last connection test produced. */
  testOk: string;
  testError: string;
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
};

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
    <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

function SavedNote() {
  return <span className="font-term text-[11.5px] text-moss">✓ Saved</span>;
}

function TestResult({ data }: { data: SettingsModelsData }) {
  if (data.phase === "test-testing") {
    return <span className="inline-flex items-center gap-2 text-[11.5px] text-ink/60"><Spinner size="sm" /> Contacting provider…</span>;
  }
  if (data.phase === "test-ok") {
    return (
      <span className="inline-flex items-center gap-2">
        <Chip label="Connected" tone="ok" dot caps />
        <span className="font-term text-[11.5px] text-ink/60">{data.testOk}</span>
      </span>
    );
  }
  if (data.phase === "test-fail") {
    return (
      <span className="inline-flex items-center gap-2">
        <Chip label="Unreachable" tone="blocked" dot caps />
        <span className="font-term text-[11.5px] text-espelette">{data.testError}</span>
      </span>
    );
  }
  return null;
}

function ModelsInline({ data }: { data: SettingsModelsData }) {
  const variant = data.phase;
  const embDirty = variant === "editing-embedding";
  const llmDirty = variant === "editing-llm";
  return (
    <>
      <Card icon={<Layers size={16} className="text-biscay-2" />} title="Models" hint="Embedding + generation">
        <div className={FORM_GRID}>
          <Field label="Embedding model">
            <Select
              defaultValue={data.embedding}
              className={`w-full ${embDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {data.embeddingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
            {embDirty && <p className="mt-1 text-[11.5px] text-ink/65">Re-indexes all documents</p>}
          </Field>
          <Field label="LLM provider">
            <Select
              defaultValue={data.llm}
              className={`w-full ${llmDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {data.llmOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
            {llmDirty && <p className="mt-1 text-[11.5px] text-ink/65">Unsaved changes</p>}
          </Field>
          <Field label="Embedding dimensions">
            <Select defaultValue={String(data.dims)} className="w-full">
              <option value="768">768</option>
              <option value="1536">1536</option>
              <option value="3072">3072</option>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-ink/10 pt-4">
          <Button variant="primary" disabled={!embDirty && !llmDirty}>Save changes</Button>
          {variant === "saved" && <SavedNote />}
        </div>
      </Card>

      <Card icon={<KeyRound size={16} className="text-clay" />} title="LLM provider keys" hint="Stored server-side, re-fetchable">
        <div className={FORM_GRID}>
          <Field label="OpenAI (sk-…)">
            <div className="flex items-center gap-1.5">
              <Input type="password" defaultValue={data.keys.openai} className="w-full font-term" />
              <Button icon compact aria-label="Reveal key"><Eye size={14} /></Button>
            </div>
          </Field>
          <Field label="Anthropic (sk-ant-…)">
            <div className="flex items-center gap-1.5">
              <Input type="text" defaultValue={data.keys.anthropic} className="w-full font-term" />
              <Button icon compact aria-label="Hide key"><EyeOff size={14} /></Button>
            </div>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
          <Button variant="primary" disabled={variant === "saved"}>Save changes</Button>
          <Button disabled={variant === "test-testing"}>
            {variant === "test-testing" ? "Testing…" : "Test connection"}
          </Button>
          <TestResult data={data} />
          {variant === "saved" && <SavedNote />}
        </div>
      </Card>
    </>
  );
}

/* Supporting rail (§11, 320px) — matches the other four Settings rails. */
function ModelsRail({ summary }: { summary: PropertyItem[] }) {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList items={summary} />
      </Card>
      <Card title="Changing a model">
        <p className="text-[12.5px] leading-relaxed text-ink/70">
          Switching the embedding model re-indexes every document, so search is
          degraded until the run finishes. Changing the LLM provider takes effect
          on the next answer.
        </p>
      </Card>
    </>
  );
}

/** A workspace that has chosen no models at all. Derived from the data. */
function isEmpty(d: SettingsModelsData): boolean {
  return !d.embedding && !d.llm;
}

function Body({ data, error }: { data: SettingsModelsData; error: string | null }) {
  if (error) {
    return <EmptyState icon={<Layers size={22} />} title="API offline">{error}</EmptyState>;
  }
  if (isEmpty(data)) {
    return (
      <EmptyState icon={<Layers size={22} />} title="No models configured">
        Choose an embedding model and LLM provider to start indexing.
      </EmptyState>
    );
  }
  if (data.phase !== "config") return <ModelsInline data={data} />;
  return (
    <SettingsModelsConfig
      embedded
      embedding={data.embedding}
      llm={data.llm}
      dims={data.dims}
      chunking={data.chunking}
      keys={data.keys}
      indexSummary={data.indexSummary}
    />
  );
}

function SettingsModelsPage({ data, loading = false, error = null, mobile = false }: PageProps<SettingsModelsData>) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="Models"
            description="Which models embed, search, and answer for this workspace."
          />
          <div className="mt-5"><SettingsTabs active="models" /></div>
          <SettingsBody mobile={mobile} rail={<ModelsRail summary={data.summary} />}>
            <Body data={data} error={error} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsModelsData> = {
  id: "settings-models",
  title: "Settings · Models",
  route: "/settings/models",
  component: SettingsModelsPage,
  states: STATES.map((s) => ({ ...s })),
};
