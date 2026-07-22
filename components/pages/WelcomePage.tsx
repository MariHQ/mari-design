import type { ReactNode } from "react";
import {
  CheckCircle2, ArrowRight, ChevronRight, GitFork, Lock, ExternalLink,
  Send, FileText, BookOpen, GitBranch, Bot, Sparkles,
} from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Stepper } from "../data-display/Stepper";
import { Button } from "../actions/Button";
import { Logo } from "../shell/Logo";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { Chip } from "../data-display/Chip";
import { SyncPanel, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark, GithubMark } from "../icons/marks";
import { WelcomeGuideStep } from "../features/WelcomeGuideStep";
import { WelcomeGlossaryStep } from "../features/WelcomeGlossaryStep";
import { WelcomeSyncPanel } from "../features/WelcomeSyncPanel";
import { SkeletonPage } from "../data-display/Skeletons";
import { focusRing } from "../tokens/focusRing";

/* Welcome — onboarding wizard (pages/welcome.md). Post-auth, renders OUTSIDE
   the console shell: a single-column wizard with a five-step Stepper
   (Welcome → Connect → Style guide → Glossary → Finish). Each state selects the
   active step; the Connect step expands into per-connector onboarding flows
   rendered INLINE (provider header + credential fields + live sync progress),
   not portalled drawers, so the static canvas captures every connector's setup
   surface. Style-guide, glossary and finish compose the Welcome* features. */

const LABELS = ["Welcome", "Connect", "Style guide", "Glossary", "Finish"] as const;

/* state id → active step index (0–4) */
const STEP: Record<string, number> = {
  default: 0,
  connect: 1,
  "connect-github": 1,
  "connect-slack": 1,
  "connect-notion": 1,
  "connect-gdrive": 1,
  "connect-upload": 1,
  "connect-syncing": 1,
  guide: 2,
  glossary: 3,
  syncing: 4,
  done: 4,
};

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
] as const;

/* ── Step 0: hero ─────────────────────────────────────────────────────── */

function Hero() {
  const promises = [
    "Connect your real sources — no fake OAuth, no “coming soon”.",
    "Curate a style guide that becomes your Library default.",
    "Seed a glossary from documents you already have.",
  ];
  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div>
        <h2 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Let’s set up your workspace</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          A few real steps — every one does actual work. You can save and finish
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
          <p className="mt-3 font-term text-[11px] uppercase tracking-[0.1em] text-ink/45">Onboarding journey</p>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: connector grid ───────────────────────────────────────────── */

type Tile = { key: string; name: string; blurb: string; connected?: boolean; active?: boolean };
const TILES: Tile[] = [
  { key: "github", name: "GitHub", blurb: "Markdown docs from repos in your token’s scope.", active: true },
  { key: "slack", name: "Slack", blurb: "Import channel history into the library." },
  { key: "notion", name: "Notion", blurb: "Pages and databases from a shared integration." },
  { key: "gdrive", name: "Google Drive", blurb: "Docs & folders via a service account." },
  { key: "upload", name: "Upload", blurb: "Drag in .md / .txt files directly." },
  { key: "website", name: "Website", blurb: "Crawl a docs site by sitemap." },
  { key: "confluence", name: "Confluence", blurb: "Spaces and pages from Cloud or Server.", connected: true },
  { key: "jira", name: "Jira", blurb: "Issues and project docs." },
];

function ConnectGrid() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Connect your knowledge</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">
          Pick a source to import. Connecting hits the live ingestion pipeline and shows real progress.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TILES.map((t) => (
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
      <button type="button" className={`inline-flex items-center gap-1 font-term text-[12px] text-ink/55 rounded-[3px] ${focusRing}`}>
        <ChevronRight size={13} /> Show all 14 connectors
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
    <button type="button" className={`inline-flex items-center gap-1 font-term text-[12px] text-ink/55 rounded-[3px] ${focusRing}`}>
      ← All connectors
    </button>
  );
}

function ConnectFooterHint({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-ink/10 pt-3">
      <span className="flex-1 text-[12px] text-ink/55">{children}</span>
      <Button variant="primary">Connect &amp; sync <ArrowRight size={14} /></Button>
    </div>
  );
}

type CField = { key: string; label: string; secret?: boolean; multiline?: boolean; placeholder?: string; help?: string; value?: string };

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
          {f.help && <p className="mt-1 text-[11.5px] text-ink/55">{f.help}</p>}
        </Field>
      ))}
      <p className="text-[11.5px] text-ink/55">Credentials are stored server-side and never shown again.</p>
    </div>
  );
}

const REPOS = [
  { name: "acme/handbook", desc: "Company handbook & policies", priv: true, branch: "main" },
  { name: "acme/api-docs", desc: "Public API reference", priv: false, branch: "main" },
  { name: "acme/runbooks", desc: "On-call runbooks", priv: true, branch: "master" },
  { name: "acme/blog", desc: "Engineering blog (Markdown)", priv: false, branch: "main" },
];

function GithubConnect() {
  const selected = "acme/handbook";
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="github" name="GitHub" blurb="Pick a repository from your token’s scope, then narrow to a paths glob." />
      <BackToConnectors />
      <div role="radiogroup" aria-label="Repositories" className="grid gap-1.5">
        {REPOS.map((r) => {
          const active = r.name === selected;
          return (
            <label key={r.name}
              className={`flex items-center gap-2.5 rounded-md border p-2.5 ${active ? "border-biscay-2 ring-1 ring-biscay-2/40 bg-biscay/[0.04]" : "border-ink/15"}`}>
              <input type="radio" name="repo" className="accent-biscay" defaultChecked={active} readOnly />
              <GitFork size={14} className="shrink-0 text-ink/45" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <b className="truncate text-[13px] font-semibold text-ink">{r.name}</b>
                  {r.priv && <Chip label="Private" tone="neutral" icon={<Lock size={10} />} />}
                </span>
                <span className="block truncate text-[11.5px] text-ink/55">{r.desc}</span>
              </span>
              <span className="shrink-0 font-term text-[11px] text-ink/45">{r.branch}</span>
            </label>
          );
        })}
      </div>
      <Field label="Paths filter (glob)">
        <Input className="w-full font-term" defaultValue="**/*.md" />
      </Field>
      <ConnectFooterHint>Mari Cloud syncs Markdown docs read-only.</ConnectFooterHint>
    </div>
  );
}

function SlackConnect() {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="slack" name="Slack" blurb="Import channel history into your shared knowledge library." docs />
      <BackToConnectors />
      <CredFields fields={[
        { key: "bot_token", label: "Bot token", secret: true, placeholder: "xoxb-…", value: "xoxb-2117-••••••••", help: "Needs channels:history and channels:read." },
        { key: "app_token", label: "App-level token", secret: true, placeholder: "xapp-…", value: "xapp-1-A05••••" },
        { key: "channel", label: "Channel", placeholder: "#engineering", value: "#engineering" },
      ]} />
      <div className="flex items-start gap-2 rounded-[4px] border border-ink/12 bg-flysch px-3 py-2 text-[12px] text-ink/70">
        <Bot size={13} className="mt-0.5 shrink-0" />
        Importing channel history is separate from the answering bot — set that up under Settings → Sources → Bots.
      </div>
      <ConnectFooterHint>Credentials validate against the Slack API before syncing.</ConnectFooterHint>
    </div>
  );
}

function NotionConnect() {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="notion" name="Notion" blurb="Sync pages and databases shared with an internal integration." docs />
      <BackToConnectors />
      <CredFields fields={[
        { key: "token", label: "Internal integration token", secret: true, placeholder: "secret_…", value: "secret_9Fh2••••", help: "Share the pages you want with the integration first." },
        { key: "root", label: "Page or database ID", placeholder: "8f3c2b1a-…", value: "8f3c2b1a-004d-42e7-9b11" },
      ]} />
      <ConnectFooterHint>Only pages shared with the integration are visible.</ConnectFooterHint>
    </div>
  );
}

function GdriveConnect() {
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="gdrive" name="Google Drive" blurb="Sync Docs and folders through a service account." docs />
      <BackToConnectors />
      <CredFields fields={[
        { key: "service_account_json", label: "Service-account JSON", secret: false, multiline: true, value: '{\n  "type": "service_account",\n  "project_id": "acme-docs",\n  "client_email": "mari@acme-docs.iam…"\n}', help: "Paste the downloaded key file; grant it viewer access to the folder." },
        { key: "folder_id", label: "Folder ID", placeholder: "1A2b3C…", value: "1A2b3C4d5E6f7G8h" },
      ]} />
      <ConnectFooterHint>Google Docs are exported to Markdown on sync.</ConnectFooterHint>
    </div>
  );
}

function UploadConnect() {
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
        <p className="text-[12.5px] text-ink/70">3 files ingested · 214 chunks · 189 embedded <span className="text-ink/50">(unchanged chunks skipped by content hash)</span></p>
        <div className="mt-2 grid gap-1.5">
          {[
            { name: "pricing.md", n: "88 chunks · 88 embedded" },
            { name: "onboarding.md", n: "71 chunks · 71 embedded" },
            { name: "faq.md", n: "55 chunks · 30 embedded" },
          ].map((f) => (
            <div key={f.name} className="flex items-center gap-2 rounded-md border border-ink/12 p-2">
              <FileText size={14} className="shrink-0 text-ink/45" />
              <span className="flex-1 truncate text-[13px] text-ink">{f.name}</span>
              <span className="shrink-0 font-term text-[11px] text-ink/55">{f.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 border-t border-ink/10 pt-3">
        <span className="flex-1 text-[12px] text-ink/55">.md / .txt · up to 20 files · 1 MB each</span>
        <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
      </div>
    </div>
  );
}

function ConnectSyncing() {
  const source: SyncSource = {
    id: "gh", name: "GitHub · acme/handbook", mark: <GithubMark size={24} />,
    state: "syncing", phase: "Embedding", done: 340, total: 512, chunkCount: 8912, embeddedCount: 5780,
  };
  return (
    <div className="space-y-4">
      <ConnectorHeader provider="github" name="GitHub" blurb="The initial sync runs on the server — live status below." />
      <SyncPanel sources={[source]} />
      <div className="flex items-center gap-3 border-t border-ink/10 pt-3">
        <span className="flex-1 text-[12px] text-ink/55">Sync continues on the server — leaving this step won’t interrupt it.</span>
        <Button variant="primary">Done <CheckCircle2 size={14} /></Button>
      </div>
    </div>
  );
}

/* ── Steps 2–4 ────────────────────────────────────────────────────────── */

function GuideStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Choose a style guide</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Your pick becomes the Library default — you can change it any time.</p>
      </div>
      <WelcomeGuideStep />
      <Button variant="link">Manage guides in the Library →</Button>
    </div>
  );
}

function GlossaryStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Seed your glossary</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Harvest candidate terms from the documents you just connected.</p>
      </div>
      <WelcomeGlossaryStep />
    </div>
  );
}

function FinishStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink">Finish setup</h2>
        <p className="mt-1 text-[13.5px] text-ink/65">Here’s what actually happened — live sync state from your sources.</p>
      </div>
      <WelcomeSyncPanel />
      <div className="flex justify-end">
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

function DoneStep() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-moss/30 bg-moss/[0.06] p-4">
        <span className="mt-0.5 text-moss"><CheckCircle2 size={22} /></span>
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Your workspace is ready</h2>
          <p className="mt-0.5 text-[13px] text-ink/65">
            2 sources synced · style guide set to <b className="text-ink/80">Plain language</b> · 5 glossary terms added.
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

function StepBody({ state }: { state: string }) {
  switch (state) {
    case "connect": return <ConnectGrid />;
    case "connect-github": return <GithubConnect />;
    case "connect-slack": return <SlackConnect />;
    case "connect-notion": return <NotionConnect />;
    case "connect-gdrive": return <GdriveConnect />;
    case "connect-upload": return <UploadConnect />;
    case "connect-syncing": return <ConnectSyncing />;
    case "guide": return <GuideStep />;
    case "glossary": return <GlossaryStep />;
    case "syncing": return <FinishStep />;
    case "done": return <DoneStep />;
    default: return <Hero />;
  }
}

function WelcomePage({ state = "default", mobile = false }: PageProps) {
  if (state === "syncing") {
    return (
      <div className="h-full w-full overflow-y-auto bg-paper">
        <SkeletonPage variant="auth" />
      </div>
    );
  }
  const step = STEP[state] ?? 0;
  const last = LABELS.length - 1;
  const done = state === "done";
  const nextLabel =
    done ? "Go to Overview" : step === 0 ? "Set up my workspace" : step === last ? "Finish setup" : "Continue";

  return (
    <div className="h-full w-full overflow-y-auto bg-paper">
      <div className={`mx-auto max-w-3xl ${mobile ? "px-4 py-8" : "px-6 py-10"}`}>
        <div className="mb-6 flex items-center justify-between">
          <span className="font-term text-[11px] uppercase tracking-[0.1em] text-biscay-2">Workspace setup</span>
          <Button variant="link">Save and finish later</Button>
        </div>

        <div className="mb-7">
          <Stepper labels={[...LABELS]} current={step} ariaLabel="Onboarding steps" />
        </div>

        <div className="rounded-[8px] border border-ink/15 bg-paper p-5 sm:p-6">
          <StepBody state={state} />

          <div className="mt-7 flex items-center justify-between border-t border-ink/10 pt-4">
            <Button variant="default" disabled={step === 0}>← Back</Button>
            <span className="font-term text-[12px] text-ink/50">
              {done ? <span className="inline-flex items-center gap-1 text-moss"><Sparkles size={12} /> Setup complete</span> : `${step + 1} of ${LABELS.length}`}
            </span>
            <Button variant="primary">{nextLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const page: PageModule = {
  id: "welcome",
  title: "Welcome",
  route: "/welcome",
  component: WelcomePage,
  states: STATES.map((s) => ({ ...s })),
};
