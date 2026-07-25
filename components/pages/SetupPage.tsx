import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Logo, Brandmark } from "../shell/Logo";
import { Stepper } from "../data-display/Stepper";
import { Card } from "../layout/Card";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Button } from "../actions/Button";
import { CodeBlock } from "../data-display/CodeBlock";
import { Alert } from "../feedback/Alert";
import { Spinner } from "../data-display/Spinner";
import { SkeletonPage } from "../data-display/Skeletons";

/* Setup — first-run admin claim (pages/setup.md). Shown when a fresh workspace
   has no admin yet; renders OUTSIDE the console shell on the same full-bleed
   auth backdrop as Login, in a WIDER centered card. Two-step tracker:
   1 Token → 2 Admin account.

   Pure presenter: the step, the server-log excerpt carrying the one-time
   token, and the admin details all arrive in `data`. The canvas supplies them
   from `.preview/fixtures/setup.ts`. */

const STATES = [
  { id: "default", label: "Token step" },
  { id: "admin", label: "Admin account" },
  { id: "saving", label: "Setting up…" },
  { id: "error", label: "Invalid token" },
  { id: "success", label: "Complete" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which of the two claim steps is on screen, or the hand-off after both. */
export type SetupStep = "token" | "admin" | "done";

/** The admin account this screen creates, and the token that authorizes it. */
export type Claim = { token: string; name: string; email: string; password: string; workspace: string };

/** What first-run setup can DO. One call, because the server validates the
 *  token and creates the admin in one step: a token that was mistyped or
 *  already used comes back as a rejection on the finish button, and that
 *  wording is shown verbatim. Optional (§2): with no handler the two steps
 *  still walk, which is what the design canvas renders. */
export type SetupActions = {
  claimWorkspace?: (c: Claim) => void | Promise<void>;
  /** Leave first-run setup. The workspace is claimed and the admin is signed
      in by this point, so both exits are ordinary navigation — the screen just
      names which one was chosen. */
  finish?: (target: "overview" | "sources") => void;
};

/** Everything the Setup screen renders. */
export type SetupData = {
  step: SetupStep;
  /** The server-log excerpt that carries the one-time token. */
  logSample: string;
  /** Prefilled admin-token input. Empty string leaves it blank. */
  token: string;
  /** The admin account being created, and the workspace it will own. */
  name: string;
  email: string;
  password: string;
  workspace: string;
};

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

function TokenStep({ data, error, claim, set, onNext }: {
  data: SetupData; error: string | null; claim: Claim;
  set: (patch: Partial<Claim>) => void; onNext: () => void;
}) {
  const [help, setHelp] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink/70">
        This workspace has no admin yet. Paste the one-time token printed in the
        server logs to claim it.
      </p>
      <CodeBlock code={data.logSample} language="log" title="server logs" copy={false} />
      <Field label="Admin token">
        <Input className="w-full" placeholder="3f9c-7b21-e04d-a41b" autoComplete="off" spellCheck={false}
          value={claim.token} onChange={(e) => set({ token: e.target.value })} />
      </Field>
      {/* The token step is exactly where a rejected token has to be reported;
          this branch used to drop `error`, so "Invalid token" — a state this
          page declares — rendered as a silently unchanged form. */}
      {error && <Alert tone="blocked" title="Token rejected">{error}</Alert>}
      {/* Next-step action bottom LEFT (§2). The token is not checked here:
          the server validates it together with the admin account it
          authorizes, so this step only carries it forward. */}
      <div className={AUTH_ACTIONS}>
        <Button variant="primary" disabled={!claim.token.trim()} onClick={onNext}>Continue <ArrowRight size={14} /></Button>
        <Button variant="link" onClick={() => setHelp((h) => !h)}>Where do I find this?</Button>
      </div>
      {help && (
        <p className="text-[12.5px] leading-relaxed text-ink/70">
          The API prints it once at first boot, on a line beginning{" "}
          <code className="font-term">admin token:</code>. Run the command above
          against the container that is serving this page.
        </p>
      )}
    </div>
  );
}

function AdminStep({ error, claim, set, busy, onBack, onSubmit }: {
  error: string | null; claim: Claim; set: (patch: Partial<Claim>) => void;
  busy: boolean; onBack: () => void; onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-ink/70">
        Create the admin account and name your workspace.
      </p>
      {/* The server's own rejection is the alert title; the recovery step under
          it is ours, so it reads the same however the server phrases it (§8). */}
      {error && (
        <Alert tone="blocked" title={error}>
          The server rejected that token. It may be mistyped or already used:
          copy it fresh from the <code className="font-term">admin token:</code> log line.
        </Alert>
      )}
      <div className={FORM_GRID}>
        <Field label="Your name">
          <Input className="w-full" placeholder="Maya Chen" autoComplete="name" value={claim.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input className="w-full" type="email" placeholder="maya@team.com" autoComplete="email" value={claim.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Password">
          <Input className="w-full" type="password" placeholder="••••••••" autoComplete="new-password" value={claim.password} onChange={(e) => set({ password: e.target.value })} />
        </Field>
        <Field label="Workspace name">
          <Input className="w-full" placeholder="Acme Product" value={claim.workspace} onChange={(e) => set({ workspace: e.target.value })} />
        </Field>
      </div>
      <p className="-mt-2 text-[12px] text-ink/65">Shown in the sidebar and on published pages.</p>
      <div className={`pt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary" disabled={busy} onClick={onSubmit}>
          {busy ? <><Spinner size="sm" /> Setting up…</> : "Finish setup"}
        </Button>
        <Button variant="link" onClick={onBack}>← Back to token</Button>
      </div>
    </div>
  );
}

function SuccessStep({ workspace, actions }: { workspace: string; actions?: SetupActions }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-moss/35 text-moss"><CheckCircle2 size={26} /></span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-ink">Your workspace is ready</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/70">
            <b className="text-ink/80">{workspace}</b> is claimed and you’re signed in as its admin.
            Next, connect a source to start building your knowledge base.
          </p>
        </div>
      </div>
      {/* Biggest action last, and bottom left (§1, §2). */}
      <div className={`mt-1 ${AUTH_ACTIONS}`}>
        <Button variant="primary" onClick={() => actions?.finish?.("overview")}>Go to Overview <ArrowRight size={14} /></Button>
        <Button variant="link" onClick={() => actions?.finish?.("sources")}>Connect a source first</Button>
      </div>
    </div>
  );
}

function SetupPage({ data, loading = false, error = null, actions, mobile = false }: PageProps<SetupData, SetupActions>) {
  /* The claim is typed here and has to leave the form, so it is local state
     seeded from the data. Both steps used to be uncontrolled `defaultValue`
     inputs under buttons with no handler: the whole screen was a picture. */
  const [claim, setClaim] = useState<Claim>({
    token: data.token, name: data.name, email: data.email,
    password: data.password, workspace: data.workspace,
  });
  const [step, setStep] = useState<SetupStep>(data.step);
  const [seen, setSeen] = useState(data.step);
  if (seen !== data.step) { setSeen(data.step); setStep(data.step); }
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const set = (patch: Partial<Claim>) => setClaim((c) => ({ ...c, ...patch }));

  const submit = async () => {
    if (!actions?.claimWorkspace) { setStep("done"); return; } // canvas
    setBusy(true);
    setFailed(null);
    try {
      await actions.claimWorkspace(claim);
      setStep("done");
    } catch (err) {
      // "Invalid setup token, check the server logs." is the message that
      // makes this recoverable; it reaches the user unchanged.
      setFailed(err instanceof Error ? err.message : "Setup could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={AUTH_SHELL}>
        <SkeletonPage variant="auth" />
      </div>
    );
  }

  const done = step === "done";
  const shown = failed ?? error;
  return (
    <div className={AUTH_SHELL}>
      <AuthBackdrop />
      <div className={`${AUTH_COL} ${mobile ? "px-4 py-10" : "px-6 py-16"}`}>
        <AuthHeader
          title={done ? "Workspace claimed" : "Welcome to Mari"}
          sub={done ? "Your workspace is claimed and ready." : "Claim this workspace and create the admin account."}
        />
        <Card variant="plain">
          <div className="mb-5">
            <Stepper labels={["Token", "Admin account"]} current={step === "token" ? 0 : 1} ariaLabel="Setup steps" />
          </div>
          {done ? <SuccessStep workspace={claim.workspace || data.workspace} actions={actions} />
            : step === "token" ? <TokenStep data={data} error={shown} claim={claim} set={set} onNext={() => setStep("admin")} />
            : <AdminStep error={shown} claim={claim} set={set} busy={busy} onBack={() => setStep("token")} onSubmit={() => void submit()} />}
        </Card>
      </div>
    </div>
  );
}

export const page: PageModule<SetupData, SetupActions> = {
  id: "setup",
  title: "Setup",
  route: "/setup",
  component: SetupPage,
  states: STATES.map((s) => ({ ...s })),
};
