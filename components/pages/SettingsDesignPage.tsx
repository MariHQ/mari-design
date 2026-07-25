import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { SettingsTabs } from "./SettingsTabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { EmptyState } from "../data-display/EmptyState";
import { PropertyList, type PropertyItem } from "../data-display/PropertyList";
import { SkeletonPage } from "../data-display/Skeletons";
import { Palette } from "lucide-react";
import {
  BrandingEditor,
  type Branding, type BrandHarvest, type BrandPreviewStat, type BrandingEditorActions,
} from "../features/BrandingEditor";

/* Settings → Design & brand.
 *
 * The tab existed and pointed at the component catalog — the library's own
 * documentation, which is about this design system rather than about your
 * workspace, and which crashed outright in an app because it is the one page
 * with no adapter behind it. So the one Settings tab named after the thing a
 * customer most wants to change was the one tab that did not work.
 *
 * This is the real destination: the brand a workspace publishes under. Its
 * editor already existed and was reachable only as a sub-section of the
 * workspace form, where it had no way to persist anything.
 *
 * Pure presenter: the saved brand, the import evidence and the preview figures
 * all arrive in `data`.
 */

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "branded", label: "Brand already set" },
  { id: "imported", label: "Imported from a site" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

export type SettingsDesignData = {
  /** The saved brand. An empty object is "still on the Mari defaults", which
      is a real state and not a missing one. */
  branding: Branding;
  /** What the last import read, replayed when no import handler is supplied. */
  harvest: BrandHarvest;
  /** Figures the live preview shows off, so the preview is about THIS
      workspace rather than invented numbers. */
  previewStats: BrandPreviewStat[];
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
};

export type SettingsDesignActions = BrandingEditorActions;

const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";

function SettingsDesignPage({
  data, loading = false, error = null, actions, chrome, mobile = false,
}: PageProps<SettingsDesignData, SettingsDesignActions>) {
  return (
    <PageFrame chrome={chrome} active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="Design & brand"
            description="The colours, type and logo this workspace publishes under. Doc sites and exports pick these up."
            icon={<span className="text-clay"><Palette size={24} /></span>}
          />
          <div className="mt-5"><SettingsTabs active="design" onNavigate={chrome?.onNavigate} /></div>
          <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
            <div className="flex min-w-0 flex-col gap-5">
              {error ? (
                <EmptyState icon={<Palette size={22} />} title="API offline">{error}</EmptyState>
              ) : (
                <BrandingEditor
                  branding={data.branding}
                  harvest={data.harvest}
                  previewStats={data.previewStats}
                  actions={actions}
                />
              )}
            </div>
            <aside className="flex min-w-0 flex-col gap-5">
              <Card title="Where this shows up" hint="Read only">
                <PropertyList items={data.summary} />
              </Card>
            </aside>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsDesignData, SettingsDesignActions> = {
  id: "settings-design",
  title: "Settings · Design & brand",
  route: "/settings/design",
  component: SettingsDesignPage,
  states: STATES.map((s) => ({ ...s })),
};
