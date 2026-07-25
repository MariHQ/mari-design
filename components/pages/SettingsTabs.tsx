import { Tabs, type TabOption } from "../navigation/Tabs";

/* The Settings tab row, in one place.
 *
 * This used to be copy-pasted into all five Settings pages, each holding the
 * selection in a local `useState`. That is exactly as broken as it sounds:
 * clicking "Members" on the General page moved the underline and nothing else,
 * because the tab row and the router disagreed about what a tab means. A tab
 * here is not a view toggle inside a page — each one IS a separate page with
 * its own route, so selecting one has to navigate.
 *
 * The row is therefore stateless: `active` comes from whichever page is
 * rendering it, and picking a tab emits the target page id. No local state can
 * drift out of sync with the URL, and there is one list of tabs, so a tab can
 * never exist on four pages and be missing from the fifth.
 */

export type SettingsTab =
  | "general" | "members" | "models" | "sources" | "api-keys" | "audit" | "design";

const TABS: TabOption<SettingsTab>[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "models", label: "Models" },
  { id: "sources", label: "Sources" },
  { id: "api-keys", label: "API keys" },
  { id: "audit", label: "Audit log" },
  { id: "design", label: "Design & brand" },
];

/** Tab -> the page id it opens. Sources is the odd one out: a top-level page
    that Settings borrows. Keeping the mapping here is what lets it live in the
    row without every page inventing its own routing rules.

    "design" pointed at `lookbook` — the component CATALOG, which documents
    this design system rather than the workspace's brand, and which crashed in
    an app because it is the one page with no data behind it. */
const PAGE_FOR: Record<SettingsTab, string> = {
  general: "settings-general",
  members: "settings-members",
  models: "settings-models",
  sources: "sources",
  "api-keys": "settings-api-keys",
  audit: "settings-audit-log",
  design: "settings-design",
};

export function SettingsTabs({
  active, onNavigate,
}: {
  active: SettingsTab;
  /** `chrome.onNavigate` — takes a page id. Absent on the design canvas, where
      there is no router; the row still renders and shows the active tab. */
  onNavigate?: (pageId: string) => void;
}) {
  return (
    <Tabs
      ariaLabel="Workspace settings"
      variant="underline"
      options={TABS}
      value={active}
      onChange={(id) => onNavigate?.(PAGE_FOR[id])}
    />
  );
}
