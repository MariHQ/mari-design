import { useState, type ReactNode } from "react";
import { Truncate } from "../data-display/Truncate";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Send, ExternalLink, FileText, Check, Plus, GripVertical } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip, CountChip } from "../data-display/Chip";
import { Swatch } from "../data-display/Swatch";
import { Stepper } from "../data-display/Stepper";
import { Progress } from "../data-display/Progress";
import { TagChip } from "../data-display/TagChip";
import { CodeBlock } from "../data-display/CodeBlock";
import { TokenReveal } from "../data-display/TokenReveal";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Alert } from "../feedback/Alert";
import { ERRORS } from "../feedback/errors";
import { Switch } from "../forms/Switch";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PublishMcpServers, type McpServer, type PublishMcpActions } from "../features/PublishMcpServers";
import { useWrite } from "../actions/useWrite";
import { WriteError } from "../feedback/WriteError";
import { Link } from "../navigation/Link";
import { siteUrl } from "../tokens/siteUrl";

/* Publish (pages/publish.md). The doc-site product: turn the knowledge base
   into a static documentation website, or expose it to Claude/agents over MCP.
   A top-level tab strip switches Doc sites ↔ MCP servers.

   States enumerate the whole surface inline: each site-editor tab
   (Content / Theme / Preview / Domains), the publish/deploy flow
   (draft → publishing → published), and the MCP lifecycle
   (list / add-server / token-created / empty) — composed in the page body so a
   static screenshot reads each step, rather than relying on a portalled flow.

   Pure presenter: the site being edited, its nav tree, theme presets, gates,
   release history and the MCP servers all arrive in `data`. "No sites yet" is
   derived from there being neither a site nor a server. */

type Tab = "sites" | "mcp";

const TAB_OPTIONS: TabOption<Tab>[] = [
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
  | "site-editor" | "publish-flow" | "mcp-list" | "mcp-add" | "mcp-token";

/** One toggleable static-site-generator feature. */
export type SiteFeature = { key: string; label: string; hint: string; on: boolean };
/** A pre-publish check and what it found. */
export type PublishGate = { name: string; ok: boolean; note: string };
/** A theme preset the site can adopt. The first is the selected one. */
export type SiteTheme = { key: string; name: string; accent: string; bg: string };
/** One section of the site's navigation tree. */
export type NavSection = { label: string; docs: number };
/** A past deploy. */
export type SiteRelease = { version: string; note: string };

/** The doc site being edited. */
export type DocSite = {
  name: string;
  domain: string;
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

    There is no `addNavSection` / `removeNavSection`: the navigation tree has
    no mutation of its own (a build rewrites it), so those two buttons keep
    their local behaviour rather than pretending to persist. */
export type PublishActions = PublishMcpActions & {
  /** Leave the site editor and go back to the list of sites. Which view is on
      screen lives in `data`, so the page cannot go back on its own. */
  openSites?: () => void;
  deploySite?: () => void | Promise<void>;
  buildSite?: () => void | Promise<void>;
  rollbackRelease?: (version: string) => void | Promise<void>;
  setSiteFeature?: (key: string, on: boolean) => void | Promise<void>;
  setSiteTheme?: (theme: { preset?: string; accent?: string }) => void | Promise<void>;
  saveDeployConfig?: (cfg: { bucket: string; region: string }) => void | Promise<void>;
};

/** Everything Publish renders. */
export type PublishData = {
  view: PublishView;
  editorTab: EditorTab;
  phase: PublishPhase;
  /** The site being edited. `null` = this workspace has no sites. */
  site: DocSite | null;
  servers: McpServer[];
  /** Servers in the workspace, shown on the MCP screen headers. */
  serverCount: number;
  draft: McpDraft;
  created: McpCreated;
};

const STATES = [
  { id: "default", label: "Site · Content" },
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
  { id: "error", label: "API offline" },
  { id: "empty", label: "No sites yet" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* ── Inline site-editor tab bodies ─────────────────────────────────────────*/
function EditorTabs({ active }: { active: EditorTab }) {
  const tabs: { id: EditorTab; label: string }[] = [
    { id: "content", label: "Content" }, { id: "theme", label: "Theme" }, { id: "preview", label: "Preview" }, { id: "domains", label: "Domains" },
  ];
  return (
    <div className="flex items-center gap-5 border-b border-ink/15 mb-4">
      {tabs.map((t) => (
        <span key={t.id} aria-current={t.id === active ? "page" : undefined}
          className={`pb-2 text-[13px] font-medium border-b-2 -mb-px ${t.id === active ? "text-ink border-biscay-2" : "text-ink/65 border-transparent"}`}>{t.label}</span>
      ))}
    </div>
  );
}

/* mkdocs-style site-builder controls: an editable nav tree plus the feature
   switches a static-site generator exposes. Every control is wired to local
   state so nothing here is inert (§2). */
function ContentBody({ site, actions }: { site: DocSite; actions?: PublishActions }) {
  const [nav, setNav] = useState<NavSection[]>(site.nav);
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(site.features.map((f) => [f.key, f.on])),
  );
  const write = useWrite();

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
        <Chip label={site.warnings} tone="attention" dot />
      </div>

      <div>
        <SectionLabel>Navigation</SectionLabel>
        <ul className="mt-1.5 flex flex-col divide-y divide-ink/10 rounded-[5px] border border-ink/15">
          {nav.map((n, i) => (
            <li key={`${n.label}-${i}`} className="flex items-center gap-2 px-2.5 py-2">
              <GripVertical size={14} className="shrink-0 text-ink/65" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{n.label}</span>
              <span className="shrink-0 font-term text-[11.5px] text-ink/65">{n.docs} docs</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-2">
          <Button
            compact
            onClick={() => setNav((ns) => [...ns, { label: `Section ${ns.length + 1}`, docs: 0 }])}
          >
            <Plus size={13} /> Add section
          </Button>
          <Button compact disabled={nav.length <= 1} onClick={() => setNav((ns) => ns.slice(0, -1))}>
            Remove last
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

function ThemeBody({ site, actions }: { site: DocSite; actions?: PublishActions }) {
  /* Presets and accents used to be a picture: the first row was hard-coded as
     the selected one and nothing was clickable. They are controls now, and
     with a handler each pick is written to the site's theme (§2). */
  const [preset, setPreset] = useState(site.themes[0]?.key ?? "");
  const [accent, setAccent] = useState(site.accents[0] ?? "");
  const write = useWrite();
  const pickPreset = (key: string) => write.run(
    actions?.setSiteTheme && (() => actions.setSiteTheme!({ preset: key, accent })),
    () => setPreset(key),
  );
  const pickAccent = (color: string) => write.run(
    actions?.setSiteTheme && (() => actions.setSiteTheme!({ preset, accent: color })),
    () => setAccent(color),
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
      <div>
        <SectionLabel>Density</SectionLabel>
        <div className="mt-1.5 inline-flex rounded-[4px] border border-ink/15 overflow-hidden">
          {["Comfortable", "Compact", "Dense"].map((o, i) => (
            <span key={o} className={`px-2.5 h-7 grid place-items-center text-[12px] font-medium border-r border-ink/10 last:border-0 ${i === 0 ? "bg-biscay text-white" : "bg-paper text-ink/65"}`}>{o}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewBody({ site }: { site: DocSite }) {
  const accent = site.accents[0];
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

function SiteEditorInline({ tab, site, mobile, actions }: { tab: EditorTab; site: DocSite; mobile: boolean; actions?: PublishActions }) {
  const write = useWrite();
  const [deployed, setDeployed] = useState(false);
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
            <Chip label="Live" tone="ok" dot pulse caps />
            <span className="hidden font-term text-[12px] text-ink/70 sm:inline">{site.domain}</span>
            {/* The published site itself, on its own domain — a genuinely
                external destination, so a real new-tab link rather than the
                "#" that used to sit here. This header only renders for a site
                the page has already labelled Live. */}
            <Link href={siteUrl(site.domain)} external className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80 hover:border-ink/45 hover:text-ink"><ExternalLink size={14} /> Open site</Link>
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
          <EditorTabs active={tab} />
          {tab === "content" && <ContentBody site={site} actions={actions} />}
          {tab === "theme" && <ThemeBody site={site} actions={actions} />}
          {tab === "preview" && <PreviewBody site={site} />}
          {tab === "domains" && <DomainsBody site={site} actions={actions} />}
        </Card>
        {tab !== "preview" && (
          <Card
            icon={<span className="relative inline-flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-moss opacity-60 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-moss" /></span>}
            title="Live preview" hint={site.domain}
          >
            <PreviewBody site={site} />
          </Card>
        )}
      </div>
    </div>
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
        {phase === "publishing" && (
          <div className="mt-4"><Progress value={62} tone="info" label={`Uploading to ${site.bucket}`} /></div>
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

function isEmpty(d: PublishData): boolean {
  return d.site === null && d.servers.length === 0;
}

function Body({ data, error, mobile, actions }: { data: PublishData; error: string | null; mobile: boolean; actions?: PublishActions }): ReactNode {
  /* The catalog owns the heading and the tone (§8); the body is the message
     the server actually sent, so the user sees the real failure. */
  if (error) return <Alert tone="blocked" title={ERRORS["server.unavailable"].title}>{error}</Alert>;
  if (isEmpty(data)) return <EmptyState title="No sites yet">Pick source tags, build a static site, and deploy it to an S3 bucket you map a domain to.</EmptyState>;

  switch (data.view) {
    /* All three MCP screens are the same component. They used to be two static
       copies of it plus the real one, so "Create server", "Cancel" and both
       "New server" buttons were decoration. */
    case "mcp-add":
      return <PublishMcpServers servers={data.servers} actions={actions} createOpen />;
    case "mcp-token":
      return <PublishMcpServers servers={data.servers} actions={actions} revealServer={{ name: data.created.name, token: data.created.token }} />;
    case "mcp-list":
      return <PublishMcpServers servers={data.servers} actions={actions} />;
    case "publish-flow":
      return data.site ? <PublishFlow phase={data.phase} site={data.site} mobile={mobile} actions={actions} /> : null;
    case "site-editor":
    default:
      return data.site ? <SiteEditorInline tab={data.editorTab} site={data.site} mobile={mobile} actions={actions} /> : null;
  }
}

function PublishPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<PublishData, PublishActions>) {
  const mcpView = data.view.startsWith("mcp");
  const [tab, setTab] = useState<Tab>(mcpView ? "mcp" : "sites");
  const bare = error !== null || isEmpty(data);

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("publish")} title="Publish" mobile={mobile}>
        <SkeletonPage variant="editor" />
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
            <Tabs<Tab> ariaLabel="Publish sections" variant="underline" options={TAB_OPTIONS} value={mcpView ? "mcp" : tab} onChange={setTab} />
          )}
          <Body data={data} error={error} mobile={mobile} actions={actions} />
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
