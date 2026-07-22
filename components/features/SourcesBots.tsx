import { useState, type ReactNode } from "react";
import { CheckCircle2, GitFork, RefreshCw, Copy, Slack, Github } from "lucide-react";
import { card } from "../tokens/card";
import { Button } from "../actions/Button";
import { Drawer } from "../layout/Drawer";
import { Stepper } from "../data-display/Stepper";
import { Chip, StatusChip } from "../data-display/Chip";
import { Spinner } from "../data-display/Spinner";
import { SkeletonLine, SkeletonCircle, SkeletonChip, SkeletonButton, SkeletonText } from "../data-display/Skeleton";
import { IconRing } from "../data-display/IconRing";
import { CodeBlock } from "../data-display/CodeBlock";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { SectionLabel } from "../forms/SectionLabel";
import { SlackMark, GithubMark } from "../icons/marks";
import { fmtDateTime } from "../tokens/format";

/* SourcesBots — the Sources page "Bots" tab: self-serve setup for the two
   push-into-Mari integrations (Slack answering bot + GitHub push webhook).
   Two honest status cards ("Waiting for first event" is a real state) each
   open a guided-setup Drawer with a Stepper. Composes Card/Drawer/Stepper/
   Chip/Input/CodeBlock; the /bots/status + updateSetting layer is baked in.
   Standalone: the Slack setup drawer opens by default. */

type SlackStatus = { configured: boolean; teamName?: string; lastEventAt?: string; lastError?: string };
type GithubStatus = { webhookConfigured: boolean; lastDeliveryAt?: string; repos: string[] };

const SLACK_DEMO: SlackStatus = { configured: true, teamName: "Acme HQ", lastEventAt: "2026-07-21T13:58:00" };
const GITHUB_DEMO: GithubStatus = { webhookConfigured: true, repos: ["acme/handbook", "acme/api"] };

const SLACK_MANIFEST = `display_information:
  name: Mari
features:
  bot_user:
    display_name: Mari
oauth_config:
  scopes:
    bot: [app_mentions:read, chat:write, im:history, im:read]
settings:
  event_subscriptions:
    request_url: https://acme.mari.app/webhooks/slack
    bot_events: [app_mention, message.im]`;

function botChip(status: "not-set-up" | "error" | "waiting" | "configured"): ReactNode {
  switch (status) {
    case "not-set-up": return <Chip label="Not set up" tone="neutral" dot />;
    case "error": return <Chip label="Error" tone="blocked" dot />;
    case "waiting": return <Chip label="Waiting for first event" tone="attention" dot pulse />;
    case "configured": return <Chip label="Configured" tone="ok" dot />;
  }
}

function slackState(s: SlackStatus) {
  if (!s.configured) return "not-set-up" as const;
  if (s.lastError) return "error" as const;
  if (!s.lastEventAt) return "waiting" as const;
  return "configured" as const;
}
function githubState(s: GithubStatus) {
  if (!s.webhookConfigured) return "not-set-up" as const;
  if (!s.lastDeliveryAt) return "waiting" as const;
  return "configured" as const;
}

function randomHexSecret(): string {
  const bytes = new Uint8Array(24);
  (globalThis.crypto ?? window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const origin = typeof window !== "undefined" ? window.location.origin : "https://acme.mari.app";

/* ── Slack setup drawer ─────────────────────────────────────────────────── */
const SLACK_STEPS = ["Create the app", "Connect", "Verify", "Use it"];

function SlackDrawer({
  open, onClose, status,
}: { open: boolean; onClose: () => void; status: SlackStatus }) {
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const [tested, setTested] = useState<"idle" | "ok" | "fail">("idle");

  const tokenOk = token.startsWith("xoxb-");
  const tokenErr = token.length > 0 && (token.startsWith("xoxp-") || !token.startsWith("xoxb-"));
  const canSave = tokenOk && secret.trim().length > 0;

  const body = () => {
    if (step === 0) return (
      <div className="grid gap-3">
        <p className="text-[13px] text-ink/70">Create a Slack app "From a manifest" — it pre-fills scopes and the events URL.</p>
        <CodeBlock code={SLACK_MANIFEST} title="app-manifest.yml" />
      </div>
    );
    if (step === 1) return (
      <div className="grid gap-1">
        <p className="text-[13px] text-ink/70 mb-1">Paste the credentials from your Slack app's settings.</p>
        <Field label="Bot token">
          <Input className="w-full font-term" type="password" placeholder="xoxb-…" value={token} onChange={(e) => { setToken(e.target.value); setSaved(false); }} />
          {tokenErr && <p className="mt-1 text-[11.5px] text-espelette">Bot tokens start with <code>xoxb-</code> (not <code>xoxp-</code>).</p>}
        </Field>
        <Field label="Signing secret">
          <Input className="w-full font-term" type="password" placeholder="••••••••" value={secret} onChange={(e) => { setSecret(e.target.value); setSaved(false); }} />
        </Field>
        {status.configured && <p className="mt-2 text-[11.5px] text-ink/55">Already configured — enter new values only to replace them.</p>}
        <div className="mt-3">
          <Button variant="primary" compact disabled={!canSave} onClick={() => setSaved(true)}>Save credentials</Button>
          {saved && <span className="ml-2 inline-flex items-center gap-1 text-[12.5px] text-moss"><CheckCircle2 size={14} /> Saved</span>}
        </div>
      </div>
    );
    if (step === 2) return (
      <div className="grid gap-3">
        <p className="text-[13px] text-ink/70">Run Slack's <code>auth.test</code> to confirm the token works.</p>
        <div>
          <Button compact onClick={() => setTested("ok")}><RefreshCw size={13} /> Test connection</Button>
          {tested === "ok" && (
            <div className="mt-3 flex items-center gap-2">
              <StatusChip status="approved" /> <span className="text-[12.5px] text-ink/70">Connected as <b>@Mari</b> in <b>{status.teamName ?? "your workspace"}</b>.</span>
            </div>
          )}
          {tested === "fail" && <p className="mt-3 text-[12.5px] text-espelette">auth.test failed — check the token and retry.</p>}
        </div>
      </div>
    );
    return (
      <div className="grid gap-3">
        <p className="text-[13px] text-ink/70">Invite the bot and ask it anything:</p>
        <ul className="text-[13px] text-ink/70 list-disc pl-5 grid gap-1">
          <li><code>/invite @Mari</code> in a channel</li>
          <li>@mention <b>@Mari</b> with a question</li>
          <li>DM <b>Mari</b> directly</li>
        </ul>
        <div className={`${card} p-3 flex items-center gap-2`}>
          {botChip(slackState(status))}
          {status.lastEventAt && <span className="ml-auto font-term text-[11px] text-ink/45">Last event {fmtDateTime(status.lastEventAt)}</span>}
        </div>
      </div>
    );
  };

  const nextBlocked = step === 1 && !(saved || status.configured);
  const footer = (
    <div className="flex-1 flex items-center justify-between gap-2">
      <Button compact disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
      {step < SLACK_STEPS.length - 1
        ? <Button variant="primary" compact disabled={nextBlocked} onClick={() => setStep((s) => s + 1)}>Next</Button>
        : <Button variant="primary" compact onClick={onClose}>Done</Button>}
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Set up Slack bot" subtitle="Guided setup"
      icon={<IconRing size={31}><SlackMark size={18} /></IconRing>} footer={footer}>
      <div className="mb-5"><Stepper labels={SLACK_STEPS} current={step} onSelect={(i) => i < step && setStep(i)} ariaLabel="Slack setup progress" /></div>
      {body()}
    </Drawer>
  );
}

/* ── GitHub webhook drawer ──────────────────────────────────────────────── */
const GH_STEPS = ["Add the webhook", "Secret", "Verify"];

function GithubDrawer({
  open, onClose, status,
}: { open: boolean; onClose: () => void; status: GithubStatus }) {
  const [step, setStep] = useState(0);
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const payloadUrl = `${origin}/webhooks/github`;

  const body = () => {
    if (step === 0) return (
      <div className="grid gap-3">
        <p className="text-[13px] text-ink/70">In the repo's <b>Settings → Webhooks → Add webhook</b>, use:</p>
        <Field label="Payload URL"><span className="font-term text-[12.5px] break-all">{payloadUrl}</span></Field>
        <Field label="Content type"><span className="font-term text-[12.5px]">application/json</span></Field>
        <Field label="Events"><span className="text-[13px]">Just the <b>push</b> event</span></Field>
      </div>
    );
    if (step === 1) return (
      <div className="grid gap-1">
        <p className="text-[13px] text-ink/70 mb-1">Set a webhook secret so Mari can verify deliveries.</p>
        <Field label="Webhook secret">
          <div className="flex items-center gap-2">
            <Input className="flex-1 font-term" value={secret} placeholder="click Generate" onChange={(e) => { setSecret(e.target.value); setSaved(false); }} />
            <Button compact onClick={() => { setSecret(randomHexSecret()); setSaved(false); }}><RefreshCw size={13} /> Generate</Button>
            <Button icon aria-label="Copy secret" disabled={!secret} onClick={() => navigator.clipboard?.writeText(secret)}><Copy size={14} /></Button>
          </div>
        </Field>
        <div className="mt-3">
          <Button variant="primary" compact disabled={!secret} onClick={() => setSaved(true)}>Save secret</Button>
          {saved && <span className="ml-2 inline-flex items-center gap-1 text-[12.5px] text-moss"><CheckCircle2 size={14} /> Saved</span>}
        </div>
        <p className="mt-2 text-[11.5px] text-ink/55">Paste the same value into GitHub's "Secret" field. A separate receiver reads <code>MARI_GITHUB_WEBHOOK_SECRET</code>.</p>
      </div>
    );
    return (
      <div className="grid gap-3">
        {status.lastDeliveryAt ? (
          <div className="flex items-center gap-2">
            <StatusChip status="approved" /> <span className="text-[12.5px] text-ink/70">Delivery received {fmtDateTime(status.lastDeliveryAt)}.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-ink/70"><Spinner size="sm" /> Waiting for the first delivery… (push a commit)</div>
        )}
        <div>
          <SectionLabel>Connected repositories</SectionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {status.repos.length > 0
              ? status.repos.map((r) => <Chip key={r} label={r} tone="neutral" icon={<GitFork size={11} />} />)
              : <span className="text-[12.5px] text-ink/55">Connect a repo on the Connectors tab.</span>}
          </div>
        </div>
      </div>
    );
  };

  const nextBlocked = step === 1 && !(saved || status.webhookConfigured);
  const footer = (
    <div className="flex-1 flex items-center justify-between gap-2">
      <Button compact disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
      {step < GH_STEPS.length - 1
        ? <Button variant="primary" compact disabled={nextBlocked} onClick={() => setStep((s) => s + 1)}>Next</Button>
        : <Button variant="primary" compact onClick={onClose}>Done</Button>}
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="Set up GitHub webhook" subtitle="Guided setup"
      icon={<IconRing size={31}><GithubMark size={18} /></IconRing>} footer={footer}>
      <div className="mb-5"><Stepper labels={GH_STEPS} current={step} onSelect={(i) => i < step && setStep(i)} ariaLabel="GitHub webhook setup progress" /></div>
      {body()}
    </Drawer>
  );
}

/* ── BotsTab ────────────────────────────────────────────────────────────── */
export type SourcesBotsProps = {
  slack?: SlackStatus;
  github?: GithubStatus;
  /** Which setup drawer opens on mount (so it shows in a static gallery). */
  defaultOpen?: "slack" | "github" | null;
  loading?: boolean;
  className?: string;
};

export function SourcesBots({
  slack = SLACK_DEMO, github = GITHUB_DEMO, defaultOpen = "slack", loading = false, className = "",
}: SourcesBotsProps) {
  const [drawer, setDrawer] = useState<"slack" | "github" | null>(defaultOpen);

  if (loading) {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 ${className}`.trim()} aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className={`${card} flex flex-col gap-3 p-4`}>
            <div className="flex items-center gap-3">
              <SkeletonCircle size={31} />
              <SkeletonLine w="40%" h={13} />
              <span className="ml-auto"><SkeletonChip w={84} /></span>
            </div>
            <SkeletonText lines={1} lastWidth="82%" />
            <SkeletonLine w="50%" h={10} />
            <SkeletonLine w="60%" h={10} />
            <SkeletonButton w={140} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`.trim()}>
      <div className={`${card} p-4 flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <IconRing size={31}><SlackMark size={18} /></IconRing>
          <b className="text-[14px] font-semibold text-ink flex-1">Slack bot</b>
          {botChip(slackState(slack))}
        </div>
        <p className="text-[12.5px] text-ink/65">Answers @mentions and DMs from your knowledge base.</p>
        <Field label="Workspace"><span className="text-[13px]">{slack.teamName ?? "—"}</span></Field>
        <Field label="Last event"><span className="font-term text-[12px] text-ink/70">{slack.lastEventAt ? fmtDateTime(slack.lastEventAt) : "none yet"}</span></Field>
        <Button variant="primary" compact className="self-start" onClick={() => setDrawer("slack")}>
          <Slack size={14} /> {slack.configured ? "Manage setup" : "Set up Slack bot"}
        </Button>
      </div>

      <div className={`${card} p-4 flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <IconRing size={31}><GithubMark size={18} /></IconRing>
          <b className="text-[14px] font-semibold text-ink flex-1">GitHub webhook</b>
          {botChip(githubState(github))}
        </div>
        <p className="text-[12.5px] text-ink/65">Re-syncs a repo the instant you push a commit.</p>
        <Field label="Payload URL"><span className="font-term text-[12px] text-ink/70 break-all">{origin}/webhooks/github</span></Field>
        <Field label="Repositories">
          <div className="flex flex-wrap gap-1.5">
            {github.repos.map((r) => <Chip key={r} label={r} tone="neutral" icon={<GitFork size={11} />} />)}
          </div>
        </Field>
        <Button variant="primary" compact className="self-start" onClick={() => setDrawer("github")}>
          <Github size={14} /> {github.webhookConfigured ? "Manage setup" : "Set up webhook"}
        </Button>
      </div>

      <SlackDrawer open={drawer === "slack"} onClose={() => setDrawer(null)} status={slack} />
      <GithubDrawer open={drawer === "github"} onClose={() => setDrawer(null)} status={github} />
    </div>
  );
}
