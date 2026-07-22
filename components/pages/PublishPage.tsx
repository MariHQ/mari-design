import { useState, type ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Send, ExternalLink, FileText, Check, Plus } from "lucide-react";
import { card } from "../tokens/card";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
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
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PublishMcpServers } from "../features/PublishMcpServers";
import { Avatar } from "../data-display/Avatar";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_DOC_TITLE, LONG_URL,
  UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS,
} from "./stress";

/* Publish (pages/publish.md). The doc-site product: turn the knowledge base
   into a static documentation website, or expose it to Claude/agents over MCP.
   A top-level tab strip switches Doc sites ↔ MCP servers.

   States enumerate the whole surface inline: each site-editor tab
   (Content / Theme / Preview / Domains), the publish/deploy flow
   (draft → publishing → published), and the MCP lifecycle
   (list / add-server / token-created / empty) — composed in the page body so a
   static screenshot reads each step, rather than relying on a portalled flow. */

type Tab = "sites" | "mcp";

const TAB_OPTIONS: TabOption<Tab>[] = [
  { id: "sites", label: "Doc sites" },
  { id: "mcp", label: "MCP servers" },
];

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

/* ── Overflow / stress fixtures (see pages/stress.ts) ───────────────────────
   An inline site header (long site + domain names) plus the real MCP-servers
   feature fed long/pathological server names, URLs, and capability chips. */
function PublishStressBody({ stress }: { stress: boolean }) {
  const siteName = stress ? UNBREAKABLE : LONG_TITLE;
  const domain = stress ? LONG_URL : LONG_SOURCE;
  const chips = stress ? MANY_TAGS : ["customer-facing", "canonical", "incident-response", "reliability"];
  return (
    <div className="mt-6 flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip label="Live" tone="ok" dot pulse caps />
          <span className="min-w-0 break-words text-[15px] font-semibold text-ink">{siteName}</span>
          <span className="min-w-0 break-words font-term text-[12px] text-ink/50">{domain}</span>
        </div>
        <p className="mt-2 text-[13px] text-ink/70">{stress ? MIXED_SCRIPT : LONG_PARAGRAPH}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c, i) => <Chip key={i} label={c} tone="neutral" />)}
        </div>
        {stress && (
          <div className="mt-3 flex -space-x-2">
            {MANY_INITIALS.map((ini, n) => (
              <span key={n} className="rounded-full ring-2 ring-paper"><Avatar initials={ini} /></span>
            ))}
          </div>
        )}
      </Card>

      <PublishMcpServers
        servers={
          stress
            ? [
                { id: 1, name: UNBREAKABLE, url: LONG_URL, scope: "project", status: "connected", capabilities: MANY_TAGS },
                { id: 2, name: LONG_WORD, url: LONG_URL, scope: "org", status: "idle", capabilities: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT] },
              ]
            : [
                { id: 1, name: "support-kb-consolidated-across-every-service-and-region", url: `https://mcp.mari.guru/s/${LONG_DOC_TITLE}`, scope: "project", status: "connected", capabilities: ["search", "facts", "answers", "glossary", "chat", "lineage"] },
                { id: 2, name: LONG_DOC_TITLE, url: `https://mcp.mari.guru/servers/${LONG_DOC_TITLE}`, scope: "org", status: "idle", capabilities: ["search", "lineage"] },
              ]
        }
      />
    </div>
  );
}

const ACCENTS = ["#b04e2c", "#35549d", "#43663c", "#6a5a9c", "#8a8171"];
const THEMES = [
  { key: "mari", name: "Mari Editorial", accent: "#b04e2c", bg: "#fcf9f1" },
  { key: "minimal", name: "Minimal", accent: "#2d2a22", bg: "#ffffff" },
  { key: "material", name: "Material", accent: "#35549d", bg: "#f8f9fc" },
  { key: "starlight", name: "Starlight", accent: "#43663c", bg: "#fbfaf6" },
];
const NAV_ITEMS = ["Getting started", "Guides", "Reference"];
const GATES = [
  { name: "All facts verified", ok: true, note: "148/148 verified" },
  { name: "No broken links", ok: true, note: "checked at build" },
  { name: "Glossary coverage", ok: false, note: "3 terms undefined" },
];

type EditorTab = "content" | "theme" | "preview" | "domains";
type PublishPhase = "draft" | "publishing" | "published";

function tabForState(state: string): Tab {
  return state.startsWith("mcp") ? "mcp" : "sites";
}

/* ── Inline site-editor tab bodies ─────────────────────────────────────────*/
function EditorTabs({ active }: { active: EditorTab }) {
  const tabs: { id: EditorTab; label: string }[] = [
    { id: "content", label: "Content" }, { id: "theme", label: "Theme" }, { id: "preview", label: "Preview" }, { id: "domains", label: "Domains" },
  ];
  return (
    <div className="flex items-center gap-5 border-b border-ink/15 mb-4">
      {tabs.map((t) => (
        <span key={t.id} aria-current={t.id === active ? "page" : undefined}
          className={`pb-2 text-[13px] font-medium border-b-2 -mb-px ${t.id === active ? "text-ink border-biscay-2" : "text-ink/55 border-transparent"}`}>{t.label}</span>
      ))}
    </div>
  );
}

function ContentBody() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>Sources</SectionLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5"><TagChip tag="customer-facing" /><TagChip tag="canonical" /></div>
        <p className="mt-1.5 text-[12px] text-ink/50">Sources are set at creation and drive which docs are eligible.</p>
      </div>
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-ink/50" />
        <span className="text-[13px] text-ink/80">148 docs match</span>
        <Chip label="2 warnings" tone="attention" dot />
      </div>
      <div>
        <SectionLabel>Pre-publish gates</SectionLabel>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {GATES.map((g) => (
            <li key={g.name} className="flex items-center gap-2 text-[13px]">
              <Check size={14} className={g.ok ? "text-moss" : "text-clay"} />
              <span className="text-ink/85">{g.name}</span>
              <span className={`font-term text-[11.5px] ${g.ok ? "text-ink/45" : "text-clay"}`}>· {g.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ThemeBody() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>Preset</SectionLabel>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {THEMES.map((t, i) => (
            <div key={t.key} className={`flex items-center gap-2.5 p-2 rounded-[5px] border ${i === 0 ? "border-biscay-2 ring-1 ring-biscay-2/40" : "border-ink/15"}`}>
              <span className="w-8 h-8 rounded-[3px] border border-ink/10 grid place-items-end p-1" style={{ background: t.bg }}><span className="w-3 h-3 rounded-full" style={{ background: t.accent }} /></span>
              <span className="text-[12.5px] font-medium text-ink">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Accent</SectionLabel>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {ACCENTS.map((c, i) => <Swatch key={c} color={c} selected={i === 0} />)}
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

function PreviewBody() {
  const accent = ACCENTS[0];
  return (
    <div className="rounded-md border border-ink/15 overflow-hidden" style={{ background: "#fcf9f1" }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink/10 bg-black/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        <span className="ml-2 font-term text-[11px] text-ink/45">docs.acme.com</span>
      </div>
      <div className="flex min-h-[260px]">
        <aside className="w-1/3 border-r border-ink/10 p-3">
          <div className="text-[13px] font-bold mb-2.5" style={{ color: accent }}>Acme Docs</div>
          <ul className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((n, i) => <li key={n} className="text-[11px] font-medium" style={{ color: i === 0 ? accent : "#6a675f" }}>{n}</li>)}
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

function DomainsBody() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>S3 target</SectionLabel>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          <Input className="w-full font-term" readOnly value="acme-docs-prod" />
          <Input className="w-full font-term" readOnly value="us-east-1" />
        </div>
      </div>
      <div>
        <SectionLabel>Domain mapping</SectionLabel>
        <Input className="mt-1.5 w-full font-term" readOnly value="docs.acme.com" />
        <p className="mt-1 text-[12px] text-ink/50">Point docs.acme.com → your S3 website endpoint. Without a bucket, deploys build locally.</p>
      </div>
      <div><Button compact>Save deploy config</Button></div>
    </div>
  );
}

function SiteEditorInline({ tab }: { tab: EditorTab }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Acme Docs"
        backLink={{ href: "#", label: "All sites" }}
        actions={
          <>
            <Chip label="Live" tone="ok" dot pulse caps />
            <span className="font-term text-[12px] text-ink/60 hidden sm:inline">docs.acme.com</span>
            <a href="#" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80"><ExternalLink size={14} /> Open site</a>
            <Button variant="primary">Deploy</Button>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <EditorTabs active={tab} />
          {tab === "content" && <ContentBody />}
          {tab === "theme" && <ThemeBody />}
          {tab === "preview" && <PreviewBody />}
          {tab === "domains" && <DomainsBody />}
        </Card>
        <Card
          icon={<span className="relative inline-flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-moss opacity-60 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-moss" /></span>}
          title="Live preview" hint="docs.acme.com"
        >
          <PreviewBody />
        </Card>
      </div>
    </div>
  );
}

/* ── Publish / deploy flow ─────────────────────────────────────────────────*/
function PublishFlow({ phase }: { phase: PublishPhase }) {
  const step = phase === "draft" ? 0 : phase === "publishing" ? 1 : 3;
  const statusChip =
    phase === "published" ? <Chip label="Live" tone="ok" dot pulse caps />
    : phase === "publishing" ? <Chip label="Publishing" tone="info" dot caps />
    : <Chip label="Draft" tone="neutral" dot caps />;
  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4">
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-ink">Acme Docs · v14</span>
          {statusChip}
        </div>
        <Stepper labels={["Build", "Upload", "Release"]} current={step} />
        {phase === "publishing" && (
          <div className="mt-4"><Progress value={62} tone="info" label="Uploading to acme-docs-prod" /></div>
        )}
        {phase === "published" && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-moss"><Check size={15} /> Released to docs.acme.com · 148 docs deployed</p>
        )}
        <div className="mt-4">
          {phase === "published"
            ? <a href="#" className="inline-flex items-center gap-1.5 text-[13px] text-biscay-2 hover:underline"><ExternalLink size={14} /> View live site</a>
            : <Button block variant="primary">{phase === "publishing" ? "Publishing…" : "Deploy"}</Button>}
        </div>
      </div>
      <div className={`${card} p-4`}>
        <SectionLabel>Release history</SectionLabel>
        <ul className="mt-1.5 flex flex-col divide-y divide-ink/10">
          {[{ v: "v14", note: phase === "published" ? "Live · just now" : "Deployed to S3 · acme-docs-prod" }, { v: "v13", note: "superseded" }, { v: "v12", note: "Docusaurus generator" }].map((r) => (
            <li key={r.v} className="flex items-center gap-3 py-2.5">
              <span className="w-2 h-2 rounded-full bg-ink/30" />
              <span className="text-[13px] font-medium text-ink">{r.v}</span>
              <span className="font-term text-[11.5px] text-ink/50 flex-1">{r.note}</span>
              <Button compact>Rollback</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── MCP add / token states ────────────────────────────────────────────────*/
const MCP_CAPS = [
  { key: "search", tools: 3, desc: "hybrid search over documents", on: true },
  { key: "facts", tools: 4, desc: "verified facts + verify", on: true },
  { key: "glossary", tools: 2, desc: "term definitions", on: false },
  { key: "answers", tools: 2, desc: "approved answers, served verbatim", on: false },
];

function McpAddServer() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="MCP servers" description="Expose your curated knowledge to Claude and other agents — per-project, capability-scoped."
        actions={<><CountChip count={3} /><Button variant="primary"><Plus size={15} /> New server</Button></>} />
      <Card title="New MCP server">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><SectionLabel>Name</SectionLabel><Input className="w-full" readOnly value="support-kb" /></label>
          <label className="flex flex-col gap-1.5"><SectionLabel>Scope</SectionLabel><Select className="w-full" defaultValue="project"><option value="project">project</option></Select></label>
        </div>
        <div className="mt-4">
          <SectionLabel>Capabilities — 7 tools selected</SectionLabel>
          <div className="mt-1.5 grid gap-1.5">
            {MCP_CAPS.map((c) => (
              <div key={c.key} className={`flex items-start gap-2.5 p-2.5 rounded-[5px] border ${c.on ? "border-biscay-2 bg-biscay-2/[0.04]" : "border-ink/15"}`}>
                <span className={`mt-0.5 grid place-items-center w-4 h-4 rounded-[3px] border text-[10px] text-white ${c.on ? "bg-biscay border-biscay" : "border-ink/30"}`}>{c.on ? "✓" : ""}</span>
                <span className="min-w-0">
                  <span className="text-[13px] font-semibold text-ink">{c.key}</span>
                  <span className="font-term text-[11.5px] text-ink/45"> · {c.tools} tools</span>
                  <span className="block text-[12px] text-ink/55">{c.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="primary">Create server</Button>
          <Button>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}

function McpTokenCreated() {
  const snippet = `claude mcp add support-kb --transport http https://mcp.acme.com/s/support-kb \\\n  --header "Authorization: Bearer mcp_9f3a2b7c4d1e8f6a0b5c2d9e"`;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="MCP servers" description="Expose your curated knowledge to Claude and other agents — per-project, capability-scoped."
        actions={<><CountChip count={4} /><Button variant="primary"><Plus size={15} /> New server</Button></>} />
      <TokenReveal token="mcp_9f3a2b7c4d1e8f6a0b5c2d9e77aa11bb" title="support-kb is live — here's your bearer token" />
      <Card>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#c9bda0]" />
          <span className="text-[14px] font-semibold text-ink">support-kb</span>
          <Chip label="project" tone="neutral" caps />
          <span className="font-term text-[11.5px] text-ink/50">7 tools</span>
        </div>
        <div className="mt-3">
          <SectionLabel>Connect from claude-code</SectionLabel>
          <div className="mt-1.5"><CodeBlock language="bash" code={snippet} wrap /></div>
        </div>
      </Card>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────*/
function Body({ state }: { state: string }): ReactNode {
  if (state === "error") return <div className="mt-6"><EmptyState title="API offline">Publishing is temporarily unavailable — releases and deploys can't be reached. Retrying…</EmptyState></div>;
  if (state === "empty") return <div className="mt-6"><EmptyState title="No sites yet">Pick source tags, build a static site, and deploy it to an S3 bucket you map a domain to.</EmptyState></div>;
  if (state === "overflow" || state === "stress") return <PublishStressBody stress={state === "stress"} />;

  if (state.startsWith("publish-")) return <div className="mt-6"><PublishFlow phase={state.slice("publish-".length) as PublishPhase} /></div>;
  if (state === "mcp-add") return <div className="mt-6"><McpAddServer /></div>;
  if (state === "mcp-token") return <div className="mt-6"><McpTokenCreated /></div>;
  if (state === "mcp-empty") return <div className="mt-6"><PublishMcpServers servers={[]} /></div>;
  if (state === "mcp") return <div className="mt-6"><PublishMcpServers /></div>;

  const siteTab: EditorTab =
    state === "site-theme" ? "theme" : state === "site-preview" ? "preview" : state === "site-domains" ? "domains" : "content";
  return <div className="mt-6"><SiteEditorInline tab={siteTab} /></div>;
}

function PublishPage({ state = "default", mobile = false }: PageProps) {
  const [tab, setTab] = useState<Tab>(tabForState(state));
  const bareState = state === "loading" || state === "error" || state === "empty";

  if (state === "loading") {
    return (
      <PageFrame active={navFor("publish")} title="Publish" mobile={mobile}>
        <SkeletonPage variant="editor" />
      </PageFrame>
    );
  }

  return (
    <PageFrame active={navFor("publish")} title="Publish" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Doc site"
          title="Publish"
          description="Turn the knowledge base into a documentation website, or expose it to Claude and agents over MCP."
          icon={<span className="text-moss"><Send size={24} /></span>}
        />
        {!bareState && (
          <div className="mt-5">
            <Tabs<Tab> ariaLabel="Publish sections" variant="underline" options={TAB_OPTIONS} value={tabForState(state) === "mcp" ? "mcp" : tab} onChange={setTab} />
          </div>
        )}
        <Body state={state} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "publish",
  title: "Publish",
  route: "/publish",
  component: PublishPage,
  states: STATES.map((s) => ({ ...s })),
};
