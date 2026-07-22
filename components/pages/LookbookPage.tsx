import { useState, type ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Chip, StatusChip, SeverityChip, CountChip } from "../data-display/Chip";
import { Stat } from "../data-display/Stat";
import { Badge } from "../data-display/Badge";
import { Swatch } from "../data-display/Swatch";
import { Avatar } from "../data-display/Avatar";
import { Progress } from "../data-display/Progress";
import { Sparkline } from "../data-display/Sparkline";
import { Skeleton } from "../data-display/Skeleton";
import { SkeletonPage } from "../data-display/Skeletons";
import { Spinner } from "../data-display/Spinner";
import { EmptyState } from "../data-display/EmptyState";
import { Alert } from "../feedback/Alert";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Textarea } from "../forms/Textarea";
import { Switch } from "../forms/Switch";
import { Checkbox } from "../forms/Checkbox";
import { RadioGroup } from "../forms/RadioGroup";
import { Tabs } from "../navigation/Tabs";
import { GlobalIconsArt } from "../features/GlobalIconsArt";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { Sparkles, BookOpen, ShieldCheck, Inbox } from "lucide-react";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_DOC_TITLE, LONG_SOURCE, LONG_URL,
  UNBREAKABLE, LONG_WORD, HUGE_NUMBER_STR, HUGE_PERCENT, MIXED_SCRIPT,
  MANY_TAGS, MANY_INITIALS,
} from "./stress";

/* Lookbook (pages/lookbook.md). A live design-system showcase — the one
   auth/onboarding-adjacent page that renders INSIDE the console frame. Each
   state is a section of the gallery (foundations, buttons, inputs & forms,
   data display, feedback, icons & art) plus an "all" overview. Every exhibit
   pairs a usage rule + import path with a live demo, built only from the
   catalog primitives it documents. */

const STATES = [
  { id: "all", label: "All components" },
  { id: "foundations", label: "Foundations" },
  { id: "buttons", label: "Buttons" },
  { id: "inputs", label: "Inputs & forms" },
  { id: "data-display", label: "Data display" },
  { id: "feedback", label: "Feedback" },
  { id: "icons", label: "Icons & art" },
  { id: "loading", label: "Loading" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

function Exhibit({ title, rule, imp, children }: {
  title: string; rule: string; imp: string; children: ReactNode;
}) {
  return (
    <Card title={title}>
      <p className="text-[13px] leading-relaxed text-ink/65">{rule}</p>
      <code className="mt-2 mb-4 block font-term text-[11.5px] text-biscay-2">{imp}</code>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Card>
  );
}

/* ── Foundations ──────────────────────────────────────────────────────── */

const TOKENS: { name: string; color: string }[] = [
  { name: "paper", color: "#FFFFFF" },
  { name: "flysch", color: "#F0F2F5" },
  { name: "ink", color: "#10263B" },
  { name: "biscay", color: "#1C3F60" },
  { name: "biscay-2", color: "#1E6FA8" },
  { name: "moss", color: "#2C6E49" },
  { name: "clay", color: "#A05E1C" },
  { name: "espelette", color: "#B23A1E" },
];

function Foundations() {
  return (
    <div className="space-y-4">
      <Exhibit
        title="Color tokens"
        rule="Eight semantic tokens carry the whole console: paper/flysch surfaces, ink text, biscay brand, and moss/clay/espelette for ok/attention/blocked. Swapping these is the brand."
        imp='import { Swatch } from "../data-display/Swatch"'
      >
        {TOKENS.map((t) => <Swatch key={t.name} color={t.color} label={t.name} />)}
      </Exhibit>

      <Card title="Type scale">
        <p className="mb-4 text-[13px] leading-relaxed text-ink/65">
          Display for headings, a system sans for body, and JetBrains Mono (font-term) for chrome — labels, counts, code.
        </p>
        <div className="space-y-2">
          <p className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Display · 26 / bold</p>
          <p className="font-display text-[19px] font-semibold text-ink">Heading · 19 / semibold</p>
          <p className="text-[14px] text-ink/80">Body · 14 — the readable default for paragraphs and descriptions.</p>
          <p className="text-[12.5px] text-ink/60">Small · 12.5 — hints, captions, secondary copy.</p>
          <p className="font-term text-[11px] uppercase tracking-[0.1em] text-ink/45">Term · 11 uppercase — labels &amp; chrome</p>
        </div>
      </Card>
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */

function Buttons() {
  return (
    <Exhibit
      title="Buttons"
      rule="One primary action per view; default for secondary; link for inline navigation. Danger is reserved for destructive intent."
      imp='import { Button } from "../actions/Button"'
    >
      <Button variant="primary">Primary</Button>
      <Button variant="default">Default</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="link">Link</Button>
      <Button variant="primary" compact>Compact</Button>
      <Button variant="default" disabled>Disabled</Button>
    </Exhibit>
  );
}

/* ── Inputs & forms ───────────────────────────────────────────────────── */

function FormsExhibit() {
  const [text, setText] = useState("Acme Product");
  const [sel, setSel] = useState("weekly");
  const [notes, setNotes] = useState("");
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(false);
  const [radio, setRadio] = useState("markdown");
  return (
    <Card title="Inputs & controls">
      <p className="mb-4 text-[13px] leading-relaxed text-ink/65">
        Field wraps a labelled control; Input/Select/Textarea are the text primitives; Switch/Checkbox/RadioGroup carry boolean and single-choice state.
      </p>
      <code className="mb-4 block font-term text-[11.5px] text-biscay-2">import {"{ Field, Input, Select, Textarea, Switch, Checkbox, RadioGroup }"} from "../forms/*"</code>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Workspace name">
          <Input className="w-full" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Digest frequency">
          <Select className="w-full" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea className="w-full" rows={3} placeholder="Shown on published pages…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-ink/10 pt-4">
        <Switch checked={sw} onCheckedChange={setSw} label="Auto-sync sources" />
        <Checkbox checked={cb} onCheckedChange={setCb} label="Email me a summary" />
        <div>
          <RadioGroup ariaLabel="Export format" value={radio} onValueChange={setRadio} options={[
            { value: "markdown", label: "Markdown", hint: "Portable .md files" },
            { value: "pdf", label: "PDF" },
          ]} />
        </div>
      </div>
    </Card>
  );
}

/* ── Data display ─────────────────────────────────────────────────────── */

function DataDisplay() {
  const [tab, setTab] = useState<"docs" | "facts">("docs");
  return (
    <div className="space-y-4">
      <Exhibit
        title="Chips & pills"
        rule="StatusChip carries lifecycle state; SeverityChip carries risk; tone Chips label neutral facets; CountChip shows a tally."
        imp='import { Chip, StatusChip, SeverityChip, CountChip } from "../data-display/Chip"'
      >
        <StatusChip status="verified" />
        <StatusChip status="canonical" />
        <StatusChip status="stale" />
        <StatusChip status="draft" />
        <SeverityChip severity="high" />
        <SeverityChip severity="med" />
        <SeverityChip severity="low" />
        <Chip label="info" tone="info" dot />
        <Chip label="ok" tone="ok" dot />
        <CountChip count={42} />
        <Badge label="badge" tone="info" />
      </Exhibit>

      <Exhibit
        title="Stats"
        rule="A KPI tile: big value, quiet label, optional tone, icon ring, and delta. Use tone to signal health, not decoration."
        imp='import { Stat } from "../data-display/Stat"'
      >
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value="1,204" label="Documents" sub="+38 this week" tone="ok" icon={<BookOpen size={18} />} />
          <Stat value="97%" label="Facts passing" sub="3 need review" tone="attention" icon={<ShieldCheck size={18} />} />
          <Stat value="12" label="Insights" sub="live" tone="info" icon={<Sparkles size={18} />} />
        </div>
      </Exhibit>

      <Exhibit
        title="Progress, sparklines & avatars"
        rule="Progress shows determinate work; Sparkline trends a series in-line; Avatar renders flat monogram identity."
        imp='import { Progress, Sparkline, Avatar } from "../data-display/*"'
      >
        <div className="w-full space-y-3">
          <Progress value={68} label="Embedding · 68%" tone="info" />
          <div className="flex items-center gap-4">
            <Sparkline values={[3, 6, 4, 8, 7, 11, 9, 14]} tone="ok" />
            <span className="flex items-center gap-1.5">
              <Avatar initials="MC" /><Avatar initials="DH" /><Avatar initials="AK" />
            </span>
          </div>
        </div>
      </Exhibit>

      <Card title="Tabs">
        <p className="mb-3 text-[13px] leading-relaxed text-ink/65">Segmented navigation for switching a single region’s content.</p>
        <Tabs ariaLabel="Sample" value={tab} onChange={setTab} options={[
          { id: "docs", label: "Documents" },
          { id: "facts", label: "Facts" },
        ]} />
        <p className="mt-3 text-[13px] text-ink/70">Showing the <b>{tab}</b> view.</p>
      </Card>
    </div>
  );
}

/* ── Feedback ─────────────────────────────────────────────────────────── */

function Feedback() {
  return (
    <div className="space-y-4">
      <Exhibit
        title="Alerts"
        rule="Inline, dismissible feedback. Tone maps to intent: info, ok, attention, blocked, neutral — never stack more than one per region."
        imp='import { Alert } from "../feedback/Alert"'
      >
        <div className="w-full space-y-3">
          <Alert tone="info" title="Sync scheduled">Confluence · Ops will sync in 5 minutes.</Alert>
          <Alert tone="ok" title="Fact-check passed">All 12 claims in pricing.md verified.</Alert>
          <Alert tone="attention" title="Token expiring">Rotate the GitHub token within 7 days.</Alert>
          <Alert tone="blocked" title="Sync failed">GET /rest/api/content returned 401 — token expired.</Alert>
        </div>
      </Exhibit>

      <Exhibit
        title="Spinners & skeletons"
        rule="Spinner for indeterminate waits with a label; Skeleton to reserve layout while content streams in."
        imp='import { Spinner, Skeleton } from "../data-display/*"'
      >
        <Spinner size="sm" />
        <Spinner size="md" label="Loading" />
        <div className="w-full max-w-xs space-y-2">
          <Skeleton height={12} width="70%" />
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="55%" />
        </div>
      </Exhibit>

      <Card title="Empty state">
        <p className="mb-4 text-[13px] leading-relaxed text-ink/65">The blank-slate prompt: an icon, a title, guidance, and a single next action.</p>
        <EmptyState icon={<Inbox size={26} />} title="Nothing here yet" action={<Button compact>Connect a source</Button>}>
          Connect a source to start building your knowledge base.
        </EmptyState>
      </Card>
    </div>
  );
}

/* ── Icons & art ──────────────────────────────────────────────────────── */

function IconsArt() {
  return (
    <Card title="Icons, marks & notebook art">
      <p className="mb-4 text-[13px] leading-relaxed text-ink/65">
        The console ships its iconography and decoration as inline SVG — a bespoke line-art UI set plus source/provider brand marks.
      </p>
      <GlobalIconsArt />
    </Card>
  );
}

/* ── Overflow / stress stress-test sections ───────────────────────────── */

/* `overflow` — the gallery stuffed with very long NATURAL text: long titles,
   paragraphs, names, and huge stat values. Catches wrapping, truncation,
   line-clamp, and vertical-overflow failures. */
function OverflowSection() {
  return (
    <div className="space-y-4">
      <Exhibit
        title={LONG_TITLE}
        rule={LONG_PARAGRAPH}
        imp={`import { Everything } from "${LONG_SOURCE}"`}
      >
        <Button variant="primary">{LONG_TITLE}</Button>
        <Chip label={LONG_DOC_TITLE} tone="neutral" />
        <Badge label={LONG_NAME} tone="info" />
        <StatusChip status="canonical" />
      </Exhibit>

      <Card title={LONG_TITLE}>
        <p className="text-[13px] leading-relaxed text-ink/65">{LONG_PARAGRAPH}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={HUGE_NUMBER_STR} label={LONG_TITLE} sub={LONG_PARAGRAPH} tone="ok" icon={<BookOpen size={18} />} />
          <Stat value={HUGE_PERCENT} label="Facts passing across every service, region, and team" sub="3 need review" tone="attention" icon={<ShieldCheck size={18} />} />
          <Stat value={HUGE_NUMBER_STR} label={LONG_NAME} sub="live" tone="info" icon={<Sparkles size={18} />} />
        </div>
        <div className="mt-4 space-y-3">
          <Progress value={68} label={`Embedding · ${LONG_TITLE}`} tone="info" />
          <Alert tone="attention" title={LONG_TITLE}>{LONG_PARAGRAPH}</Alert>
        </div>
      </Card>
    </div>
  );
}

/* `stress` — PATHOLOGICAL content: unbreakable tokens/URLs, a single long word,
   huge numbers, a 20+ chip row that will not wrap, a long avatar stack, and
   mixed scripts + emoji. Catches horizontal overflow, missing
   min-w-0 / break-words / truncate, and flex blowouts. */
function StressSection() {
  return (
    <div className="space-y-4">
      <Exhibit
        title="Chip-row overflow — 20+ tags, no wrap"
        rule="A single non-wrapping row of every tag: it must scroll inside its own container, never push the page body sideways."
        imp={LONG_URL}
      >
        <div className="flex w-full gap-1.5 overflow-x-auto pb-1">
          {MANY_TAGS.map((t) => <Chip key={t} label={t} tone="neutral" className="shrink-0" />)}
        </div>
        <CountChip count={MANY_TAGS.length} />
      </Exhibit>

      <Card title="Unbreakable tokens, mixed scripts & huge numbers">
        <code className="mt-1 block break-all font-term text-[11.5px] text-biscay-2">{UNBREAKABLE}</code>
        <p className="mt-3 break-words text-[13px] text-ink/70">{MIXED_SCRIPT}</p>
        <p className="mt-2 break-words text-[13px] text-ink/70">{LONG_WORD}</p>
        <div className="mt-4">
          <AvatarGroup people={MANY_INITIALS.map((i) => ({ initials: i }))} max={MANY_INITIALS.length} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat value={HUGE_NUMBER_STR} label={LONG_WORD} tone="ok" icon={<BookOpen size={18} />} />
          <Stat value={HUGE_PERCENT} label={UNBREAKABLE} tone="info" icon={<Sparkles size={18} />} />
          <Stat value={HUGE_NUMBER_STR} label={MIXED_SCRIPT} tone="attention" icon={<ShieldCheck size={18} />} />
        </div>
        <div className="mt-4"><Progress value={99} label={UNBREAKABLE} tone="info" /></div>
        <div className="mt-4"><Alert tone="blocked" title={UNBREAKABLE}>{LONG_URL}</Alert></div>
      </Card>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

function Sections({ state }: { state: string }) {
  switch (state) {
    case "foundations": return <Foundations />;
    case "buttons": return <div className="space-y-4"><Buttons /></div>;
    case "inputs": return <div className="space-y-4"><FormsExhibit /></div>;
    case "data-display": return <DataDisplay />;
    case "feedback": return <Feedback />;
    case "icons": return <div className="space-y-4"><IconsArt /></div>;
    case "overflow": return <OverflowSection />;
    case "stress": return <StressSection />;
    default:
      return (
        <div className="space-y-4">
          <Foundations />
          <Buttons />
          <FormsExhibit />
          <DataDisplay />
          <Feedback />
          <IconsArt />
        </div>
      );
  }
}

function LookbookPage({ state = "all", mobile = false }: PageProps) {
  if (state === "loading") {
    return (
      <PageFrame active={navFor("lookbook")} title="Lookbook" mobile={mobile}>
        <SkeletonPage variant="gallery" />
      </PageFrame>
    );
  }
  return (
    <PageFrame active={navFor("lookbook")} title="Lookbook" mobile={mobile}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Design system"
          title="Design lookbook"
          description="Every canonical primitive, exhibited live with its usage rule and import path. This page is built only from the components it documents."
          actions={<Button variant="primary" icon={false}>Open catalog ↗</Button>}
        />
        <div className="mt-6">
          <Sections state={state} />
        </div>
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "lookbook",
  title: "Lookbook",
  route: "/lookbook",
  component: LookbookPage,
  states: STATES.map((s) => ({ ...s })),
};
