import { CheckCircle2, ArrowRight } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Logo, Brandmark } from "../shell/Logo";
import { Stepper } from "../data-display/Stepper";
import { Card } from "../layout/Card";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Button } from "../actions/Button";
import { CodeBlock } from "../data-display/CodeBlock";
import { Scrollable } from "../data-display/Scrollable";
import { Alert } from "../feedback/Alert";
import { Chip } from "../data-display/Chip";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { SkeletonPage } from "../data-display/Skeletons";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_URL, UNBREAKABLE, LONG_WORD,
  HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS,
} from "./stress";

const LONG_EMAIL =
  "alexandra.wilhelmina.featherstonehaugh-montgomery@platform-reliability-and-incident-response.enterprise-workspace.example.com";

/* Setup — first-run admin claim (pages/setup.md). Shown when a fresh workspace
   has no admin yet; renders OUTSIDE the console shell on the same full-bleed
   auth backdrop as Login, in a WIDER centered card. Two-step tracker:
   1 Token → 2 Admin account. States walk the whole claim: paste-token,
   admin-details, the Finish submit in flight, a rejected-token validation
   error, and the completed workspace hand-off. */

const STATES = [
  { id: "default", label: "Token step" },
  { id: "admin", label: "Admin account" },
  { id: "saving", label: "Setting up…" },
  { id: "error", label: "Invalid token" },
  { id: "success", label: "Complete" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/* ── Shared unauthenticated framing ────────────────────────────────────────
   Kept identical to LoginPage / WelcomePage: one backdrop, one 672px column,
   one centered logo/title/sub header, one card, primary-bottom-left actions.
   Deliberately OFF the 1400px console grid (§11): no sidebar here. */
const AUTH_SHELL = "relative h-full w-full overflow-y-auto bg-paper";
const AUTH_COL = "relative mx-auto flex min-h-full max-w-2xl flex-col justify-center";
const AUTH_ACTIONS = "flex flex-wrap items-center gap-2";
/* Two-up field grid: the auth card is 672px wide, so a single stretched input
   would read absurd. Matches the field width the console Settings pages use. */
const FORM_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2";

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

const LOG_SAMPLE = `mari-cloud  ┃ workspace has no admin: one-time setup required
mari-cloud  ┃ admin token:  3f9c-7b21-e04d-a41b   ← yours will differ
mari-cloud  ┃ open http://localhost:8787/setup to claim this workspace`;

function TokenStep() {
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink/70">
        This workspace has no admin yet. Paste the one-time token printed in the
        server logs to claim it.
      </p>
      <CodeBlock code={LOG_SAMPLE} language="log" title="server logs" copy={false} />
      <Field label="Admin token">
        <Input className="w-full" placeholder="3f9c-7b21-e04d-a41b" autoComplete="off" spellCheck={false} />
      </Field>
      {/* Next-step action bottom LEFT (§2). */}
      <div className={AUTH_ACTIONS}>
        <Button variant="primary">Continue <ArrowRight size={14} /></Button>
        <Button variant="link">Where do I find this?</Button>
      </div>
    </div>
  );
}

function AdminStep({ saving = false, error = false }: { saving?: boolean; error?: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink/70">
        Create the admin account and name your workspace.
      </p>
      {saving && (
        <Alert tone="info" title="Setting up your workspace">
          Creating the admin account and opening your session…
        </Alert>
      )}
      {error && (
        <Alert tone="blocked" title="Invalid token: check the server logs">
          The server rejected that token. It may be mistyped or already used: 
          copy it fresh from the <code className="font-term">admin token:</code> log line.
        </Alert>
      )}
      <div className={FORM_GRID}>
        <Field label="Your name">
          <Input className="w-full" placeholder="Maya Chen" autoComplete="name" defaultValue="Maya Chen" />
        </Field>
        <Field label="Email">
          <Input className="w-full" type="email" placeholder="maya@team.com" autoComplete="email" defaultValue="maya@team.com" />
        </Field>
        <Field label="Password">
          <Input className="w-full" type="password" placeholder="••••••••" autoComplete="new-password" defaultValue="••••••••••" />
        </Field>
        <Field label="Workspace name">
          <Input className="w-full" placeholder="Acme Product" defaultValue="Acme Product" />
        </Field>
      </div>
      <p className="-mt-2 text-[12px] text-ink/65">Shown in the sidebar and on published pages.</p>
      <div className={`pt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary" disabled={saving}>
          {saving ? "Setting up…" : "Finish setup"}
        </Button>
        <Button variant="link" disabled={saving}>← Back to token</Button>
      </div>
    </div>
  );
}

function SuccessStep() {
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-moss/35 text-moss"><CheckCircle2 size={26} /></span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-ink">Your workspace is ready</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/70">
            <b className="text-ink/80">Acme Product</b> is claimed and you’re signed in as its admin.
            Next, connect a source to start building your knowledge base.
          </p>
        </div>
      </div>
      {/* Biggest action last, and bottom left (§1, §2). */}
      <div className={`mt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary">Go to Overview <ArrowRight size={14} /></Button>
        <Button variant="link">Connect a source first</Button>
      </div>
    </div>
  );
}

/* `overflow` — the admin step stuffed with very long NATURAL text: long name,
   long workspace name, long email, and a long validation message. Catches
   wrapping, truncation, and vertical overflow. */
function OverflowStep() {
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink/70">{LONG_PARAGRAPH}</p>
      <Alert tone="blocked" title={LONG_TITLE}>{LONG_PARAGRAPH}</Alert>
      <div className={FORM_GRID}>
        <Field label="Your name">
          <Input className="w-full" defaultValue={LONG_NAME} autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input className="w-full" type="email" defaultValue={LONG_EMAIL} autoComplete="email" />
        </Field>
        <Field label="Workspace name">
          <Input className="w-full" defaultValue={LONG_TITLE} />
        </Field>
      </div>
      <p className="-mt-2 text-[12px] leading-relaxed text-ink/65">{LONG_PARAGRAPH}</p>
      <div className={`pt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary">Finish setting up {LONG_TITLE}</Button>
        <Button variant="link">← Back to token</Button>
      </div>
    </div>
  );
}

/* `stress` — PATHOLOGICAL content: an unbreakable token, a huge URL, a single
   long word, huge numbers, a 20+ chip row, a long avatar stack, and mixed
   scripts + emoji. Catches horizontal overflow, missing break-words/truncate,
   and flex blowouts. */
function StressStep() {
  return (
    <div className="space-y-4">
      <CodeBlock code={UNBREAKABLE} language="log" title="admin token" copy={false} />
      <Alert tone="blocked" title={UNBREAKABLE}>{MIXED_SCRIPT}, {LONG_URL}</Alert>
      <div className={FORM_GRID}>
        <Field label="Admin token">
          <Input className="w-full" defaultValue={UNBREAKABLE} spellCheck={false} />
        </Field>
        <Field label="Workspace name">
          <Input className="w-full" defaultValue={LONG_WORD} />
        </Field>
      </div>
      <Scrollable className="w-full pb-1" scrollerClassName="flex gap-1.5">
        {MANY_TAGS.map((t) => <Chip key={t} label={t} tone="neutral" className="shrink-0" />)}
      </Scrollable>
      <AvatarGroup people={MANY_INITIALS.map((i) => ({ initials: i }))} max={MANY_INITIALS.length} />
      <p className="break-words font-term text-[12px] text-ink/65">{HUGE_NUMBER_STR} workspaces · {MIXED_SCRIPT}</p>
      <div className={`pt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary">{LONG_WORD}</Button>
        <Button variant="link">← Back to token</Button>
      </div>
    </div>
  );
}

function SetupPage({ state = "default", mobile = false }: PageProps) {
  const saving = state === "saving";
  const error = state === "error";
  const success = state === "success";
  const overflow = state === "overflow";
  const stress = state === "stress";
  const onAdmin = state === "admin" || saving || error || overflow || stress;
  const step = success ? 2 : onAdmin ? 1 : 0;

  if (saving) {
    return (
      <div className={AUTH_SHELL}>
        <SkeletonPage variant="auth" />
      </div>
    );
  }

  return (
    <div className={AUTH_SHELL}>
      <AuthBackdrop />
      <div className={`${AUTH_COL} ${mobile ? "px-4 py-10" : "px-6 py-16"}`}>
        <AuthHeader
          title={success ? "Workspace claimed" : "Welcome to Mari"}
          sub={success ? "Your workspace is claimed and ready." : "Claim this workspace and create the admin account."}
        />
        <Card variant="plain">
          <div className="mb-5">
            <Stepper labels={["Token", "Admin account"]} current={Math.min(step, 1)} ariaLabel="Setup steps" />
          </div>
          {success ? <SuccessStep /> : overflow ? <OverflowStep /> : stress ? <StressStep /> : step === 0 ? <TokenStep /> : <AdminStep saving={saving} error={error} />}
        </Card>
      </div>
    </div>
  );
}

export const page: PageModule = {
  id: "setup",
  title: "Setup",
  route: "/setup",
  component: SetupPage,
  states: STATES.map((s) => ({ ...s })),
};
