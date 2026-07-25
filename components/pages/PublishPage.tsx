import { useState, type ReactNode } from "react";
import { Truncate } from "../data-display/Truncate";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Send, ExternalLink, FileText, Check, Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { Drawer } from "../layout/Drawer";
import { Field } from "../forms/Field";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { ResultCount, PagerBar, usePaged } from "../data-display/Pagination";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip } from "../data-display/Chip";
import { Swatch } from "../data-display/Swatch";
import { Stepper } from "../data-display/Stepper";
import { Spinner } from "../data-display/Spinner";
import { TagChip } from "../data-display/TagChip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { ReadError } from "../feedback/ReadError";
import { Switch } from "../forms/Switch";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PublishMcpServers, type McpServer, type PublishMcpActions } from "../features/PublishMcpServers";
import { useWrite } from "../actions/useWrite";
import { useResync } from "../actions/useResync";
import { WriteError } from "../feedback/WriteError";
import { Link } from "../navigation/Link";
import { siteUrl } from "../tokens/siteUrl";
import { fmtDate } from "../tokens/format";

/* Publish (pages/publish.md). The doc-site product: turn the knowledge base
   into a static documentation website, or expose it to Claude/agents over MCP.
   A top-level tab strip switches Doc sites ↔ MCP servers.

   States enumerate the whole surface inline: each site-editor tab
   (Content / Theme / Preview / Domains), the publish/deploy flow
   (draft → publishing → published), and the MCP lifecycle
   (list / add-server / token-created / empty) — composed in the page body so a
   static screenshot reads each step, rather than relying on a portalled flow.

   Pure presenter: the list of sites, the site being edited, its nav tree,
   theme presets, gates, release history and the MCP servers all arrive in
   `data`. A workspace with no sites renders the list's own empty state, under
   the list's own "New site" — the create path this page used to lack. */

/** Which of the two surfaces the top-level tab strip is on. */
export type PublishSection = "sites" | "mcp";

const TAB_OPTIONS: TabOption<PublishSection>[] = [
  { id: "sites", label: "Doc sites" },
  { id: "mcp", label: "MCP servers" },
];

/** Which editor tab of a doc site is open. */
export type EditorTab = "content" | "theme" | "preview" | "domains";
/** Where a deploy has got to. */
export type PublishPhase = "draft" | "publishing" | "published";
/** Which screen of Publish is on: the site editor, the deploy flow, or one of
    the three MCP screens. An app drives it from its own route. */
export type PublishView =
  | "site-list" | "site-new" | "site-editor" | "publish-flow"
  | "mcp-list" | "mcp-add" | "mcp-token";

/** Which tab a deep-linked view belongs under. The top strip used to be driven
    off `data.view` alone, so clicking a tab moved the underline and nothing
    else; the section a view belongs to is what seeds the tab, and the reader
    owns it from then on. */
const SECTION_OF: Record<PublishView, PublishSection> = {
  "site-list": "sites", "site-new": "sites", "site-editor": "sites", "publish-flow": "sites",
  "mcp-list": "mcp", "mcp-add": "mcp", "mcp-token": "mcp",
};

/** A doc site as the site list shows it. The workspace has as many as it has
    made; `site` below is the one an editor is open on. */
export type SiteSummary = {
  id: number;
  name: string;
  domain: string;
  status: "live" | "draft";
  /** Documents the last build put on it. */
  docs: number;
};

/** One toggleable static-site-generator feature. */
export type SiteFeature = { key: string; label: string; hint: string; on: boolean };
/** A pre-publish check and what it found. */
export type PublishGate = { name: string; ok: boolean; note: string };
/** A theme preset the site can adopt. The first is the selected one. */
export type SiteTheme = { key: string; name: string; accent: string; bg: string };
/** One section of the site's navigation tree. */
export type NavSection = { label: string; docs: number };
/** A past deploy. `date` is optional because not every adapter records one;
    a row without it says nothing rather than inventing a day (§5). */
export type SiteRelease = { version: string; note: string; date?: string };

/** The doc site being edited. */
export type DocSite = {
  name: string;
  domain: string;
  /** Whether a release of this site is actually serving. A draft has never
      been deployed, so it has no live URL to open — this page used to label
      every site it was given "Live" and offer that link regardless. */
  status: "live" | "draft";
  /** Version the deploy flow is working on, e.g. "v14". */
  version: string;
  /** Tags that decide which documents are eligible. */
  sourceTags: string[];
  /** How many documents currently match, and the warning summary beside it. */
  docsMatched: number;
  warnings: string;
  nav: NavSection[];
  features: SiteFeature[];
  gates: PublishGate[];
  themes: SiteTheme[];
  /** Accent swatches; the first is the selected one. */
  accents: string[];
  /** Deploy target. */
  bucket: string;
  region: string;
  /** Nav labels the live preview shows. */
  previewNav: string[];
  releases: SiteRelease[];
  /** Line shown when a release has gone out. */
  releasedNote: string;
};

/** A capability an MCP server can expose, and whether the draft has it on. */
export type McpCapabilityOption = { key: string; tools: number; desc: string; on: boolean };

/** The new-server form. */
export type McpDraft = { name: string; scope: string; capabilities: McpCapabilityOption[]; toolCount: number };

/** A server that was just created, with its one-time bearer token. */
export type McpCreated = {
  name: string; scopeLabel: string; toolCount: number; token: string; snippet: string;
};

/** What Publish can DO.

    The site handlers take no site id: this page edits ONE site, the one the
    caller put in `data.site`, so the caller already knows which row it is.
    `rollbackRelease` is keyed by the version string the release log shows, for
    the same reason.

    `setSiteNav` takes the whole tree because that is what the nav editor
    edits: adding, removing and reordering a section are all one write of the
    new order. Without it the tree keeps its local echo (the canvas). */
export type PublishActions = PublishMcpActions & {
  /** The reader switched the top-level tab. Like Knowledge's `setQuery`, the
      page reports it and the app decides where it lives — in the URL, so a
      Publish tab survives a reload and can be linked. Without the handler the
      tab is this page's own state, which is what the canvas renders. */
  openSection?: (section: PublishSection) => void;
  /** Leave the site editor and go back to the list of sites. Which view is on
      screen lives in `data`, so the page cannot go back on its own. */
  openSites?: () => void;
  /** Open one site's editor. */
  openSite?: (id: number) => void;
  /** Create a doc site. `sourceTags` are the tags that decide which documents
      the site is allowed to publish, and they are set here because the editor
      treats them as fixed ("Sources are set at creation"). */
  createSite?: (args: { name: string; domain: string; sourceTags: string[] }) => void | Promise<void>;
  /** Destructive: takes the site, and anything it serves, away. Rendered as a
      <ConfirmButton> on the site's row. Keyed by id because the list is where
      it is offered, and that row is not the site the editor is open on. */
  deleteSite?: (id: number) => void | Promise<void>;
  deploySite?: () => void | Promise<void>;
  buildSite?: () => void | Promise<void>;
  rollbackRelease?: (version: string) => void | Promise<void>;
  setSiteFeature?: (key: string, on: boolean) => void | Promise<void>;
  /** Store the site's navigation tree, in the order the editor shows it. */
  setSiteNav?: (nav: NavSection[]) => void | Promise<void>;
  setSiteTheme?: (theme: { preset?: string; accent?: string }) => void | Promise<void>;
  saveDeployConfig?: (cfg: { bucket: string; region: string }) => void | Promise<void>;
};

/** Everything Publish renders. */
export type PublishData = {
  view: PublishView;
  editorTab: EditorTab;
  phase: PublishPhase;
  /** Every doc site in the workspace. Empty = none made yet, which the list
      says for itself, over a New site button. */
  sites: SiteSummary[];
  /** The site being edited. `null` = no editor is open on one. */
  site: DocSite | null;
  /** Tags a new site can draw its documents from. */
  tagOptions: string[];
  servers: McpServer[];
  /** Servers in the workspace, shown on the MCP screen headers. */
  serverCount: number;
  draft: McpDraft;
  created: McpCreated;
};

const STATES = [
  { id: "default", label: "Sites · List" },
  { id: "site-new", label: "Sites · New site" },
  { id: "site-none", label: "Sites · None yet" },
  { id: "site-content", label: "Site · Content" },
  { id: "site-theme", label: "Site · Theme" },
  { id: "site-preview", label: "Site · Preview" },
  { id: "site-domains", label: "Site · Domains" },
  { id: "publish-draft", label: "Publish · Draft" },
  { id: "publish-publishing", label: "Publish · Publishing" },
  { id: "publish-published", label: "Publish · Published" },
  { id: "mcp", label: "MCP · Server list" },
  { id: "mcp-add", label: "MCP · Add server" },
  { id: "mcp-token", label: "MCP · Token created" },
  { id: "mcp-empty", label: "MCP · No servers" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error / service unavailable" },
  { id: "empty", label: "Nothing published yet" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* ── Inline site-editor tab bodies ─────────────────────────────────────────*/
/* The four editor tabs used to be <span>s: Content / Theme / Preview /
   Domains could only be reached by the caller changing `data.editorTab`, so
   inside the app three quarters of the site editor was unreachable by
   clicking. They are the one standard selection bar now (§13, same component
   as the Knowledge tab row), and the editor owns which one is open. */
const EDITOR_TAB_OPTIONS: TabOption<EditorTab>[] = [
  { id: "content", label: "Content" },
  { id: "theme", label: "Theme" },
  { id: "preview", label: "Preview" },
  { id: "domains", label: "Domains" },
];

/* mkdocs-style site-builder controls: an editable nav tree plus the feature
   switches a static-site generator exposes. Every control is wired to local
   state so nothing here is inert (§2). */
function ContentBody({ site, actions }: { site: DocSite; actions?: PublishActions }) {
  const [nav, setNav] = useState<NavSection[]>(site.nav);
  const [newSection, setNewSection] = useState("");
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(site.features.map((f) => [f.key, f.on])),
  );
  /* A refetch replaces the site under this panel; without the resync the
     editor kept rendering the nav and switches it mounted with (C1). Held
     while a new section is half-typed, so the refetch does not eat it. */
  useResync(site, (s) => {
    setNav(s.nav);
    setFeatures(Object.fromEntries(s.features.map((f) => [f.key, f.on])));
  }, { hold: newSection.trim() !== "" });
  const write = useWrite();

  /* One path for every nav edit: the server takes the whole tree, and the row
     order the user sees is the order it stored. */
  const commitNav = (next: NavSection[]) => write.run(
    actions?.setSiteNav && (() => actions.setSiteNav!(next)),
    () => setNav(next),
  );
  const moveNav = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= nav.length) return Promise.resolve(false);
    const next = [...nav];
    [next[i], next[j]] = [next[j], next[i]];
    return commitNav(next);
  };
  const addSection = async () => {
    const label = newSection.trim();
    if (!label) return;
    // A section the build has not run over holds no documents yet, which is
    // what 0 says — it is not a count this page invented.
    const ok = await commitNav([...nav, { label, docs: 0 }]);
    if (ok) setNewSection("");
  };

  /* A switch only moves once the generator has taken the change, so it can
     never sit in a position the built site does not honour. */
  const toggleFeature = (key: string, on: boolean) => write.run(
    actions?.setSiteFeature && (() => actions.setSiteFeature!(key, on)),
    () => setFeatures((s) => ({ ...s, [key]: on })),
  );

  return (
    <div className="flex flex-col gap-4">
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      <div>
        <SectionLabel>Sources</SectionLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{site.sourceTags.map((t) => <TagChip key={t} tag={t} />)}</div>
        <p className="mt-1.5 text-[12px] text-ink/70">Sources are set at creation and drive which docs are eligible.</p>
      </div>
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-ink/65" />
        <span className="text-[13px] text-ink/80">{site.docsMatched} docs match</span>
        {/* No warnings means no chip: an empty attention chip is a badge with
            nothing in it. */}
        {site.warnings && <Chip label={site.warnings} tone="attention" dot />}
      </div>

      <div>
        <SectionLabel>Navigation</SectionLabel>
        {/* The tree used to draw a GripVertical handle with no drag behind it,
            and Add/Remove only ever touched local state — an editor that could
            not edit (§2). The handle is gone (nothing dragged), reordering is
            two real buttons, and every change is written through
            `setSiteNav`; with no handler it stays the local echo the canvas
            renders. */}
        <ul className="mt-1.5 flex flex-col divide-y divide-ink/10 rounded-[5px] border border-ink/15">
          {nav.map((n, i) => (
            <li key={`${n.label}-${i}`} className="flex items-center gap-2 px-2.5 py-2">
              <Truncate className="min-w-0 flex-1 text-[13px] text-ink">{n.label}</Truncate>
              <span className="shrink-0 font-term text-[11.5px] text-ink/65">{n.docs} docs</span>
              <span className="flex shrink-0 items-center gap-1">
                <Button icon compact aria-label={`Move ${n.label} up`} disabled={i === 0 || write.busy} onClick={() => void moveNav(i, -1)}><ArrowUp size={13} /></Button>
                <Button icon compact aria-label={`Move ${n.label} down`} disabled={i === nav.length - 1 || write.busy} onClick={() => void moveNav(i, 1)}><ArrowDown size={13} /></Button>
                <ConfirmButton compact confirmLabel="Remove?" disabled={write.busy} onConfirm={() => void commitNav(nav.filter((_, j) => j !== i))}>
                  <X size={13} /> Remove
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
        {/* A section the user names, not "Section 3": the label is what the
            built site puts in its sidebar. */}
        <div className="mt-2 flex items-center gap-2">
          <Input
            className="w-[220px]"
            aria-label="New section name"
            placeholder="Guides"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addSection(); } }}
          />
          <Button compact disabled={!newSection.trim() || write.busy} onClick={() => void addSection()}>
            <Plus size={13} /> Add section
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Site features</SectionLabel>
        <ul className="mt-1.5 flex flex-col gap-2">
          {site.features.map((f) => (
            <li key={f.key} className="flex items-start gap-2.5">
              <Switch
                checked={features[f.key]}
                onCheckedChange={(v) => void toggleFeature(f.key, v)}
                aria-label={f.label}
              />
              <span className="min-w-0">
                <span className="block text-[13px] text-ink">{f.label}</span>
                <span className="block text-[11.5px] text-ink/65">{f.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <SectionLabel>Pre-publish gates</SectionLabel>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {site.gates.map((g) => (
            /* min-w-0 on the row and the label, shrink-0 on the icon: a gate
               name is user data. On a 390px column two unbounded flex children
               squeezed the name to 78px and wrapped it into a 312px-tall
               ribbon (§12: truncate, do not pack). */
            <li key={g.name} className="flex min-w-0 items-center gap-2 text-[13px]">
              <Check size={14} className={`shrink-0 ${g.ok ? "text-moss" : "text-clay"}`} />
              <Truncate className="min-w-0 flex-1 text-ink/85">{g.name}</Truncate>
              {/* The note is prose and can be a paragraph, so it truncates too.
                  Pinning it shrink-0 made it force the row 3,499px wide. */}
              <Truncate className={`min-w-0 flex-1 font-term text-[11.5px] ${g.ok ? "text-ink/70" : "text-clay"}`}>· {g.note}</Truncate>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ThemeBody({ site, theme, onTheme, actions }: {
  site: DocSite;
  /* The theme the user is looking at. It lives on the editor, not here, so
     the live preview beside this panel repaints with the pick — it used to
     read `site.accents[0]` and never moved. */
  theme: { preset: string; accent: string };
  onTheme: (next: { preset: string; accent: string }) => void;
  actions?: PublishActions;
}) {
  /* Presets and accents used to be a picture: the first row was hard-coded as
     the selected one and nothing was clickable. They are controls now, and
     with a handler each pick is written to the site's theme (§2). */
  const { preset, accent } = theme;
  const write = useWrite();
  const pickPreset = (key: string) => write.run(
    actions?.setSiteTheme && (() => actions.setSiteTheme!({ preset: key, accent })),
    () => onTheme({ preset: key, accent }),
  );
  const pickAccent = (color: string) => write.run(
    actions?.setSiteTheme && (() => actions.setSiteTheme!({ preset, accent: color })),
    () => onTheme({ preset, accent: color }),
  );

  return (
    <div className="flex flex-col gap-4">
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      <div>
        <SectionLabel>Preset</SectionLabel>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {site.themes.map((t) => (
            <button
              type="button"
              key={t.key}
              aria-pressed={t.key === preset}
              disabled={write.busy}
              onClick={() => void pickPreset(t.key)}
              className={`flex items-center gap-2.5 p-2 rounded-[5px] border text-left ${focusRing} ${t.key === preset ? "border-biscay-2 ring-1 ring-biscay-2/40" : "border-ink/15 hover:border-ink/30"}`}
            >
              <span className="w-8 h-8 rounded-[3px] border border-ink/10 grid place-items-end p-1" style={{ background: t.bg }}><span className="w-3 h-3 rounded-full" style={{ background: t.accent }} /></span>
              <span className="text-[12.5px] font-medium text-ink">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Accent</SectionLabel>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {site.accents.map((c) => (
            <Swatch key={c} color={c} selected={c === accent} onClick={() => void pickAccent(c)} />
          ))}
        </div>
      </div>
      {/* "Density" was three <span>s with the first hard-coded selected: no
          state, no handler, and no density field on the site for it to seed
          from or write to. A control that cannot do anything is not drawn
          (§2), so it is gone rather than mocked. */}
    </div>
  );
}

/* The preview repaints from the accent the editor is holding, which is the
   one the user just picked. Reading `site.accents[0]` meant a theme change
   never showed up in the panel that exists to show it. */
function PreviewBody({ site, accent }: { site: DocSite; accent: string }) {
  return (
    <div className="rounded-md border border-ink/15 overflow-hidden" style={{ background: "#fcf9f1" }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink/10 bg-black/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="ml-2 font-term text-[11px] text-ink/65">{site.domain}</span>
      </div>
      <div className="flex min-h-[260px]">
        <aside className="w-1/3 border-r border-ink/10 p-3">
          <div className="mb-2.5" style={{ color: accent }}><Truncate lines={2} className="text-[13px] font-bold">{site.name}</Truncate></div>
          <ul className="flex flex-col gap-1.5">
            {site.previewNav.map((n, i) => <li key={n} className="text-[11px] font-medium" style={{ color: i === 0 ? accent : "#6a675f" }}>{n}</li>)}
          </ul>
        </aside>
        <main className="flex-1 p-4">
          <div className="text-[10px] font-term uppercase tracking-wide mb-1.5" style={{ color: accent }}>Guides</div>
          <div className="text-[17px] font-bold mb-2 text-ink">Getting started</div>
          <div className="h-2 w-4/5 mb-1.5 rounded bg-black/[0.07]" />
          <div className="h-2 w-full mb-1.5 rounded bg-black/[0.07]" />
          <div className="h-2 w-3/5 mb-4 rounded bg-black/[0.07]" />
          <span className="inline-block px-3 py-1.5 text-[11px] font-semibold text-white rounded-[8px]" style={{ background: accent }}>Read more</span>
        </main>
      </div>
    </div>
  );
}

function DomainsBody({ site, actions }: { site: DocSite; actions?: PublishActions }) {
  /* The bucket and region are the deploy target, and "Save deploy config" is
     what sets them, so they are fields rather than a read-only display of
     themselves. The domain stays read-only: it belongs to the site row and
     nothing here writes it. */
  const [bucket, setBucket] = useState(site.bucket);
  const [region, setRegion] = useState(site.region);
  const [saved, setSaved] = useState(false);
  const write = useWrite();
  const save = () => write.run(
    actions?.saveDeployConfig && (() => actions.saveDeployConfig!({ bucket: bucket.trim(), region: region.trim() })),
    () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); },
  );

  return (
    <div className="flex flex-col gap-4">
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      <div>
        <SectionLabel>S3 target</SectionLabel>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          <Input className="w-full font-term" aria-label="Bucket" placeholder="my-docs-bucket" value={bucket} onChange={(e) => { setBucket(e.target.value); setSaved(false); }} />
          <Input className="w-full font-term" aria-label="Region" placeholder="us-west-2" value={region} onChange={(e) => { setRegion(e.target.value); setSaved(false); }} />
        </div>
      </div>
      <div>
        <SectionLabel>Domain mapping</SectionLabel>
        <Input className="mt-1.5 w-full font-term" readOnly value={site.domain} />
        <p className="mt-1 text-[12px] text-ink/65">Point {site.domain} → your S3 website endpoint. Without a bucket, deploys build locally.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button compact disabled={write.busy} onClick={() => void save()}>{write.busy ? "Saving…" : "Save deploy config"}</Button>
        {saved && <span className="font-term text-[11.5px] text-moss">✓ Saved</span>}
      </div>
    </div>
  );
}

function SiteEditorInline({ initialTab, site, mobile, actions }: { initialTab: EditorTab; site: DocSite; mobile: boolean; actions?: PublishActions }) {
  const write = useWrite();
  const [deployed, setDeployed] = useState(false);
  /* `data.editorTab` seeds which tab opens (so a caller can deep-link one);
     the editor owns it from then on, because the tab row is a control the
     user clicks, not a read-out of the route. */
  const [tab, setTab] = useState<EditorTab>(initialTab);
  useResync(initialTab, setTab);
  /* The theme being previewed lives here so the Theme tab and the live
     preview beside it are the same value (P-PU-3). */
  const [theme, setTheme] = useState({ preset: site.themes[0]?.key ?? "", accent: site.accents[0] ?? "" });
  useResync(site, (s) => setTheme({ preset: s.themes[0]?.key ?? "", accent: s.accents[0] ?? "" }));
  const deploy = () => write.run(
    actions?.deploySite && (() => actions.deploySite!()),
    () => { setDeployed(true); window.setTimeout(() => setDeployed(false), 2400); },
  );
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={site.name}
        backLink={{ href: page.route, label: "All sites", onClick: actions?.openSites }}
        actions={
          <>
            <Chip label={site.status === "live" ? "Live" : "Draft"} tone={site.status === "live" ? "ok" : "neutral"} dot pulse={site.status === "live"} caps />
            <span className="hidden font-term text-[12px] text-ink/70 sm:inline">{site.domain}</span>
            {/* The published site itself, on its own domain — a genuinely
                external destination, so a real new-tab link. A draft has never
                been deployed: that domain serves nothing, so there is no link
                to offer (§2). */}
            {site.status === "live" && (
              <Link href={siteUrl(site.domain)} external className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80 hover:border-ink/45 hover:text-ink"><ExternalLink size={14} /> Open site</Link>
            )}
            <Button variant={deployed ? "success" : "primary"} disabled={write.busy} onClick={() => void deploy()}>
              {write.busy ? "Deploying…" : deployed ? "Deployed" : "Deploy"}
            </Button>
          </>
        }
      />
      <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      {/* The Preview tab already IS the live preview: showing it twice side by
          side reads as a rendering bug, so the rail drops out on that tab. */}
      {/* §11 two-column split: editor column minmax(0,1fr) + the standard
          320px rail, so Publish's rail sits on the same plumb line as every
          other console page instead of a 50/50 split. */}
      <div
        className={
          tab === "preview" || mobile
            ? "grid items-start gap-5 [&>*]:min-w-0"
            : `items-start [&>*]:min-w-0 ${SPLIT[320]}`
        }
      >
        <Card>
          <div className="mb-4">
            <Tabs<EditorTab> ariaLabel="Site editor sections" variant="underline" options={EDITOR_TAB_OPTIONS} value={tab} onChange={setTab} />
          </div>
          {tab === "content" && <ContentBody site={site} actions={actions} />}
          {tab === "theme" && <ThemeBody site={site} theme={theme} onTheme={setTheme} actions={actions} />}
          {tab === "preview" && <PreviewBody site={site} accent={theme.accent} />}
          {tab === "domains" && <DomainsBody site={site} actions={actions} />}
        </Card>
        {tab !== "preview" && (
          <Card
            icon={<span className="relative inline-flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-moss opacity-60 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-moss" /></span>}
            title="Live preview" hint={site.domain}
          >
            <PreviewBody site={site} accent={theme.accent} />
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Doc site list + create ────────────────────────────────────────────────*/

/* The workspace publishes as many doc sites as it has made, and this is the
   only surface that can make one. It used to be absent entirely: `site` was a
   single nullable row, so a workspace with no site got an empty state with
   nothing on it to press and one with three sites could only ever see one. */
function SiteList({ sites, tagOptions, createOpen, actions }: {
  sites: SiteSummary[]; tagOptions: string[]; createOpen: boolean; actions?: PublishActions;
}) {
  const [rows, setRows] = useState<SiteSummary[]>(sites);
  const [creating, setCreating] = useState(createOpen);
  const write = useWrite();

  /* A create invalidates the read behind it, so the next `sites` is the new
     truth rather than the copy taken at mount. Through the one sentinel
     (actions/useResync.ts): as an effect this painted one frame of the stale
     list before correcting itself. */
  useResync(sites, setRows);

  const create = async (name: string, domain: string, sourceTags: string[]) => {
    const ok = await write.run(
      actions?.createSite && (() => actions.createSite!({ name, domain, sourceTags })),
      /* The echo is what the canvas (and any caller with no handler) sees; a
         real create re-reads and this row is replaced by the server's. Draft
         and 0 docs are true of every site that has never been built. */
      () => setRows((rs) => [...rs, {
        id: Math.max(0, ...rs.map((r) => r.id)) + 1, name, domain, status: "draft", docs: 0,
      }]),
    );
    if (ok) setCreating(false);
  };

  /* Deleting a site takes the published site down with it, so it is a
     ConfirmButton and never fires on a first click (§2). */
  const remove = (id: number) => write.run(
    actions?.deleteSite && (() => actions.deleteSite!(id)),
    () => setRows((rs) => rs.filter((r) => r.id !== id)),
  );

  /* §3: every column sorts. They were all `sortable={false}`, so a workspace
     with fifty sites could not find one. Long lists page rather than growing
     the card (§13). */
  const { sort, onSort, sorted } = useSort(rows, {
    name: (r) => r.name.toLowerCase(),
    status: (r) => r.status,
    docs: (r) => r.docs,
  }, { key: "name", dir: "asc" });
  const pager = usePaged(sorted, 25);

  return (
    <div className="flex flex-col gap-4">
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Doc sites</h3>
            {/* XA-05: this hand-rolled its own count with a pluralising
                ternary, directly above the ResultCount strip that already
                reports one. The summary keeps the sentence, the strip keeps
                the number. */}
            <div className="mt-0.5 text-[12px] text-ink/70">
              Each site publishes the documents its source tags allow.
            </div>
          </div>
          <Button variant="primary" compact onClick={() => setCreating(true)}><Plus size={13} /> New site</Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No doc sites yet">
            Pick source tags, build a static site, and deploy it to an S3 bucket you map a domain to.
          </EmptyState>
        ) : (
          <>
          {/* Count strip above the rows it describes (§13). */}
          <ResultCount from={pager.from} to={pager.to} total={pager.total} noun="doc sites" className="mt-2" />
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <SortHeader label="Site" sortKey="name" sort={sort} onSort={onSort} />
                <SortHeader label="Docs" sortKey="docs" sort={sort} onSort={onSort} align="right" />
                {/* §3: a row with a clickable action puts status second to
                    last. */}
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                <SortHeader label="Actions" sortable={false} align="right" />
              </tr>
            </thead>
            <tbody>
              {pager.pageRows.map((s) => (
                <tr key={s.id}>
                  <td className={`${tdPad} max-w-[320px] border-b border-ink/[0.06] align-middle`}>
                    {/* Opening a site is the app's route, so the name is a
                        button only where there is one to follow (§2). */}
                    {actions?.openSite ? (
                      <button
                        type="button"
                        onClick={() => actions.openSite!(s.id)}
                        className={`block max-w-full truncate text-left text-[14px] font-semibold text-ink hover:underline rounded-[3px] ${focusRing}`}
                      >
                        {s.name}
                      </button>
                    ) : (
                      <Truncate className="text-[14px] font-semibold text-ink">{s.name}</Truncate>
                    )}
                    <div className="truncate font-term text-[11.5px] text-ink/65">{s.domain}</div>
                  </td>
                  <td className={`${tdPad} whitespace-nowrap border-b border-ink/[0.06] text-right align-middle font-term text-[12px] text-ink/70`}>
                    {s.docs.toLocaleString()}
                  </td>
                  <td className={`${tdPad} whitespace-nowrap border-b border-ink/[0.06] align-middle`}>
                    <Chip label={s.status === "live" ? "Live" : "Draft"} tone={s.status === "live" ? "ok" : "neutral"} dot pulse={s.status === "live"} caps />
                  </td>
                  <td className={`${tdPad} whitespace-nowrap border-b border-ink/[0.06] text-right align-middle`}>
                    <span className="inline-flex items-center gap-1.5">
                      {actions?.openSite && <Button compact onClick={() => actions.openSite!(s.id)}>Open</Button>}
                      {/* Publish had no way to delete a site anywhere, so a
                          mistyped domain was permanent. */}
                      {actions?.deleteSite && (
                        <ConfirmButton compact disabled={write.busy} confirmLabel={`Delete ${s.name}?`} onConfirm={() => void remove(s.id)}>
                          Delete
                        </ConfirmButton>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pager.paged && <PagerBar page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} />}
          </>
        )}
        {write.failed && <div className="border-t border-ink/10 px-4 py-2.5"><WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError></div>}
      </div>

      {creating && (
        <NewSiteDrawer
          tagOptions={tagOptions}
          busy={write.busy}
          onCreate={(n, d, t) => void create(n, d, t)}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function NewSiteDrawer({ tagOptions, busy, onCreate, onClose }: {
  tagOptions: string[]; busy: boolean;
  onCreate: (name: string, domain: string, sourceTags: string[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  return (
    <Drawer
      open
      onClose={onClose}
      title="New doc site"
      subtitle="Name it, point a domain at it, choose what it may publish"
      icon={<Send size={16} className="text-ink/70" />}
      footer={
        <>
          <Button variant="primary" disabled={!name.trim() || !domain.trim() || busy} onClick={() => onCreate(name.trim(), domain.trim(), tags)}>
            {busy ? "Creating…" : "Create site"}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Docs" className="w-full" />
      </Field>
      <Field label="Domain">
        <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="docs.acme.com" className="w-full font-term" />
      </Field>
      <Field label="Source tags">
        {/* Sources cannot be changed from the editor, so this is the one place
            they are chosen — a site created with none publishes nothing. */}
        {tagOptions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((t) => (
              <Chip
                key={t}
                label={t}
                caps={false}
                selected={tags.includes(t)}
                onClick={() => setTags((ts) => ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t])}
              />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink/65">This workspace has no tags yet, so the site starts with no source filter.</p>
        )}
      </Field>
      <div className="pt-2 text-[11.5px] text-ink/65">
        The site starts as a draft: it publishes nothing until you build and deploy it.
      </div>
    </Drawer>
  );
}

/* ── Publish / deploy flow ─────────────────────────────────────────────────*/
function PublishFlow({ phase: given, site, mobile, actions }: { phase: PublishPhase; site: DocSite; mobile: boolean; actions?: PublishActions }) {
  const write = useWrite();
  const [reached, setReached] = useState<PublishPhase | null>(null);
  /* Where the deploy has got to: the caller's answer until this page's own
     button moves it on. `busy` is the publishing step, so the stepper and the
     progress bar are true of the write actually in flight. */
  const phase: PublishPhase = write.busy ? "publishing" : reached ?? given;
  const deploy = () => write.run(
    actions?.deploySite && (() => actions.deploySite!()),
    () => setReached("published"),
  );
  const previewBuild = () => write.run(
    actions?.buildSite && (() => actions.buildSite!()),
    () => setReached("draft"),
  );
  const rollback = (version: string) => write.run(
    actions?.rollbackRelease && (() => actions.rollbackRelease!(version)),
    () => setReached("published"),
  );
  const step = phase === "draft" ? 0 : phase === "publishing" ? 1 : 3;
  const statusChip =
    phase === "published" ? <Chip label="Live" tone="ok" dot pulse caps />
    : phase === "publishing" ? <Chip label="Publishing" tone="info" dot caps />
    : <Chip label="Draft" tone="neutral" dot caps />;
  return (
    /* §11: the deploy card fills the main column and the release log takes the
       standard 320px rail, instead of a max-w-2xl card leaving a dead gutter. */
    <div
      className={
        mobile
          ? "flex flex-col gap-5 [&>*]:min-w-0"
          : `items-start [&>*]:min-w-0 ${SPLIT[320]}`
      }
    >
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-ink">{site.name} · {site.version}</span>
          {statusChip}
        </div>
        <Stepper labels={["Build", "Upload", "Release"]} current={step} />
        {/* A deploy reports no percentage: nothing on this page knows how far
            the upload has got. `Progress value={62}` was a number this file
            made up and drew as fact, so the honest read-out is an
            indeterminate one. */}
        {phase === "publishing" && (
          <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-ink/70">
            <Spinner size="sm" />
            {site.bucket ? `Uploading to ${site.bucket}. This keeps running on the server.` : "Building and uploading. This keeps running on the server."}
          </p>
        )}
        {phase === "published" && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-moss"><Check size={15} /> {site.releasedNote}</p>
        )}
        {write.failed && (
          <div className="mt-4"><WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError></div>
        )}
        {/* Primary action bottom left (§2), secondary to its right. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {phase === "published"
            ? <Link href={siteUrl(site.domain)} external className="inline-flex items-center gap-1.5 text-[13px] text-biscay-2 hover:underline"><ExternalLink size={14} /> View live site</Link>
            : (
              <>
                <Button variant="primary" disabled={phase === "publishing"} onClick={() => void deploy()}>
                  {phase === "publishing" ? "Publishing…" : "Deploy"}
                </Button>
                <Button disabled={write.busy} onClick={() => void previewBuild()}>Preview build</Button>
              </>
            )}
        </div>
      </div>
      <div className={`${card} p-4`}>
        <SectionLabel>Release history</SectionLabel>
        <ul className="mt-1.5 flex flex-col divide-y divide-ink/10">
          {site.releases.map((r) => (
            <li key={r.version} className="flex items-center gap-3 py-2.5">
              <span className="w-2 h-2 rounded-full bg-ink/30" />
              <span className="text-[13px] font-medium text-ink">{r.version}</span>
              <span className="font-term text-[11.5px] text-ink/65 flex-1">{r.note}</span>
              {/* Release history rendered with NO date at all, so "v12" gave the
                  reader no way to tell last week's deploy from last year's.
                  Through fmtDate, so it carries a year like every other date. */}
              {r.date && <span className="whitespace-nowrap font-term text-[11.5px] text-ink/65">{fmtDate(r.date)}</span>}
              {/* Rolling a live site back to an older build is destructive:
                  it must not fire on first click (CONVENTIONS §2). */}
              <ConfirmButton compact confirmLabel="Roll back?" disabled={write.busy} onConfirm={() => void rollback(r.version)}>
                Rollback
              </ConfirmButton>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Body({ data, section, error, mobile, actions }: {
  data: PublishData; section: PublishSection; error: string | null; mobile: boolean; actions?: PublishActions;
}): ReactNode {
  /* XA-01: this was the closest of the eight hand-rolled read-failure
     surfaces, but it was still a copy. One surface, shared with every other
     page: catalog heading and tone, the server's own message underneath. */
  if (error) return <ReadError>{error}</ReadError>;

  /* The TAB decides which of the two surfaces is on screen; `data.view` only
     decides which SCREEN of that surface, and only when it belongs to it.
     This switched on `data.view` alone, so the tab strip above set state that
     nothing here read: the underline moved and the panel never changed. */
  if (section === "mcp") {
    /* All three MCP screens are the same component. They used to be two static
       copies of it plus the real one, so "Create server", "Cancel" and both
       "New server" buttons were decoration. */
    return (
      <PublishMcpServers
        servers={data.servers}
        actions={actions}
        createOpen={data.view === "mcp-add"}
        /* A token screen with no token would render the one-time reveal empty.
           The reveal is what `createServer` hands back, so a `mcp-token` route
           that carries nothing shows the plain list (§2). */
        revealServer={data.view === "mcp-token" && data.created.token
          ? { name: data.created.name, token: data.created.token }
          : null}
      />
    );
  }

  const siteList = (
    <SiteList sites={data.sites} tagOptions={data.tagOptions} createOpen={data.view === "site-new"} actions={actions} />
  );

  switch (data.view) {
    case "publish-flow":
      /* Same fallback as the editor: a deploy flow with no site to deploy is a
         blank panel, and the list is where the reader picks one. */
      return data.site ? <PublishFlow phase={data.phase} site={data.site} mobile={mobile} actions={actions} /> : siteList;
    case "site-editor":
      /* No site on an editor route means the row is gone (or has not arrived).
         The list is the honest fallback — a blank panel is not. */
      return data.site ? <SiteEditorInline initialTab={data.editorTab} site={data.site} mobile={mobile} actions={actions} /> : siteList;
    default:
      /* Includes the MCP views: the reader is on Doc sites, so that is what
         they get, whatever screen the route last named. */
      return siteList;
  }
}

function PublishPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<PublishData, PublishActions>) {
  /* Seeded by the route, then owned by the reader — the seen-sentinel idiom
     (actions/useResync.ts). `data.view` is how an app deep-links a screen (it
     routes to `mcp-token` after minting a token), so a NEW view adopts its
     section; between those, the tab the reader clicked wins. The old code
     wrote `value={mcpView ? "mcp" : tab}`, which let the route veto the click
     for as long as an MCP view stayed on. */
  const section = SECTION_OF[data.view] ?? "sites";
  const [tab, setTab] = useState<PublishSection>(section);
  useResync(section, setTab);
  /* The app is told, so it can put the tab in the URL and a Publish tab
     survives a reload; with no handler the tab stays local to this page. */
  const pickTab = (next: PublishSection) => { setTab(next); actions?.openSection?.(next); };
  // Only a failed read has nothing to switch between: the site list exists
  // even when the workspace has no sites, because it is where one is made.
  const bare = error !== null;

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("publish")} title="Publish" mobile={mobile}>
        <SkeletonPage
          variant="editor"
          eyebrow="Doc site"
          title="Publish"
          description="Turn the knowledge base into a documentation website, or expose it to Claude and agents over MCP."
          tabs={["Doc sites", "MCP servers"]}
          actions={0}
          mobile={mobile}
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame chrome={chrome} active={navFor("publish")} title="Publish" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Doc site"
          title="Publish"
          description="Turn the knowledge base into a documentation website, or expose it to Claude and agents over MCP."
          icon={<span className="text-moss"><Send size={24} /></span>}
        />
        <div className="mt-6 flex flex-col gap-5 [&>*]:min-w-0">
          {!bare && (
            <Tabs<PublishSection> ariaLabel="Publish sections" variant="underline" options={TAB_OPTIONS} value={tab} onChange={pickTab} />
          )}
          <Body data={data} section={tab} error={error} mobile={mobile} actions={actions} />
        </div>
      </div>
    </PageFrame>
  );
}

export const page: PageModule<PublishData, PublishActions> = {
  id: "publish",
  title: "Publish",
  route: "/publish",
  component: PublishPage,
  states: STATES.map((s) => ({ ...s })),
};
