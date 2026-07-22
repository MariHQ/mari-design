import { useState } from "react";
import { ExternalLink, FileText, Check, Sparkles } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip } from "../data-display/Chip";
import { Swatch } from "../data-display/Swatch";
import { Stepper } from "../data-display/Stepper";
import { TagChip } from "../data-display/TagChip";
import { focusRing } from "../tokens/focusRing";

/* Publish · Site editor ───────────────────────────────────────────────────
   The per-site editor: a left config Card with four underline tabs
   (Content / Nav / Theme / Deploy) beside a right Card showing a live preview
   of the built static site. Theme edits preview instantly; builds/deploys mint
   releases with rollback. Source: web/src/pages/publish/SiteEditor.tsx.
   Standalone — the preview is a MOCK framed panel (no real iframe), all
   mutations are local state (no network). */

type EditorTab = "content" | "nav" | "theme" | "deploy";

const THEMES = [
  { key: "mari", name: "Mari Editorial", accent: "#b04e2c", bg: "#fcf9f1" },
  { key: "minimal", name: "Minimal", accent: "#2d2a22", bg: "#ffffff" },
  { key: "material", name: "Material", accent: "#35549d", bg: "#f8f9fc" },
  { key: "starlight", name: "Starlight", accent: "#43663c", bg: "#fbfaf6" },
];
const ACCENTS = ["#b04e2c", "#35549d", "#43663c", "#6a5a9c", "#8a8171"];
const GENERATORS = [{ key: "mari", label: "Mari handcrafted" }, { key: "docusaurus", label: "Docusaurus" }];

type Gate = { name: string; ok: boolean; note: string };
type NavItem = { label: string; active?: boolean; children?: string[] };
type Release = { id: number; version: string; status: string; deployed: string; notes?: string };

export type Site = {
  id: number;
  name: string;
  domain: string;
  status: "live" | "draft";
  docs: number;
  warnings: number;
  sources: string[];
  gates: Gate[];
  nav: NavItem[];
  releases: Release[];
};

const DEMO_SITE: Site = {
  id: 7,
  name: "Acme Docs",
  domain: "docs.acme.com",
  status: "live",
  docs: 148,
  warnings: 2,
  sources: ["customer-facing", "canonical"],
  gates: [
    { name: "All facts verified", ok: true, note: "148/148 verified" },
    { name: "No broken links", ok: true, note: "checked at build" },
    { name: "Glossary coverage", ok: false, note: "3 terms undefined" },
  ],
  nav: [
    { label: "Getting started", active: true, children: ["Install", "Quickstart"] },
    { label: "Guides", children: ["Ingestion", "Search", "Publishing"] },
    { label: "Reference", children: ["API", "CLI"] },
  ],
  releases: [
    { id: 14, version: "v14", status: "live", deployed: "2025-07-19T09:55:00", notes: "Deployed to S3 · acme-docs-prod" },
    { id: 13, version: "v13", status: "superseded", deployed: "2025-07-12T14:02:00" },
    { id: 12, version: "v12", status: "superseded", deployed: "2025-07-05T11:40:00", notes: "Docusaurus generator" },
  ],
};

const TABS: { id: EditorTab; label: string }[] = [
  { id: "content", label: "Content" }, { id: "nav", label: "Nav" }, { id: "theme", label: "Theme" }, { id: "deploy", label: "Deploy" },
];

export type PublishSiteEditorProps = { site?: Site; className?: string };

export function PublishSiteEditor({ site = DEMO_SITE, className = "" }: PublishSiteEditorProps) {
  const [tab, setTab] = useState<EditorTab>("theme");
  const [theme, setTheme] = useState(THEMES[0]);
  const [accent, setAccent] = useState(THEMES[0].accent);
  const [radius, setRadius] = useState<"S" | "M" | "L">("M");
  const [density, setDensity] = useState<"Comfortable" | "Compact" | "Dense">("Comfortable");
  const [mode, setMode] = useState<"Light" | "Dark">("Light");
  const [dirty, setDirty] = useState(false);
  const [instr, setInstr] = useState("");
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [generator, setGenerator] = useState(GENERATORS[0].key);
  const [buildNonce, setBuildNonce] = useState(0);

  const [bucket, setBucket] = useState("acme-docs-prod");
  const [region, setRegion] = useState("us-east-1");
  const [cname, setCname] = useState("docs.acme.com");
  const [cfgSaved, setCfgSaved] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [rollingBack, setRollingBack] = useState<number | null>(null);

  const live = site.releases.find((r) => r.status === "live") ?? site.releases[0];
  const history = site.releases.filter((r) => r !== live);

  const pickTheme = (t: typeof THEMES[number]) => { setTheme(t); setAccent(t.accent); setDirty(true); };
  const rebuild = () => { setDirty(false); setBuildNonce((n) => n + 1); };
  const deploy = () => { setDeployStep(1); setTimeout(() => setDeployStep(3), 900); setDirty(false); };
  const askMari = () => {
    if (!instr.trim()) return;
    setAccent("#6a5a9c"); setRadius("L"); setDirty(true);
    setAiNote("Mari changed: accent → #6a5a9c, radius → L"); setInstr("");
  };

  const seg = <T extends string>(opts: T[], val: T, set: (v: T) => void) => (
    <div className="inline-flex rounded-[4px] border border-ink/15 overflow-hidden">
      {opts.map((o) => (
        <button key={o} type="button" aria-pressed={val === o} onClick={() => { set(o); setDirty(true); }}
          className={`px-2.5 h-7 text-[12px] font-medium border-r border-ink/10 last:border-0 transition-colors ${focusRing} ${val === o ? "bg-biscay text-white" : "bg-paper text-ink/65 hover:text-ink"}`}>{o}</button>
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader
        title={site.name}
        backLink={{ href: "#", label: "All sites" }}
        actions={
          <>
            <Chip label={site.status === "live" ? "Live" : "Draft"} tone={site.status === "live" ? "ok" : "neutral"} dot pulse={site.status === "live"} caps />
            <span className="font-term text-[12px] text-ink/60 hidden sm:inline">{site.domain}</span>
            <a href="#" className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80 hover:border-ink/45 hover:text-ink ${focusRing}`}><ExternalLink size={14} /> Open site</a>
            <Button variant="primary" onClick={deploy}>Deploy</Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: config */}
        <Card>
          <div className="flex items-center gap-5 border-b border-ink/15 mb-4">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
                className={`pb-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${focusRing} ${tab === t.id ? "text-ink border-biscay-2" : "text-ink/55 border-transparent hover:text-ink"}`}>{t.label}</button>
            ))}
          </div>

          {tab === "content" && (
            <div className="flex flex-col gap-4">
              <div>
                <SectionLabel>Sources</SectionLabel>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{site.sources.map((s) => <TagChip key={s} tag={s} />)}</div>
                <p className="mt-1.5 text-[12px] text-ink/50">Sources are set at creation and drive which docs are eligible.</p>
              </div>
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-ink/50" />
                <span className="text-[13px] text-ink/80">{site.docs} docs match</span>
                {site.warnings > 0 && <Chip label={`${site.warnings} warnings`} tone="attention" dot />}
              </div>
              <div>
                <SectionLabel>Pre-publish gates</SectionLabel>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {site.gates.map((g) => (
                    <li key={g.name} className="flex items-center gap-2 text-[13px]">
                      <Check size={14} className={g.ok ? "text-moss" : "text-clay"} />
                      <span className="text-ink/85">{g.name}</span>
                      <span className={`font-term text-[11.5px] ${g.ok ? "text-ink/45" : "text-clay"}`}>· {g.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === "nav" && (
            <div className="flex flex-col gap-2">
              {site.nav.map((n) => (
                <div key={n.label}>
                  <div className={`flex items-center gap-2 text-[13px] font-medium ${n.active ? "text-biscay-2" : "text-ink"}`}><FileText size={14} className="text-ink/40" /> {n.label}</div>
                  {n.children && <div className="ml-6 mt-1 flex flex-col gap-0.5">{n.children.map((c) => <span key={c} className="text-[12.5px] text-ink/55">{c}</span>)}</div>}
                </div>
              ))}
              <p className="mt-2 text-[12px] text-ink/50">Drag to reorder. Empty sections derive from doc headings at build time.</p>
            </div>
          )}

          {tab === "theme" && (
            <div className="flex flex-col gap-4">
              <div>
                <SectionLabel>Preset</SectionLabel>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button key={t.key} type="button" aria-pressed={theme.key === t.key} onClick={() => pickTheme(t)}
                      className={`flex items-center gap-2.5 p-2 rounded-[5px] border text-left transition-colors ${focusRing} ${theme.key === t.key ? "border-biscay-2 ring-1 ring-biscay-2/40" : "border-ink/15 hover:border-ink/30"}`}>
                      <span className="w-8 h-8 rounded-[3px] border border-ink/10 grid place-items-end p-1" style={{ background: t.bg }}><span className="w-3 h-3 rounded-full" style={{ background: t.accent }} /></span>
                      <span className="text-[12.5px] font-medium text-ink">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Accent</SectionLabel>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {ACCENTS.map((c) => <Swatch key={c} color={c} selected={accent === c} onClick={() => { setAccent(c); setDirty(true); }} />)}
                  <label className={`inline-flex items-center gap-1.5 rounded-[4px] border border-ink/15 px-2 py-1 cursor-pointer ${accent && !ACCENTS.includes(accent) ? "ring-1 ring-biscay-2/40 border-biscay-2" : ""}`}>
                    <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setDirty(true); }} className="w-5 h-5 rounded border-0 bg-transparent p-0" />
                    <span className="font-term text-[11px] text-ink/60">Custom</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div><SectionLabel>Radius</SectionLabel><div className="mt-1.5">{seg(["S", "M", "L"], radius, setRadius)}</div></div>
                <div><SectionLabel>Density</SectionLabel><div className="mt-1.5">{seg(["Comfortable", "Compact", "Dense"], density, setDensity)}</div></div>
                <div><SectionLabel>Mode</SectionLabel><div className="mt-1.5">{seg(["Light", "Dark"], mode, setMode)}</div></div>
              </div>
              <div>
                <SectionLabel>Ask Mari to customize</SectionLabel>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input value={instr} onChange={(e) => setInstr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askMari()} placeholder="Make it feel warmer and rounder" className="w-full" />
                  <Button compact onClick={askMari}><Sparkles size={14} /> Ask</Button>
                </div>
                {aiNote && <p className="mt-1.5 text-[12px] text-moss">{aiNote}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Select value={generator} onChange={(e) => setGenerator(e.target.value)} className="h-8">{GENERATORS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</Select>
                <Button compact variant="primary" onClick={rebuild}>Rebuild preview</Button>
                {dirty && <span className="font-term text-[11.5px] text-clay">Unsaved theme changes</span>}
              </div>
            </div>
          )}

          {tab === "deploy" && (
            <div className="flex flex-col gap-4">
              <div>
                <SectionLabel>S3 target</SectionLabel>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <Input value={bucket} onChange={(e) => setBucket(e.target.value)} placeholder="Bucket name" className="w-full font-term" />
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" className="w-full font-term" />
                </div>
              </div>
              <div>
                <SectionLabel>Domain mapping</SectionLabel>
                <Input value={cname} onChange={(e) => setCname(e.target.value)} placeholder="CNAME target" className="mt-1.5 w-full font-term" />
                <p className="mt-1 text-[12px] text-ink/50">Point {site.domain} → your S3 website endpoint. Without a bucket, deploys build locally.</p>
              </div>
              <div className="flex items-center gap-3"><Button compact onClick={() => { setCfgSaved(true); setTimeout(() => setCfgSaved(false), 1600); }}>Save deploy config</Button>{cfgSaved && <span className="font-term text-[11.5px] text-moss">✓ Saved</span>}</div>

              <div className="rounded-md border border-ink/15 p-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[14px] font-semibold text-ink">{live.version}</span>
                  <Chip label={live.status === "live" ? "Live" : live.status} tone={live.status === "live" ? "ok" : "neutral"} dot pulse={live.status === "live"} caps />
                </div>
                <Stepper labels={["Build", "Upload", "Release"]} current={deployStep} />
                <div className="mt-3"><Button block variant="primary" onClick={deploy}>Deploy</Button></div>
              </div>

              <div>
                <SectionLabel>Release history</SectionLabel>
                <ul className="mt-1.5 flex flex-col divide-y divide-ink/10">
                  {history.length === 0 ? <li className="py-3 text-[13px] text-ink/55">No previous releases.</li> : history.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-ink/30" />
                      <span className="text-[13px] font-medium text-ink">{r.version}</span>
                      <span className="font-term text-[11.5px] text-ink/50 flex-1">{r.notes ?? "deployed"}</span>
                      <Button compact onClick={() => { setRollingBack(r.id); setTimeout(() => setRollingBack(null), 900); }}>{rollingBack === r.id ? "Rolling back…" : "Rollback"}</Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* Right: mock live preview */}
        <Card variant="flush"
          icon={<span className="relative inline-flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-moss opacity-60 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-moss" /></span>}
          title="Live preview" hint={site.domain}
          actions={<a href="#" className={`inline-flex items-center gap-1 text-[12px] text-biscay-2 hover:text-ink ${focusRing}`}><ExternalLink size={12} /> New tab</a>}
        >
          {dirty && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-clay/[0.07] border-b border-clay/25">
              <span className="text-[12.5px] text-clay">Theme changed — rebuild to see it</span>
              <Button compact onClick={rebuild}>Rebuild</Button>
            </div>
          )}
          <MockPreview key={buildNonce} accent={accent} bg={theme.bg} name={site.name} nav={site.nav} dark={mode === "Dark"} radius={radius} />
          <p className="px-4 py-2.5 border-t border-ink/10 font-term text-[11px] text-ink/45">The built site carries a floating ✎ Customize menu.</p>
        </Card>
      </div>
    </div>
  );
}

/* Mock framed site-preview panel — a static rendering under the draft theme,
   NOT a real iframe. */
function MockPreview({ accent, bg, name, nav, dark, radius }: { accent: string; bg: string; name: string; nav: NavItem[]; dark: boolean; radius: "S" | "M" | "L" }) {
  const pageBg = dark ? "#1a1a1e" : bg;
  const fg = dark ? "#e8e6e0" : "#1a1a1a";
  const muted = dark ? "#9a978f" : "#6a675f";
  const r = radius === "S" ? 4 : radius === "M" ? 8 : 14;
  return (
    <div className="p-3">
      <div className="rounded-md border border-ink/15 overflow-hidden" style={{ background: pageBg }}>
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink/10" style={{ background: dark ? "#232327" : "rgba(0,0,0,0.02)" }}>
          <span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" /><span className="w-2.5 h-2.5 rounded-full bg-ink/15" />
        </div>
        <div className="flex min-h-[280px]">
          <aside className="w-1/3 border-r border-ink/10 p-3" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : undefined }}>
            <div className="text-[13px] font-bold mb-2.5" style={{ color: accent }}>{name}</div>
            <ul className="flex flex-col gap-1.5">
              {nav.map((n, i) => <li key={n.label} className="text-[11px] font-medium" style={{ color: i === 0 ? accent : muted }}>{n.label}</li>)}
            </ul>
          </aside>
          <main className="flex-1 p-4">
            <div className="text-[10px] font-term uppercase tracking-wide mb-1.5" style={{ color: accent }}>Guides</div>
            <div className="text-[17px] font-bold mb-2" style={{ color: fg }}>Getting started</div>
            <div className="h-2 w-4/5 mb-1.5 rounded" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }} />
            <div className="h-2 w-full mb-1.5 rounded" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }} />
            <div className="h-2 w-3/5 mb-4 rounded" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)" }} />
            <span className="inline-block px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: accent, borderRadius: r }}>Read more</span>
          </main>
        </div>
      </div>
    </div>
  );
}
