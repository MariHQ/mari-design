/* Publish canvas fixtures. Lifted out of `pages/PublishPage.tsx` and
   `features/PublishMcpServers.tsx`, which are now pure presenters. */

import type {
  DocSite, McpCreated, McpDraft, PublishData, SiteSummary, SiteTheme,
} from "../../pages/PublishPage";
import type { McpServer } from "../../features/PublishMcpServers";
import type { PageFixtures } from "./types";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_SOURCE, LONG_DOC_TITLE, LONG_URL,
  UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, MANY_TAGS, repeat,
} from "./stress";

const THEMES: SiteTheme[] = [
  { key: "mari", name: "Mari Editorial", accent: "#b04e2c", bg: "#fcf9f1" },
  { key: "minimal", name: "Minimal", accent: "#2d2a22", bg: "#ffffff" },
  { key: "material", name: "Material", accent: "#35549d", bg: "#f8f9fc" },
  { key: "starlight", name: "Starlight", accent: "#43663c", bg: "#fbfaf6" },
];

const SITE: DocSite = {
  id: 1,
  name: "Acme Docs",
  domain: "docs.acme.com",
  status: "live",
  version: "v14",
  sourceTags: ["customer-facing", "canonical"],
  docsMatched: 148,
  warnings: "2 warnings",
  nav: [
    { label: "Getting started", docs: 12 },
    { label: "Guides", docs: 74 },
    { label: "Reference", docs: 62 },
  ],
  features: [
    { key: "search", label: "Client-side search", hint: "Lunr index built at deploy", on: true },
    { key: "toc", label: "Page table of contents", hint: "Right rail, H2 and H3", on: true },
    { key: "edit", label: "Edit this page links", hint: "Points back at the source repo", on: false },
    { key: "versions", label: "Versioned docs", hint: "Keeps /v13 and /v14 side by side", on: false },
  ],
  gates: [
    { name: "All facts verified", ok: true, note: "148/148 verified" },
    { name: "No broken links", ok: true, note: "checked at build" },
    { name: "Glossary coverage", ok: false, note: "3 terms undefined" },
  ],
  themes: THEMES,
  accents: ["#b04e2c", "#35549d", "#43663c", "#6a5a9c", "#8a8171"],
  bucket: "acme-docs-prod",
  region: "us-east-1",
  previewNav: ["Getting started", "Guides", "Reference"],
  releases: [
    { version: "v14", note: "Deployed to S3 · acme-docs-prod" },
    { version: "v13", note: "superseded" },
    { version: "v12", note: "Docusaurus generator" },
  ],
  releasedNote: "Released to docs.acme.com · 148 docs deployed",
};

/** After a release goes out, the newest entry says so. */
const SITE_PUBLISHED: DocSite = {
  ...SITE,
  releases: [{ version: "v14", note: "Live · just now" }, ...SITE.releases.slice(1)],
};

/* The workspace's sites, as the list shows them. `SITE` is the first of them
   opened in the editor, which is why the names line up. */
const SITES: SiteSummary[] = [
  { id: 1, name: "Acme Docs", domain: "docs.acme.com", status: "live", docs: 148 },
  { id: 2, name: "Acme API reference", domain: "api.acme.com", status: "live", docs: 62 },
  { id: 3, name: "Partner handbook", domain: "partners.acme.com", status: "draft", docs: 0 },
];

const TAG_OPTIONS = ["customer-facing", "canonical", "internal-only", "needs-review", "deprecated"];

const SERVERS: McpServer[] = [
  { id: 1, name: "support-kb", url: "https://mcp.acme.com/s/support-kb", scope: "product", status: "connected", capabilities: ["search", "facts", "answers"] },
  { id: 2, name: "eng-lineage", url: "https://mcp.acme.com/s/eng-lineage", scope: "org", status: "idle", capabilities: ["search", "lineage"] },
  { id: 3, name: "legacy-bot", url: "https://mcp.acme.com/s/legacy-bot", scope: "workspace", status: "idle", capabilities: [] },
];

const DRAFT: McpDraft = {
  name: "support-kb",
  scope: "product",
  toolCount: 7,
  capabilities: [
    { key: "search", tools: 3, desc: "hybrid search over documents", on: true },
    { key: "facts", tools: 4, desc: "verified facts + verify", on: true },
    { key: "glossary", tools: 2, desc: "term definitions", on: false },
    { key: "answers", tools: 2, desc: "approved answers, served verbatim", on: false },
  ],
};

const CREATED: McpCreated = {
  name: "support-kb",
  scopeLabel: "Product",
  toolCount: 7,
  token: "mcp_9f3a2b7c4d1e8f6a0b5c2d9e77aa11bb",
  snippet: `claude mcp add support-kb --transport http https://mcp.acme.com/s/support-kb \\\n  --header "Authorization: Bearer mcp_9f3a2b7c4d1e8f6a0b5c2d9e"`,
};

const BASE: PublishData = {
  view: "site-list",
  editorTab: "content",
  phase: "draft",
  sites: SITES,
  tagOptions: TAG_OPTIONS,
  site: SITE,
  servers: SERVERS,
  serverCount: 3,
  draft: DRAFT,
  created: CREATED,
  slack: { configured: true, teamName: "Acme HQ", lastEventAt: "2026-07-21T13:58:00" },
  github: { webhookConfigured: true, repos: ["acme/handbook", "acme/api"] },
};

/** A workspace that publishes nothing: no site, no server. The site list is
    still on screen — it is where the first site gets made. */
const EMPTY: PublishData = { ...BASE, sites: [], site: null, servers: [], serverCount: 0 };

/** Long natural text on the site editor; pathological tokens on the MCP list,
    so both halves of the page get strained. */
function strained(extreme: boolean): PublishData {
  if (extreme) {
    return {
      ...BASE,
      view: "mcp-list",
      servers: [
        { id: 1, name: UNBREAKABLE, url: LONG_URL, scope: "workspace", status: "connected", capabilities: MANY_TAGS },
        { id: 2, name: LONG_WORD, url: LONG_URL, scope: "org", status: "idle", capabilities: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT] },
      ],
      serverCount: 2,
    };
  }
  const site: DocSite = {
    ...SITE,
    name: LONG_TITLE,
    domain: LONG_SOURCE,
    version: LONG_DOC_TITLE,
    sourceTags: MANY_TAGS.slice(0, 8),
    docsMatched: 12847392,
    warnings: LONG_PARAGRAPH,
    nav: repeat((i) => ({ label: `${i + 1}. ${LONG_TITLE}`, docs: 12847392 + i }), 4),
    previewNav: repeat((i) => `${i + 1}. ${LONG_TITLE}`, 3),
    bucket: LONG_SOURCE,
    region: LONG_DOC_TITLE,
    gates: repeat((i) => ({ name: `${i + 1}. ${LONG_TITLE}`, ok: i % 2 === 0, note: LONG_PARAGRAPH }), 3),
    releases: repeat((i) => ({ version: `v${i}-${LONG_DOC_TITLE}`, note: LONG_PARAGRAPH }), 3),
    releasedNote: LONG_PARAGRAPH,
  };
  return {
    ...BASE,
    view: "site-editor",
    sites: repeat((i) => ({ id: i + 1, name: `${i + 1}. ${LONG_TITLE}`, domain: LONG_SOURCE, status: i % 2 ? "live" : "draft", docs: 12847392 + i }), 4),
    site,
    servers: [
      { id: 1, name: "support-kb-consolidated-across-every-service-and-region", url: `https://mcp.mari.guru/s/${LONG_DOC_TITLE}`, scope: "workspace", status: "connected", capabilities: ["search", "facts", "answers", "glossary", "chat", "lineage"] },
      { id: 2, name: LONG_DOC_TITLE, url: `https://mcp.mari.guru/servers/${LONG_DOC_TITLE}`, scope: "org", status: "idle", capabilities: ["search", "lineage"] },
    ],
  };
}

const EDITOR: PublishData = { ...BASE, view: "site-editor" };

export const FIXTURES: PageFixtures<PublishData> = {
  default: { data: BASE },
  "site-new": { data: { ...BASE, view: "site-new" } },
  "site-none": { data: { ...BASE, view: "site-new", sites: [] } },
  "site-content": { data: EDITOR },
  "site-theme": { data: { ...EDITOR, editorTab: "theme" } },
  "site-preview": { data: { ...EDITOR, editorTab: "preview" } },
  "site-domains": { data: { ...EDITOR, editorTab: "domains" } },
  "publish-draft": { data: { ...EDITOR, view: "publish-flow", phase: "draft" } },
  "publish-publishing": { data: { ...EDITOR, view: "publish-flow", phase: "publishing" } },
  "publish-published": { data: { ...EDITOR, view: "publish-flow", phase: "published", site: SITE_PUBLISHED } },
  mcp: { data: { ...BASE, view: "mcp-list" } },
  "mcp-add": { data: { ...BASE, view: "mcp-add" } },
  "mcp-token": { data: { ...BASE, view: "mcp-token", serverCount: 4 } },
  "mcp-empty": { data: { ...BASE, view: "mcp-list", servers: [], serverCount: 0 } },
  bots: { data: { ...BASE, view: "bots" } },
  loading: { data: BASE, loading: true },
  error: { data: BASE, error: "Mari is temporarily unreachable. We are retrying automatically." },
  empty: { data: EMPTY },
  overflow: { data: strained(false) },
  stress: { data: strained(true) },
};
