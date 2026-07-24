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
import { AvatarGroup } from "../data-display/AvatarGroup";
import { PropertyList } from "../data-display/PropertyList";
import { SettingsModelsConfig } from "../features/SettingsModelsConfig";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT,
  HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS,
} from "./stress";

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
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
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
        <span className="font-term text-[11.5px] text-espelette">401: invalid API key for provider openai</span>
      </span>
    );
  }
  return null;
}

function ModelsInline({ variant }: { variant: ModelsVariant }) {
  const embDirty = variant === "editing-embedding";
  const llmDirty = variant === "editing-llm";
  return (
    <>
      <Card icon={<Layers size={16} className="text-biscay-2" />} title="Models" hint="Embedding + generation">
        <div className={FORM_GRID}>
          <Field label="Embedding model">
            <Select
              defaultValue={embDirty ? EMB_OPTIONS[1] : EMB_OPTIONS[0]}
              className={`w-full ${embDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {EMB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
            {embDirty && <p className="mt-1 text-[11.5px] text-ink/65">Re-indexes all documents</p>}
          </Field>
          <Field label="LLM provider">
            <Select
              defaultValue={llmDirty ? LLM_OPTIONS[1] : LLM_OPTIONS[0]}
              className={`w-full ${llmDirty ? "border-biscay-2 ring-1 ring-biscay-2/40" : ""}`.trim()}
            >
              {LLM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
            {llmDirty && <p className="mt-1 text-[11.5px] text-ink/65">Unsaved changes</p>}
          </Field>
          <Field label="Embedding dimensions">
            <Select defaultValue="1536" className="w-full">
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
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
          <Button variant="primary" disabled={variant === "saved"}>Save changes</Button>
          <Button disabled={variant === "test-testing"}>
            {variant === "test-testing" ? "Testing…" : "Test connection"}
          </Button>
          <TestResult variant={variant} />
          {variant === "saved" && <SavedNote />}
        </div>
      </Card>
    </>
  );
}

const INLINE: ModelsVariant[] = ["editing-embedding", "editing-llm", "test-idle", "test-testing", "test-ok", "test-fail", "saved"];

function StressModels({ extreme }: { extreme: boolean }) {
  const opt = extreme ? UNBREAKABLE : LONG_SOURCE;
  return (
    <>
      <Card icon={<Layers size={16} className="text-biscay-2" />} title={extreme ? UNBREAKABLE : LONG_TITLE} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
        <div className={FORM_GRID}>
          <Field label="Model">
            <Select defaultValue={opt} className="w-full"><option value={opt}>{opt}</option></Select>
          </Field>
          <Field label="Provider">
            <Select defaultValue={opt} className="w-full"><option value={opt}>{opt}</option></Select>
          </Field>
          <Field label={extreme ? UNBREAKABLE : LONG_TITLE}>
            <Select defaultValue={opt} className="w-full"><option value={opt}>{opt}</option></Select>
          </Field>
        </div>
      </Card>
      <Card icon={<KeyRound size={16} className="text-clay" />} title={extreme ? UNBREAKABLE : "Provider keys, endpoints, and every model label"} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
        <div className={FORM_GRID}>
          <Field label="OpenAI (sk-…)"><Input defaultValue={extreme ? UNBREAKABLE : LONG_SOURCE} className="w-full font-term" /></Field>
          <Field label="Anthropic (sk-ant-…)"><Input defaultValue={extreme ? UNBREAKABLE : LONG_SOURCE} className="w-full font-term" /></Field>
        </div>
        <PropertyList
          className="mt-4"
          items={[
            { label: "Endpoint", value: extreme ? UNBREAKABLE : LONG_SOURCE, stacked: true },
            { label: "Documents", value: extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} embedded` },
            { label: "Notes", value: extreme ? `${LONG_WORD} ${MIXED_SCRIPT}` : LONG_PARAGRAPH, stacked: true },
          ]}
        />
      </Card>
      <Card title={extreme ? UNBREAKABLE : "Reviewers and every capability tag"} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
        <div className="flex items-center gap-3">
          <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={5} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink/60">{extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} tokens/day`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(extreme ? [UNBREAKABLE, LONG_WORD, ...MANY_TAGS] : MANY_TAGS).map((t, i) => <Chip key={i} label={t} tone="info" caps />)}
        </div>
      </Card>
    </>
  );
}

/* Supporting rail (§11, 320px) — matches the other four Settings rails. */
function ModelsRail() {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList
          items={[
            { label: "Documents embedded", value: "12,201 of 12,480" },
            { label: "Vector dimensions", value: "1536" },
            { label: "Tokens per day", value: "1.4M" },
            { label: "Last re-index", value: "Jul 18, 2026" },
          ]}
        />
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

function Body({ state }: { state: string }) {
  if (state === "overflow" || state === "stress") return <StressModels extreme={state === "stress"} />;
  if (state === "error") {
    return (
      <EmptyState icon={<Layers size={22} />} title="API offline">
        Model configuration is temporarily unavailable. Retrying…
      </EmptyState>
    );
  }
  if (state === "empty") {
    return (
      <EmptyState icon={<Layers size={22} />} title="No models configured">
        Choose an embedding model and LLM provider to start indexing.
      </EmptyState>
    );
  }
  if ((INLINE as string[]).includes(state)) {
    return <ModelsInline variant={state as ModelsVariant} />;
  }
  return <SettingsModelsConfig embedded />;
}

function SettingsModelsPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="Models"
            description="Which models embed, search, and answer for this workspace."
          />
          <div className="mt-5"><SettingsTabs active="models" /></div>
          <SettingsBody mobile={mobile} rail={<ModelsRail />}>
            <Body state={state} />
          </SettingsBody>
        </div>
      )}
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
