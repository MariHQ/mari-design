import { useState } from "react";
import type { ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
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
import { BrandingEditor, type Branding, type BrandHarvest, type BrandPreviewStat } from "../features/BrandingEditor";
import { PropertyList, type PropertyItem } from "../data-display/PropertyList";

/* Settings → General (pages/settings-general.md). Workspace identity form
   (name / slug / plan / timezone / language) plus the two sign-post link
   cards for features that moved out of Settings, the branding sub-section,
   and a danger zone. Sits under the shared settings tab strip.

   Pure presenter: the workspace record, where the save lifecycle has got to,
   any field-level validation the server sent back, and the read-only summary
   in the rail all arrive in `data`. */

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

/** Which sub-section of General is on screen. */
export type GeneralSection = "workspace" | "branding";

/** Where the save of the identity form has got to. Validation is NOT a mode:
    it is derived from the field errors the server sent back. */
export type SaveState = "clean" | "dirty" | "saving" | "saved";

/** Everything Settings → General renders. */
export type SettingsGeneralData = {
  section: GeneralSection;
  /** The workspace record being edited. */
  name: string;
  slug: string;
  /** Values of the three enumerated fields, matching their option values. */
  plan: string;
  timezone: string;
  language: string;
  save: SaveState;
  /** Field-level rejection for the slug. `null` = the slug is fine. */
  slugError: string | null;
  /** Read-only facts in the rail. Empty renders the card with no rows. */
  summary: PropertyItem[];
  /** Owner-only destructive controls. */
  danger: boolean;
  /** Branding sub-section. Ignored unless `section` is "branding". */
  branding: Branding;
  brandHarvest: BrandHarvest;
  brandPreviewStats: BrandPreviewStat[];
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
   Every Settings page shares these three constants so the container edge, the
   main/rail plumb line, and the form-field width are identical on all five
   tabs. Do not localise them per page. */
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

function LinkCard({ icon, title, blurb, cta }: { icon: ReactNode; title: string; blurb: string; cta: string }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-flysch text-biscay">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[13px] text-ink/60">{blurb}</p>
        </div>
      </div>
      <div className="mt-3">
        <Button variant="default" compact>
          <ArrowRight size={15} /> {cta}
        </Button>
      </div>
    </Card>
  );
}

function WorkspaceForm({ data }: { data: SettingsGeneralData }) {
  const { save, slugError } = data;
  const invalid = slugError !== null;
  return (
    <Card title="Workspace" eyebrow="Identity" hint="Workspace identity and language.">
      <div className={FORM_GRID}>
        <Field label="Workspace name">
          <Input defaultValue={data.name} className="w-full" />
        </Field>
        <Field label="Slug">
          <Input
            defaultValue={data.slug}
            className={`w-full font-term ${invalid ? "border-espelette ring-1 ring-espelette/40" : ""}`.trim()}
            aria-invalid={invalid || undefined}
          />
          {invalid && <p className="mt-1 text-[12px] text-espelette">{slugError}</p>}
        </Field>
        <Field label="Plan">
          <Select defaultValue={data.plan} className="w-full">
            <option value="free">Free</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </Select>
        </Field>
        <Field label="Timezone">
          <Select defaultValue={data.timezone} className="w-full">
            <option value="utc">UTC</option>
            <option value="pt">America/Los_Angeles</option>
            <option value="et">America/New_York</option>
          </Select>
        </Field>
        <Field label="Language">
          <Select defaultValue={data.language} className="w-full">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </Select>
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-ink/10 pt-4">
        <Button variant="primary" disabled={save === "clean" || save === "saved" || save === "saving" || invalid}>
          {save === "saving" ? "Saving…" : "Save changes"}
        </Button>
        {save === "clean" && !invalid && <span className="text-[12.5px] text-moss">All changes saved</span>}
        {save === "saved" && <span className="font-term text-[12.5px] text-moss">✓ Saved just now</span>}
        {save === "dirty" && !invalid && <span className="text-[12.5px] text-ink/65">You have unsaved changes</span>}
        {save === "saving" && <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink/65"><Spinner size="sm" /> Contacting API…</span>}
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

/* Supporting rail (§11, 320px). Carries the read-only summary plus the two
   sign-post cards for features that moved out of Settings, so the main column
   is a single full-width form instead of a half-empty one. */
function GeneralRail({ summary }: { summary: PropertyItem[] }) {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList items={summary} />
      </Card>
      <LinkCard icon={<Tag size={18} />} title="Editorial library" blurb="Tags, glossary, and style guides now live in the Library." cta="Open Library" />
      <LinkCard icon={<Clock size={18} />} title="Weekly digest" blurb="The digest schedule moved to Flows (cross-cluster runs)." cta="Open Flows" />
    </>
  );
}

function Body({ data, error }: { data: SettingsGeneralData; error: string | null }) {
  if (error) {
    return (
      <EmptyState icon={<Settings size={22} />} title="API offline">{error}</EmptyState>
    );
  }
  if (data.section === "branding") {
    return (
      <BrandingEditor
        branding={data.branding}
        harvest={data.brandHarvest}
        previewStats={data.brandPreviewStats}
      />
    );
  }
  return (
    <>
      {data.save === "saved" && <Alert tone="ok" title="Workspace saved">Your identity changes are live for all members.</Alert>}
      <WorkspaceForm data={data} />
      {data.danger && <DangerZone />}
    </>
  );
}

function SettingsGeneralPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<SettingsGeneralData>) {
  return (
    <PageFrame chrome={chrome} active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader eyebrow="Settings" title="Workspace" description="Workspace identity and language." />
          <div className="mt-5"><SettingsTabs active="general" /></div>
          <SettingsBody mobile={mobile} rail={<GeneralRail summary={data.summary} />}>
            <Body data={data} error={error} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsGeneralData> = {
  id: "settings-general",
  title: "Settings · General",
  route: "/settings/general",
  component: SettingsGeneralPage,
  states: STATES.map((s) => ({ ...s })),
};
