import { useState } from "react";
import type { ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Tag, Clock, ArrowRight, Settings, AlertTriangle, Trash2 } from "lucide-react";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { SkeletonPage } from "../data-display/Skeletons";
import { Alert } from "../feedback/Alert";
import { BrandingEditor } from "../features/BrandingEditor";
import { Chip } from "../data-display/Chip";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { PropertyList } from "../data-display/PropertyList";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_SOURCE, LONG_URL, LONG_WORD,
  UNBREAKABLE, MIXED_SCRIPT, HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS,
} from "./stress";

/* Settings → General (pages/settings-general.md). Workspace identity form
   (name / slug / plan / timezone / language) plus the two sign-post link
   cards for features that moved out of Settings, the branding sub-section,
   and a danger zone. Sits under the shared settings tab strip. The `state`
   prop drives the form lifecycle (view → editing → saving → saved) plus the
   validation, branding, and danger variants. */

const STATES = [
  { id: "default", label: "Default (saved)" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "editing", label: "Dirty / unsaved" },
  { id: "saving", label: "Saving…" },
  { id: "saved", label: "Just saved" },
  { id: "invalid", label: "Validation error" },
  { id: "branding", label: "Branding sub-section" },
  { id: "danger", label: "Danger zone" },
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
      className="mb-5"
    />
  );
}

function LinkCard({ icon, title, blurb, cta }: { icon: ReactNode; title: string; blurb: string; cta: string }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-flysch text-biscay">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[13px] text-ink/60">{blurb}</p>
        </div>
        <Button variant="default" compact icon>
          <ArrowRight size={15} /> {cta}
        </Button>
      </div>
    </Card>
  );
}

type FormMode = "view" | "editing" | "saving" | "saved" | "invalid";

function WorkspaceForm({ mode }: { mode: FormMode }) {
  const invalid = mode === "invalid";
  const dirty = mode === "editing" || mode === "saving" || mode === "invalid";
  return (
    <Card title="Workspace" eyebrow="Identity" hint="Workspace identity and language.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Workspace name">
          <Input defaultValue={dirty ? "Acme Data Platform (US)" : "Acme Data Platform"} className="w-full" />
        </Field>
        <Field label="Slug">
          <Input
            defaultValue={invalid ? "Acme Data!" : "acme-data"}
            className={`w-full font-term ${invalid ? "border-espelette ring-1 ring-espelette/40" : ""}`.trim()}
            aria-invalid={invalid || undefined}
          />
          {invalid && <p className="mt-1 text-[12px] text-espelette">Slug may only contain lowercase letters, numbers, and hyphens.</p>}
        </Field>
        <Field label="Plan">
          <Select defaultValue="team" className="w-full">
            <option value="free">Free</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </Select>
        </Field>
        <Field label="Timezone">
          <Select defaultValue="utc" className="w-full">
            <option value="utc">UTC</option>
            <option value="pt">America/Los_Angeles</option>
            <option value="et">America/New_York</option>
          </Select>
        </Field>
        <Field label="Language">
          <Select defaultValue="en" className="w-full">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </Select>
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-ink/10 pt-4">
        <Button variant="primary" disabled={mode === "view" || mode === "saved" || mode === "saving" || invalid}>
          {mode === "saving" ? "Saving…" : "Save changes"}
        </Button>
        {mode === "view" && <span className="text-[12.5px] text-moss">All changes saved</span>}
        {mode === "saved" && <span className="font-term text-[12.5px] text-moss">✓ Saved just now</span>}
        {mode === "editing" && <span className="text-[12.5px] text-ink/50">You have unsaved changes</span>}
        {mode === "saving" && <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/50"><Spinner size="sm" /> Contacting API…</span>}
        {invalid && <span className="text-[12.5px] text-espelette">Fix the errors above to save</span>}
      </div>
    </Card>
  );
}

function DangerZone() {
  return (
    <Card className="border-espelette/30">
      <div className="flex items-center gap-2 text-espelette">
        <AlertTriangle size={16} />
        <h3 className="text-[14px] font-semibold">Danger zone</h3>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-ink/10">
        <li className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink">Transfer workspace</div>
            <p className="mt-0.5 text-[12.5px] text-ink/60">Move ownership to another admin. You keep admin access.</p>
          </div>
          <Button variant="default" compact>Transfer</Button>
        </li>
        <li className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink">Delete workspace</div>
            <p className="mt-0.5 text-[12.5px] text-ink/60">Permanently remove all documents, members, and keys. This cannot be undone.</p>
          </div>
          <ConfirmButton compact confirmLabel="Delete forever?" onConfirm={() => {}}><Trash2 size={14} /> Delete</ConfirmButton>
        </li>
      </ul>
    </Card>
  );
}

/* General has no data-driven feature — render inline compositions that
   exercise the same form / link-card / detail-list layouts with stress text. */
function StressGeneral({ extreme }: { extreme: boolean }) {
  const long = extreme ? UNBREAKABLE : LONG_NAME;
  const blurb = extreme ? `${LONG_WORD} ${MIXED_SCRIPT}` : LONG_PARAGRAPH;
  return (
    <div className="space-y-4">
      <Card title={extreme ? UNBREAKABLE : LONG_TITLE} eyebrow="Identity" hint={extreme ? MIXED_SCRIPT : LONG_PARAGRAPH}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Workspace name"><Input defaultValue={long} className="w-full" /></Field>
          <Field label="Slug"><Input defaultValue={extreme ? UNBREAKABLE : LONG_SOURCE} className="w-full font-term" /></Field>
          <Field label="Primary URL"><Input defaultValue={extreme ? UNBREAKABLE : LONG_URL} className="w-full font-term" /></Field>
        </div>
        <PropertyList
          className="mt-4"
          items={[
            { label: "Workspace", value: long },
            { label: "Homepage", value: extreme ? UNBREAKABLE : LONG_URL, stacked: true },
            { label: "Members", value: extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} across every region` },
            { label: "Description", value: blurb, stacked: true },
          ]}
        />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LinkCard icon={<Tag size={18} />} title={extreme ? UNBREAKABLE : LONG_TITLE} blurb={blurb} cta={extreme ? LONG_WORD : "Open the very long editorial library destination"} />
        <LinkCard icon={<Clock size={18} />} title={extreme ? MIXED_SCRIPT : LONG_NAME} blurb={blurb} cta={extreme ? UNBREAKABLE : "Open Flows"} />
      </div>
      <Card title={extreme ? UNBREAKABLE : "Everyone with access and every label applied"} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
        <div className="flex items-center gap-3">
          <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={5} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink/60">{extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} members`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(extreme ? [UNBREAKABLE, LONG_WORD, ...MANY_TAGS] : MANY_TAGS).map((t, i) => <Chip key={i} label={t} tone="info" caps />)}
        </div>
      </Card>
    </div>
  );
}

function Body({ state }: { state: string }) {
  if (state === "overflow" || state === "stress") return <StressGeneral extreme={state === "stress"} />;
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Settings size={22} />} title="API offline">
          Workspace settings are temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "branding") {
    return <BrandingEditor />;
  }
  const mode: FormMode =
    state === "editing" ? "editing"
    : state === "saving" ? "saving"
    : state === "saved" ? "saved"
    : state === "invalid" ? "invalid"
    : "view";
  return (
    <div className="space-y-4">
      {state === "saved" && <Alert tone="ok" title="Workspace saved">Your identity changes are live for all members.</Alert>}
      <WorkspaceForm mode={mode} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LinkCard icon={<Tag size={18} />} title="Editorial library" blurb="Tags, glossary, and style guides now live in the Library." cta="Open Library" />
        <LinkCard icon={<Clock size={18} />} title="Weekly digest" blurb="The digest schedule moved to Flows (cross-cluster runs)." cta="Open Flows" />
      </div>
      {state === "danger" && <DangerZone />}
    </div>
  );
}

function SettingsGeneralPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <PageHeader eyebrow="Settings" title="Workspace" description="Workspace identity and language." />
          <div className="mt-5" />
          <SettingsTabs active="general" />
          <Body state={state} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "settings-general",
  title: "Settings · General",
  route: "/settings/general",
  component: SettingsGeneralPage,
  states: STATES.map((s) => ({ ...s })),
};
