import { useState } from "react";
import { Layers, Sparkles, KeyRound, Eye, EyeOff } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
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
import { SettingsModelsConfig } from "../features/SettingsModelsConfig";

/* Settings → Models (pages/settings-models.md). Configure the embedding model,
   LLM provider + keys, connection test, and per-source chunking. The default
   view renders the SettingsModelsConfig feature; the editing / test-connection
   / saved variants render inline cards so each lifecycle step (edit embedding,
   edit LLM, test idle/testing/ok/fail, saved) is captured directly. Under the
   shared settings tab strip. */

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
      className="mb-5"
    />
  );
}

const EMB_OPTIONS = ["openai:text-embedding-3-small", "openai:text-embedding-3-large", "local:bge-base-en"];
const LLM_OPTIONS = ["anthropic:claude-3-5-sonnet", "openai:gpt-4o", "openai:gpt-4o-mini", "ollama:llama3.1"];

type ModelsVariant = "editing-embedding" | "editing-llm" | "test-idle" | "test-testing" | "test-ok" | "test-fail" | "saved";

function SavedNote() {
  return <span className="font-term text-[11.5px] text-moss">✓ Saved</span>;
}

function TestResult({ variant }: { variant: ModelsVariant }) {
  if (variant === "test-testing") {
    return <span className="inline-flex items-center gap-2 text-[11.5px] text-ink/60"><Spinner size="sm" /> Contacting provider…</span>;
  }
  if (variant === "test-ok") {
    return (
      <span className="inline-flex items-center gap-2">
        <Chip label="Connected" tone="ok" dot caps />
        <span className="font-term text-[11.5px] text-ink/60">mari-api · 12,480 documents · 12,201 embedded</span>
      </span>
    );
  }
  if (variant === "test-fail") {
    return (
      <span className="inline-flex items-center gap-2">
        <Chip label="Unreachable" tone="blocked" dot caps />
        <span className="font-term text-[11.5px] text-espelette">401 — invalid API key for provider openai</span>
      </span>
    );
  }
  return null;
}

function ModelsInline({ variant }: { variant: ModelsVariant }) {
  const embDirty = variant === "editing-embedding";
  const llmDirty = variant === "editing-llm";
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={<Layers size={16} className="text-biscay-2" />} title="Embedding model" hint="1536 dims">
          <Field label="Model">
            <Select
              defaultValue={embDirty ? EMB_OPTIONS[1] : EMB_OPTIONS[0]}
              className={`w-full ${embDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {EMB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </Field>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" compact disabled={!embDirty}>Save</Button>
            {embDirty && <span className="text-[11.5px] text-ink/50">Re-indexes all documents</span>}
            {variant === "saved" && <SavedNote />}
          </div>
        </Card>

        <Card icon={<Sparkles size={16} className="text-clay" />} title="LLM provider">
          <Field label="Model">
            <Select
              defaultValue={llmDirty ? LLM_OPTIONS[1] : LLM_OPTIONS[0]}
              className={`w-full ${llmDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {LLM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </Field>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" compact disabled={!llmDirty}>Save</Button>
            {llmDirty && <span className="text-[11.5px] text-ink/50">Unsaved changes</span>}
            {variant === "saved" && <SavedNote />}
          </div>
        </Card>
      </div>

      <Card icon={<KeyRound size={16} className="text-biscay-2" />} title="LLM provider keys" hint="Stored server-side, re-fetchable">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="OpenAI (sk-…)">
            <div className="flex items-center gap-1.5">
              <Input type="password" defaultValue="sk-proj-9f2ac0d18b7e4a3c" className="w-full font-term" />
              <Button icon compact aria-label="Reveal key"><Eye size={14} /></Button>
            </div>
          </Field>
          <Field label="Anthropic (sk-ant-…)">
            <div className="flex items-center gap-1.5">
              <Input type="text" defaultValue="sk-ant-api03-77de10bc2f" className="w-full font-term" />
              <Button icon compact aria-label="Hide key"><EyeOff size={14} /></Button>
            </div>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" compact disabled={variant === "saved"}>Save changes</Button>
          <Button compact disabled={variant === "test-testing"}>
            {variant === "test-testing" ? "Testing…" : "Test connection"}
          </Button>
          <TestResult variant={variant} />
          {variant === "saved" && <SavedNote />}
        </div>
      </Card>
    </div>
  );
}

const INLINE: ModelsVariant[] = ["editing-embedding", "editing-llm", "test-idle", "test-testing", "test-ok", "test-fail", "saved"];

function Body({ state }: { state: string }) {
  if (state === "loading") {
    return <div className="grid place-items-center py-24"><Spinner size="md" label="Loading model config" /></div>;
  }
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Layers size={22} />} title="API offline">
          Model configuration is temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Layers size={22} />} title="No models configured">
          Choose an embedding model and LLM provider to start indexing.
        </EmptyState>
      </div>
    );
  }
  if ((INLINE as string[]).includes(state)) {
    return <ModelsInline variant={state as ModelsVariant} />;
  }
  return <SettingsModelsConfig />;
}

function SettingsModelsPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Settings"
          title="Models"
          description="Which models embed, search, and answer for this workspace."
        />
        <div className="mt-5" />
        <SettingsTabs active="models" />
        <Body state={state} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "settings-models",
  title: "Settings · Models",
  route: "/settings/models",
  component: SettingsModelsPage,
  states: STATES.map((s) => ({ ...s })),
};
