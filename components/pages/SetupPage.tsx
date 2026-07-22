import { CheckCircle2, ArrowRight } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Logo, Brandmark } from "../shell/Logo";
import { Stepper } from "../data-display/Stepper";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Button } from "../actions/Button";
import { CodeBlock } from "../data-display/CodeBlock";
import { Alert } from "../feedback/Alert";
import { SkeletonPage } from "../data-display/Skeletons";

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
] as const;

const LOG_SAMPLE = `mari-cloud  ┃ workspace has no admin — one-time setup required
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
        <Input placeholder="3f9c-7b21-e04d-a41b" autoComplete="off" spellCheck={false} />
      </Field>
      <div className="flex justify-end">
        <Button variant="primary">Continue <ArrowRight size={14} /></Button>
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
        <Alert tone="blocked" title="Invalid token — check the server logs">
          The server rejected that token. It may be mistyped or already used —
          copy it fresh from the <code className="font-term">admin token:</code> log line.
        </Alert>
      )}
      <Field label="Your name">
        <Input placeholder="Maya Chen" autoComplete="name" defaultValue="Maya Chen" />
      </Field>
      <Field label="Email">
        <Input type="email" placeholder="maya@team.com" autoComplete="email" defaultValue="maya@team.com" />
      </Field>
      <Field label="Password">
        <Input type="password" placeholder="••••••••" autoComplete="new-password" defaultValue="••••••••••" />
      </Field>
      <Field label="Workspace name">
        <Input placeholder="Acme Product" defaultValue="Acme Product" />
      </Field>
      <p className="-mt-2 text-[12px] text-ink/50">Shown in the sidebar and on published pages.</p>
      <div className="flex items-center justify-between pt-1">
        <Button variant="link" disabled={saving}>← Back to token</Button>
        <Button variant="primary" disabled={saving}>
          {saving ? "Setting up…" : "Finish setup"}
        </Button>
      </div>
    </div>
  );
}

function SuccessStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-moss/35 text-moss"><CheckCircle2 size={30} /></span>
      <div>
        <h3 className="text-[17px] font-semibold text-ink">Your workspace is ready</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
          <b className="text-ink/80">Acme Product</b> is claimed and you’re signed in as its admin.
          Next, connect a source to start building your knowledge base.
        </p>
      </div>
      <Button variant="primary">Go to Overview <ArrowRight size={14} /></Button>
    </div>
  );
}

function SetupPage({ state = "default", mobile = false }: PageProps) {
  const saving = state === "saving";
  const error = state === "error";
  const success = state === "success";
  const onAdmin = state === "admin" || saving || error;
  const step = success ? 2 : onAdmin ? 1 : 0;

  if (saving) {
    return (
      <div className="relative h-full w-full overflow-y-auto bg-paper">
        <SkeletonPage variant="auth" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-y-auto bg-paper">
      <span className="pointer-events-none absolute -left-6 -top-8 rotate-[-12deg] text-biscay/[0.08]"><Brandmark size={140} /></span>
      <span className="pointer-events-none absolute -bottom-10 -right-6 rotate-[8deg] text-moss/[0.08]"><Brandmark size={160} /></span>

      <div className={`relative mx-auto flex min-h-full max-w-xl flex-col justify-center ${mobile ? "px-4 py-10" : "px-6 py-16"}`}>
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="text-biscay"><Logo size={34} /></span>
          <h1 className="mt-4 font-display text-[24px] font-bold tracking-[-0.01em] text-ink">
            {success ? "Workspace claimed" : "Welcome to Mari Cloud"}
          </h1>
        </div>

        <div className="rounded-[8px] border border-ink/15 bg-paper p-5 sm:p-6">
          <div className="mb-5">
            <Stepper labels={["Token", "Admin account"]} current={Math.min(step, 1)} ariaLabel="Setup steps" />
          </div>
          {success ? <SuccessStep /> : step === 0 ? <TokenStep /> : <AdminStep saving={saving} error={error} />}
        </div>
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
