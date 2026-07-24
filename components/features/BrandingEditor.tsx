import { useState } from "react";
import type { CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Field } from "../forms/Field";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip } from "../data-display/Chip";
import { Swatch } from "../data-display/Swatch";
import { Spinner } from "../data-display/Spinner";
import { Skeleton, SkeletonLine, SkeletonCard } from "../data-display/Skeleton";
import { focusRing } from "../tokens/focusRing";

/* Branding editor (bring-your-own-branding) ───────────────────────────────
   The proof that tokens ARE the brand: set accent/green/blue/gold colors,
   display + body fonts, and a logo — with an "Import your brand" flow that
   reads a homepage and proposes a palette, plus a live preview rendered under
   the draft tokens. Source: web/src/pages/settings/BrandingEditor.tsx.
   Standalone — Import returns a baked harvest result; nothing hits :root, the
   preview is scoped inline (no network). */

type Branding = {
  accent?: string; accentDeep?: string; accentInk?: string;
  green?: string; blue?: string; gold?: string;
  displayFont?: string; bodyFont?: string; fontUrl?: string;
  logo?: string; logoAlt?: string;
};

const DEFAULTS: Required<Pick<Branding, "accent" | "green" | "blue" | "gold">> = {
  accent: "#B23A1E", green: "#2C6E49", blue: "#1E6FA8", gold: "#A05E1C",
};

function isHexColor(s?: string): s is string { return !!s && /^#[0-9a-fA-F]{6}$/.test(s); }
function darken(hex: string, amt: number): string {
  if (!isHexColor(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amt)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amt)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amt)));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function inkFor(hex: string): string {
  if (!isHexColor(hex)) return "#10263B";
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.42 ? "#10263B" : "#F7F4EC";
}

const PALETTE_KEYS: { key: keyof Branding; label: string }[] = [
  { key: "accent", label: "Accent" }, { key: "accentDeep", label: "Accent deep" }, { key: "accentInk", label: "Accent ink" },
  { key: "green", label: "Green" }, { key: "blue", label: "Blue" }, { key: "gold", label: "Gold" },
];

function effectiveColor(d: Branding, key: keyof Branding): string {
  const v = d[key];
  if (isHexColor(v)) return v;
  const acc = isHexColor(d.accent) ? d.accent : DEFAULTS.accent;
  if (key === "accentDeep") return darken(acc, 0.12);
  if (key === "accentInk") return inkFor(acc);
  if (key === "accent") return acc;
  if (key === "green") return DEFAULTS.green;
  if (key === "blue") return DEFAULTS.blue;
  if (key === "gold") return DEFAULTS.gold;
  return "#000000";
}

const DEMO_HARVEST = {
  title: "Northwind Analytics",
  themeColor: "#0B5CAD",
  cssColors: [["#0B5CAD", 42], ["#F4A11C", 18], ["#12333E", 12], ["#E8EEF3", 9], ["#7A2E1F", 5]] as [string, number][],
  fonts: ["Sora", "Inter", "Source Serif Pro"],
  logo: null as string | null,
  warnings: ["No favicon found, used the theme-color meta tag instead."],
};

function ColorField({ label, value, onChange, onAuto, explicit }: { label: string; value: string; onChange: (v: string) => void; onAuto: () => void; explicit: boolean }) {
  return (
    <div className="py-2.5 border-b border-ink/10 last:border-0">
      <div className="flex items-center justify-between">
        <SectionLabel>{label}</SectionLabel>
        {explicit && <button type="button" onClick={onAuto} className={`font-term text-[10.5px] text-biscay-2 hover:text-ink rounded-[3px] ${focusRing}`}>Auto</button>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-[4px] border border-ink/15 bg-transparent p-0.5 cursor-pointer" aria-label={label} />
        <code className="font-term text-[12px] text-ink/70">{value}</code>
      </div>
    </div>
  );
}

export type BrandingEditorProps = { branding?: Branding; loading?: boolean; className?: string };

export function BrandingEditor({ branding = {}, loading = false, className = "" }: BrandingEditorProps) {
  const [draft, setDraft] = useState<Branding>(branding);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [evidence, setEvidence] = useState<typeof DEMO_HARVEST | null>(null);

  const patch = (p: Branding) => { setDraft((d) => ({ ...d, ...p })); setDirty(true); };
  const clearKey = (key: keyof Branding) => { setDraft((d) => { const next = { ...d }; delete next[key]; return next; }); setDirty(true); };

  const runImport = () => {
    if (!url.trim()) return;
    setImporting(true);
    setTimeout(() => {
      setEvidence(DEMO_HARVEST);
      patch({ accent: DEMO_HARVEST.themeColor, displayFont: DEMO_HARVEST.fonts[0], bodyFont: DEMO_HARVEST.fonts[2] });
      setImporting(false);
    }, 700);
  };

  const doSave = () => { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const doReset = () => { setDraft({}); setDirty(false); setEvidence(null); };

  const host = (() => { try { return new URL(url.startsWith("http") ? url : `https://${url}`).host; } catch { return url; } })();

  const preview = {
    ["--b-accent"]: effectiveColor(draft, "accent"),
    ["--b-accent-ink"]: effectiveColor(draft, "accentInk"),
    ["--b-green"]: effectiveColor(draft, "green"),
    ["--b-blue"]: effectiveColor(draft, "blue"),
    ["--b-gold"]: effectiveColor(draft, "gold"),
    ...(draft.bodyFont ? { fontFamily: `"${draft.bodyFont}", serif` } : {}),
  } as CSSProperties;

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="space-y-2.5"><Skeleton width={140} height={20} /><SkeletonLine w={360} h={11} /></div>
        <SkeletonCard lines={1} />
        <div className="rounded-md border border-ink/12 bg-paper p-4">
          <SkeletonLine w="30%" h={12} className="mb-4" />
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-ink/10 py-2.5">
                <Skeleton width={32} height={32} rounded="rounded-[4px]" />
                <SkeletonLine w={70} h={10} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3"><Skeleton width={130} height={34} rounded="rounded-[4px]" /><Skeleton width={150} height={34} rounded="rounded-[4px]" /></div>
        </div>
        <SkeletonCard lines={3} media />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader title="Branding" description="Tokens are the brand. Re-skin every primitive from one place." />

      {/* 1 — Import */}
      <Card icon={<Sparkles size={16} className="text-clay" />} title="Import your brand">
        <div className="flex items-center gap-2">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runImport()} placeholder="https://yourcompany.com" className="w-full" />
          <Button variant="primary" disabled={importing || !url.trim()} onClick={runImport}>{importing ? <><Spinner size="sm" /> Reading {host}…</> : "Import"}</Button>
        </div>
        {evidence && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[12.5px] text-ink/70">Harvested from “{evidence.title}”</p>
            <Field label="Harvested colors">
              <div className="flex flex-wrap gap-1.5">
                <Swatch color={evidence.themeColor} selected={draft.accent === evidence.themeColor} onClick={() => patch({ accent: evidence.themeColor })} />
                {evidence.cssColors.map(([hex, count]) => <Swatch key={hex} color={hex} label={String(count)} selected={draft.accent === hex} onClick={() => patch({ accent: hex })} />)}
              </div>
            </Field>
            <Field label="Harvested fonts">
              <div className="flex flex-wrap gap-1.5">{evidence.fonts.map((f) => <Chip key={f} label={f} tone={draft.displayFont === f ? "info" : "neutral"} selected={draft.displayFont === f} onClick={() => patch({ displayFont: f })} />)}</div>
            </Field>
            {evidence.warnings.map((w) => <Chip key={w} label={w} tone="attention" />)}
          </div>
        )}
      </Card>

      {/* 2 — Brand palette */}
      <Card title="Brand palette">
        <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-3">
          {PALETTE_KEYS.map((p) => (
            <ColorField key={p.key} label={p.label} value={effectiveColor(draft, p.key)} explicit={isHexColor(draft[p.key])}
              onChange={(v) => patch({ [p.key]: v })} onAuto={() => clearKey(p.key)} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Display font"><Input value={draft.displayFont ?? ""} onChange={(e) => patch({ displayFont: e.target.value })} placeholder="Playfair Display" className="w-full" /></Field>
          <Field label="Body font"><Input value={draft.bodyFont ?? ""} onChange={(e) => patch({ bodyFont: e.target.value })} placeholder="Lora" className="w-full" /></Field>
          <Field label="Font stylesheet URL"><Input type="url" value={draft.fontUrl ?? ""} onChange={(e) => patch({ fontUrl: e.target.value })} placeholder="https://fonts.googleapis.com/…" className="w-full font-term" /></Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Logo alt text"><Input value={draft.logoAlt ?? ""} onChange={(e) => patch({ logoAlt: e.target.value })} placeholder="Northwind Analytics" className="w-full" /></Field>
          {/* `w-full min-w-0`: a native file input carries a large intrinsic
              width (the browser sizes it for the button plus a filename), so
              without a floor override it pushed ~48px out through the card at
              a narrow width. The filename ellipsises instead (§12). */}
          <Field label="Logo"><input type="file" accept="image/*" className="w-full min-w-0 text-[12.5px] text-ink/60 file:mr-2 file:rounded-[4px] file:border file:border-ink/20 file:bg-paper file:px-2.5 file:py-1 file:text-[12px] file:text-ink/80" onChange={() => patch({ logo: "demo" })} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={!dirty} onClick={doSave}>Save branding</Button>
          <ConfirmButton confirmLabel="Reset all?" onConfirm={doReset}>Reset to defaults</ConfirmButton>
          {saved && <span className="font-term text-[11.5px] text-moss">✓ Saved</span>}
        </div>
      </Card>

      {/* 3 — Live preview (scoped, inline-styled by the draft) */}
      <Card title="Live preview" hint="Rendered under your draft tokens">
        <div style={preview} className="rounded-md border border-ink/15 p-4">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <span className="min-w-0 truncate text-[18px] font-bold" style={{ fontFamily: draft.displayFont ? `"${draft.displayFont}", serif` : undefined, color: "var(--b-accent)" }}>{draft.logoAlt || "Your Brand"}</span>
            <span className="inline-flex gap-2">
              <span className="inline-flex items-center h-8 px-3 rounded-[4px] text-[12.5px] font-semibold" style={{ background: "var(--b-accent)", color: "var(--b-accent-ink)" }}>Primary</span>
              <span className="inline-flex items-center h-8 px-3 rounded-[4px] border text-[12.5px] font-medium" style={{ borderColor: "var(--b-accent)", color: "var(--b-accent)" }}>Ghost</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["green", "blue", "gold"] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] font-term text-[11px] font-medium" style={{ color: `var(--b-${k})`, borderColor: `var(--b-${k})`, background: "transparent" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: `var(--b-${k})` }} />{k}
              </span>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["1,284", "documents"], ["98%", "verified"], ["3", "sites live"]].map(([v, l], i) => (
              <div key={l} className="grid place-items-center rounded-md border border-ink/15 p-3 text-center">
                <div className="text-[22px] font-bold" style={{ color: i === 0 ? "var(--b-accent)" : i === 1 ? "var(--b-green)" : "var(--b-blue)" }}>{v}</div>
                <div className="text-[12px] text-ink/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
