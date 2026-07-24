import type { ReactNode } from "react";
import { ErrorMessage } from "../feedback/ErrorMessage";
import {
  CheckCircle2, ArrowRight, ChevronRight, GitFork, Lock, ExternalLink,
  Send, FileText, BookOpen, GitBranch, Bot, Sparkles,
} from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Stepper } from "../data-display/Stepper";
import { Scrollable } from "../data-display/Scrollable";
import { Button } from "../actions/Button";
import { Logo, Brandmark } from "../shell/Logo";
import { Card } from "../layout/Card";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { Chip } from "../data-display/Chip";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark, GithubMark } from "../icons/marks";
import { WelcomeGuideStep, type GuidePack } from "../features/WelcomeGuideStep";
import { WelcomeGlossaryStep, type Candidate } from "../features/WelcomeGlossaryStep";
import { WelcomeSyncPanel, type SyncRow } from "../features/WelcomeSyncPanel";
import { SkeletonPage } from "../data-display/Skeletons";
import { focusRing } from "../tokens/focusRing";

/* Welcome — onboarding wizard (pages/welcome.md). Post-auth, renders OUTSIDE
   the console shell: a single-column wizard with a five-step Stepper
   (Welcome → Connect → Style guide → Glossary → Finish). Each state selects the
   active step; the Connect step expands into per-connector onboarding flows
   rendered INLINE (provider header + credential fields + live sync progress),
   not portalled drawers, so the static canvas captures every connector's setup
   surface. Style-guide, glossary and finish compose the Welcome* features.

   Pure presenter: the connector tiles, the repositories, every credential
   field, the style packs, the glossary candidates and the sync rows arrive in
   `data`. Brand marks are derived from a provider key, never carried. */

const LABELS = ["Welcome", "Connect", "Style guide", "Glossary", "Finish"] as const;

const STATES = [
  { id: "default", label: "Welcome" },
  { id: "connect", label: "Connect · pick a source" },
  { id: "connect-github", label: "Connect · GitHub" },
  { id: "connect-slack", label: "Connect · Slack" },
  { id: "connect-notion", label: "Connect · Notion" },
  { id: "connect-gdrive", label: "Connect · Google Drive" },
  { id: "connect-upload", label: "Connect · Upload" },
  { id: "connect-syncing", label: "Connect · Syncing" },
  { id: "guide", label: "Style guide" },
  { id: "glossary", label: "Glossary" },
  { id: "syncing", label: "Finish · initial sync" },
  { id: "done", label: "Finish · complete" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which onboarding step is on screen. An app drives it from its own route. */
export type WelcomeStep =
  | "hero" | "connect" | "connect-github" | "connect-slack" | "connect-notion"
  | "connect-gdrive" | "connect-upload" | "connect-syncing"
  | "guide" | "glossary" | "finish" | "done";

/** Which of the five Stepper positions a step sits at. */
const STEP_INDEX: Record<WelcomeStep, number> = {
  hero: 0,
  connect: 1, "connect-github": 1, "connect-slack": 1, "connect-notion": 1,
  "connect-gdrive": 1, "connect-upload": 1, "connect-syncing": 1,
  guide: 2, glossary: 3, finish: 4, done: 4,
};

/** One connector tile on the Connect step. `key` selects the brand mark. */
export type Tile = { key: string; name: string; blurb: string; connected?: boolean; active?: boolean };

/** One credential field on a connector's setup form. */
export type CField = { key: string; label: string; secret?: boolean; multiline?: boolean; placeholder?: string; help?: string; value?: string };

/** A repository the GitHub token can reach. */
export type Repo = { name: string; desc: string; priv: boolean; branch: string };

/** One file already ingested by the Upload connector. */
export type UploadedFile = { name: string; detail: string };

/** What the onboarding run actually achieved, for the Done step. */
export type WelcomeSummary = { sourcesSynced: number; guide: string; glossaryTerms: number };

/** Everything the onboarding wizard renders. */
export type WelcomeData = {
  step: WelcomeStep;
  /** Connect step: the tiles offered, and how many connectors exist in total. */
  tiles: Tile[];
  connectorCount: number;
  /** GitHub step. */
  repos: Repo[];
  selectedRepo: string;
  pathsGlob: string;
  /** Credential forms for the other providers. */
  slackFields: CField[];
  notionFields: CField[];
  gdriveFields: CField[];
  /** Upload step. */
  uploadSummary: string;
  uploadFiles: UploadedFile[];
  /** connect-syncing step: the one source being watched. */
  connectSync: SyncRow;
  /** Style-guide step. */
  packs: GuidePack[];
  /** Glossary step. */
  glossaryCandidates: Candidate[];
  /** Finish step: every source's sync state. */
  syncRows: SyncRow[];
  /** Done step: what the run actually achieved. */
  doneSummary: WelcomeSummary;
};

/* ── Shared unauthenticated framing ────────────────────────────────────────
   Kept identical to LoginPage / SetupPage: one backdrop, one 672px column, one
   centered logo/title/sub header, one card, primary-bottom-left actions.
   Deliberately OFF the 1400px console grid (§11): no sidebar here. */
const AUTH_SHELL = "relative h-full w-full overflow-y-auto bg-paper";
const AUTH_COL = "relative mx-auto flex min-h-full max-w-2xl flex-col justify-center";
const AUTH_ACTIONS = "flex flex-wrap items-center gap-2";

function AuthBackdrop() {
  return (
    <>
      <span className="pointer-events-none absolute -left-6 -top-8 rotate-[-12deg] text-biscay/[0.08]"><Brandmark size={140} /></span>
      <span className="pointer-events-none absolute -bottom-10 -right-6 rotate-[8deg] text-moss/[0.08]"><Brandmark size={160} /></span>
    </>
  );
}

function AuthHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <span className="text-biscay"><Logo size={34} /></span>
      <h1 className="mt-4 font-display text-[26px] font-bold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">{title}</h1>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink/70 [overflow-wrap:anywhere]">{sub}</p>
    </div>
  );
}

/* ── Step 0: hero ─────────────────────────────────────────────────────── */

function Hero() {
  const promises = [
    "Connect your real sources: no fake OAuth, no “coming soon”.",
    "Curate a style guide that becomes your Library default.",
    "Seed a glossary from documents you already have.",
  ];
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Let’s set up your workspace</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          A few real steps: every one does actual work. You can save and finish
          later at any point.
        </p>
        <ul className="mt-5 space-y-2.5">
          {promises.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-ink/80">
              <span className="mt-0.5 text-moss"><CheckCircle2 size={17} /></span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid aspect-[4/3] place-items-center rounded-[8px] border border-dashed border-ink/20 bg-flysch/60 text-center">
        <div className="px-6">
          <span className="text-biscay"><Logo size={30} /></span>
          <p className="mt-3 font-term text-[11px] uppercase tracking-[0.1em] text-ink/65">Onboarding journey</p>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: connector grid ───────────────────────────────────────────── */

function ConnectGrid({ tiles, connectorCount }: { tiles: Tile[]; connectorCount: number }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Connect your knowledge</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">
          Pick a source to import. Connecting hits the live ingestion pipeline and shows real progress.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.key}
            className={`flex items-center gap-3 rounded-md border p-3 text-left ${
              t.active ? "border-biscay-2 ring-1 ring-biscay-2/40 bg-biscay/[0.04]" : "border-ink/15 hover:border-ink/35"
            }`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ink/12"><SourceMark provider={t.key} size={20} /></span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13.5px] font-semibold text-ink">{t.name}</b>
              <span className="block truncate text-[12px] text-ink/60">{t.blurb}</span>
            </span>
            {t.connected
              ? <Chip label="Connected" tone="ok" icon={<CheckCircle2 size={11} />} className="shrink-0" />
              : <span className="shrink-0 font-term text-[11.5px] text-biscay-2">Connect →</span>}
          </div>
        ))}
      </div>
      <button type="button" className={`inline-flex items-center gap-1 font-term text-[12px] text-ink/65 rounded-[3px] ${focusRing}`}>
        <ChevronRight size={13} /> Show all {connectorCount} connectors
      </button>
    </div>
  );
}

/* ── Step 1: inline connector setup (provider header + fields + progress) ─ */

function ConnectorHeader({ provider, name, blurb, docs }: {
  provider: string; name: string; blurb: string; docs?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-ink/12">
        {provider === "github" ? <GithubMark size={24} /> : <SourceMark provider={provider} size={24} />}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[19px] font-semibold text-ink">Connect {name}</h2>
          <Chip label="Step 2 · Connect" tone="neutral" caps />
        </div>
        <p className="mt-0.5 text-[13px] text-ink/65">
          {blurb}{" "}
          {docs && <span className="inline-flex items-center gap-1 text-biscay-2">Where do I get these? <ExternalLink size={11} /></span>}
        </p>
      </div>
    </div>
  );
}

function BackToConnectors() {
  return (
    <button type="button" className={`inline-flex items-center gap-1 font-term text-[12px] text-ink/65 rounded-[3px] ${focusRing}`}>
      ← All connectors
    </button>
  );
}

function ConnectFooterHint({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-ink/10 pt-3">
      <span className="flex-1 text-[12px] text-ink/65">{children}</span>
      <Button variant="primary">Connect &amp; sync <ArrowRight size={14} /></Button>
    </div>
  );
}

function CredFields({ fields }: { fields: CField[] }) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          {f.multiline ? (
            <Textarea className="w-full font-term" rows={4} placeholder={f.placeholder} defaultValue={f.value} autoComplete="off" />
          ) : (
            <Input className="w-full" type={f.secret ? "password" : "text"} placeholder={f.placeholder} defaultValue={f.value} autoComplete="off" />
          )}
          {f.help && <p className="mt-1 text-[11.5px] text-ink/65">{f.help}</p>}
        </Field>
      ))}
      <p className="text-[11.5px] text-ink/65">Credentials are stored server-side and never shown again.</p>
    </div>
  );
}

function GithubConnect({ data }: { data: WelcomeData }) {
  const selected = data.selectedRepo;
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="github" name="GitHub" blurb="Pick a repository from your token’s scope, then narrow to a paths glob." />
      <BackToConnectors />
      <div role="radiogroup" aria-label="Repositories" className="grid grid-cols-1 gap-1.5">
        {data.repos.map((r) => {
          const active = r.name === selected;
          return (
            <label key={r.name}
              className={`flex min-w-0 items-center gap-2.5 rounded-md border p-2.5 ${active ? "border-biscay-2 ring-1 ring-biscay-2/40 bg-biscay/[0.04]" : "border-ink/15"}`}>
              <input type="radio" name="repo" className="accent-biscay shrink-0" defaultChecked={active} readOnly />
              <GitFork size={14} className="shrink-0 text-ink/65" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <b className="truncate text-[13px] font-semibold text-ink">{r.name}</b>
                  {r.priv && <Chip label="Private" tone="neutral" icon={<Lock size={10} />} />}
                </span>
                <span className="block truncate text-[11.5px] text-ink/65">{r.desc}</span>
              </span>
              <span className="shrink-0 font-term text-[11px] text-ink/65">{r.branch}</span>
            </label>
          );
        })}
      </div>
      <Field label="Paths filter (glob)">
        <Input className="w-full font-term" defaultValue={data.pathsGlob} />
      </Field>
      <ConnectFooterHint>Mari Cloud syncs Markdown docs read-only.</ConnectFooterHint>
    </div>
  );
}

function SlackConnect({ fields }: { fields: CField[] }) {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="slack" name="Slack" blurb="Import channel history into your shared knowledge library." docs />
      <BackToConnectors />
      <CredFields fields={fields} />
      <div className="flex items-start gap-2 rounded-[4px] border border-ink/12 bg-flysch px-3 py-2 text-[12px] text-ink/70">
        <Bot size={13} className="mt-0.5 shrink-0" />
        Importing channel history is separate from the answering bot — set that up under Settings → Sources → Bots.
      </div>
      <ConnectFooterHint>Credentials validate against the Slack API before syncing.</ConnectFooterHint>
    </div>
  );
}

function NotionConnect({ fields }: { fields: CField[] }) {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="notion" name="Notion" blurb="Sync pages and databases shared with an internal integration." docs />
      <BackToConnectors />
      <CredFields fields={fields} />
      <ConnectFooterHint>Only pages shared with the integration are visible.</ConnectFooterHint>
    </div>
  );
}

function GdriveConnect({ fields }: { fields: CField[] }) {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="gdrive" name="Google Drive" blurb="Sync Docs and folders through a service account." docs />
      <BackToConnectors />
      <CredFields fields={fields} />
      <ConnectFooterHint>Google Docs are exported to Markdown on sync.</ConnectFooterHint>
    </div>
  );
}

function UploadConnect({ data }: { data: WelcomeData }) {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="upload" name="files" blurb="Drag in .md / .txt files — they run the same chunk → embed pipeline as sync." />
      <BackToConnectors />
      <div className="grid place-items-center gap-2 rounded-md border-2 border-dashed border-ink/20 px-6 py-9 text-center">
        <Send size={22} className="-rotate-45 text-ink/35" />
        <span className="text-[13px] text-ink/60">Drag files here, or</span>
        <Button compact>Browse files</Button>
      </div>
      <div>
        <p className="text-[12.5px] text-ink/70">{data.uploadSummary} <span className="text-ink/65">(unchanged chunks skipped by content hash)</span></p>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {data.uploadFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-2 rounded-md border border-ink/12 p-2">
              <FileText size={14} className="shrink-0 text-ink/65" />
              <span className="flex-1 truncate text-[13px] text-ink">{f.name}</span>
              <span className="shrink-0 font-term text-[11px] text-ink/65">{f.detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-ink/10 pt-3">
        <span className="flex-1 text-[12px] text-ink/65">.md / .txt · up to 20 files · 1 MB each</span>
        <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
      </div>
    </div>
  );
}

function ConnectSyncing({ row }: { row: SyncRow }) {
  /* The brand mark is built from the provider key, so the row itself stays
     plain JSON. */
  const source: SyncSource = {
    ...row,
    provider: row.provider,
  };
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="github" name="GitHub" blurb="The initial sync runs on the server — live status below." />
      <SyncPanel sources={[source]} />
      <div className="flex items-center gap-3 border-t border-ink/10 pt-3">
        <span className="flex-1 text-[12px] text-ink/65">Sync continues on the server — leaving this step won’t interrupt it.</span>
        <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
      </div>
    </div>
  );
}

/* ── Steps 2–4 ────────────────────────────────────────────────────────── */

function GuideStep({ packs }: { packs: GuidePack[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Choose a style guide</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Your pick becomes the Library default: you can change it any time.</p>
      </div>
      <WelcomeGuideStep packs={packs} />
      <Button variant="link">Manage guides in the Library →</Button>
    </div>
  );
}

function GlossaryStep({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Seed your glossary</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Harvest candidate terms from the documents you just connected.</p>
      </div>
      <WelcomeGlossaryStep candidates={candidates} />
    </div>
  );
}

function FinishStep({ rows }: { rows: SyncRow[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Finish setup</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Here’s what actually happened: live sync state from your sources.</p>
      </div>
      <WelcomeSyncPanel sources={rows} />
      <div className={AUTH_ACTIONS}>
        <Button variant="primary">Finish setup</Button>
      </div>
    </div>
  );
}

const NEXT = [
  { icon: <BookOpen size={18} />, title: "Explore Knowledge", sub: "Browse everything you just imported." },
  { icon: <GitBranch size={18} />, title: "See Lineage", sub: "How facts trace back to sources." },
  { icon: <Bot size={18} />, title: "Set up bots", sub: "Answer questions in Slack." },
];

function DoneStep({ summary }: { summary: WelcomeSummary }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-moss/30 bg-moss/[0.06] p-4">
        <span className="mt-0.5 text-moss"><CheckCircle2 size={22} /></span>
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Your workspace is ready</h2>
          <p className="mt-0.5 text-[13px] text-ink/65">
            {summary.sourcesSynced} sources synced · style guide set to <b className="text-ink/80">{summary.guide}</b> · {summary.glossaryTerms} glossary terms added.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {NEXT.map((n) => (
          <div key={n.title} className="flex items-start gap-2.5 rounded-md border border-ink/15 p-3 hover:border-ink/35">
            <span className="mt-0.5 text-biscay-2">{n.icon}</span>
            <span className="min-w-0">
              <b className="block text-[13px] font-semibold text-ink">{n.title}</b>
              <span className="block text-[12px] text-ink/60">{n.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Body dispatch ────────────────────────────────────────────────────── */

function StepBody({ data }: { data: WelcomeData }) {
  switch (data.step) {
    case "connect": return <ConnectGrid tiles={data.tiles} connectorCount={data.connectorCount} />;
    case "connect-github": return <GithubConnect data={data} />;
    case "connect-slack": return <SlackConnect fields={data.slackFields} />;
    case "connect-notion": return <NotionConnect fields={data.notionFields} />;
    case "connect-gdrive": return <GdriveConnect fields={data.gdriveFields} />;
    case "connect-upload": return <UploadConnect data={data} />;
    case "connect-syncing": return <ConnectSyncing row={data.connectSync} />;
    case "guide": return <GuideStep packs={data.packs} />;
    case "glossary": return <GlossaryStep candidates={data.glossaryCandidates} />;
    case "finish": return <FinishStep rows={data.syncRows} />;
    case "done": return <DoneStep summary={data.doneSummary} />;
    default: return <Hero />;
  }
}

function WelcomePage({ data, loading = false, error = null, mobile = false }: PageProps<WelcomeData>) {
  if (loading) {
    return (
      <div className={AUTH_SHELL}>
        <SkeletonPage variant="auth" />
      </div>
    );
  }
  const step = STEP_INDEX[data.step];
  const last = LABELS.length - 1;
  const done = data.step === "done";
  const nextLabel =
    done ? "Go to Overview" : step === 0 ? "Set up my workspace" : step === last ? "Finish setup" : "Continue";

  return (
    <div className={AUTH_SHELL}>
      <AuthBackdrop />
      <div className={`${AUTH_COL} ${mobile ? "px-4 py-10" : "px-6 py-16"}`}>
        <AuthHeader title="Welcome to Mari" sub="Your product knowledge, curated. Five steps, all of them real." />

        <Card variant="plain">
          <div className="mb-5">
            <Stepper labels={[...LABELS]} current={step} ariaLabel="Onboarding steps" />
          </div>

          {/* A failed onboarding query used to render as a normal, empty
              wizard: the user saw "no repositories found" when the truth was
              that the request failed. Catalog copy carries the explanation and
              the recovery action (§8); `error` carries the real detail. */}
          {error && (
            <div className="mb-4">
              <ErrorMessage id="server.unavailable">{error}</ErrorMessage>
            </div>
          )}

          <StepBody data={data} />

          {/* Primary bottom LEFT, secondary to its right (§2). */}
          <div className={`mt-7 border-t border-ink/10 pt-4 ${AUTH_ACTIONS}`}>
            <Button variant="primary">{nextLabel}</Button>
            <Button variant="default" disabled={step === 0}>← Back</Button>
            <Button variant="link">Save and finish later</Button>
            <span className="ml-auto font-term text-[12px] text-ink/65">
              {done ? <span className="inline-flex items-center gap-1 text-moss"><Sparkles size={12} /> Setup complete</span> : `${step + 1} of ${LABELS.length}`}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

export const page: PageModule<WelcomeData> = {
  id: "welcome",
  title: "Welcome",
  route: "/welcome",
  component: WelcomePage,
  states: STATES.map((s) => ({ ...s })),
};
