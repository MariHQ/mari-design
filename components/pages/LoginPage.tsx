import type { ReactNode } from "react";
import { Mail, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { Logo, Brandmark } from "../shell/Logo";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Spinner } from "../data-display/Spinner";
import { SkeletonPage } from "../data-display/Skeletons";
import { GithubMark } from "../icons/marks";
import { FieldError } from "../feedback/ErrorMessage";
import { focusRing } from "../tokens/focusRing";
import { btnDisabled } from "../actions/buttons";

/* Login (pages/login.md). Unauthenticated route — renders OUTSIDE the console
   shell. A centered auth card on a full-bleed backdrop with decorative brand
   marks in the corners.

   Pure presenter: which step of the auth flow is on screen, what the workspace
   is branded as, and which identity providers it offers all arrive in `data`.
   The canvas supplies them from `.preview/fixtures/login.ts`; a real app
   supplies them from its router and its workspace config. */

const STATES = [
  { id: "sign-in", label: "Sign in" },
  { id: "register", label: "Register" },
  { id: "loading", label: "Signing in…" },
  { id: "error", label: "Bad credentials" },
  { id: "oauth-github", label: "OAuth · GitHub" },
  { id: "oauth-google", label: "OAuth · Google" },
  { id: "magic-link", label: "Magic link sent" },
  { id: "2fa", label: "Two-factor" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** A third-party identity provider the workspace offers. */
export type LoginProvider = "github" | "google" | "sso";

/** Which step of the auth flow is on screen. An app drives this from its own
    route/local state; it is never inferred from the shape of the data. */
export type LoginScreen = "credentials" | "oauth" | "magic-link" | "two-factor";

/** Everything the Login screen renders. */
export type LoginData = {
  screen: LoginScreen;
  /** Branding above the card. */
  title: string;
  sub: string;
  /** `credentials`: create an account rather than sign in. */
  register: boolean;
  /** Prefilled credential values. Empty string leaves a field blank. */
  name: string;
  email: string;
  password: string;
  /** Workspace named by the invite/SSO link. `null` hides the workspace field
      and the workspace goes unnamed on the submit button. */
  workspace: string | null;
  /** Providers this workspace offers. Empty renders the form on its own. */
  providers: LoginProvider[];
  /** Offer to switch between signing in and creating an account. */
  allowRegister: boolean;
  /** `oauth`: the provider we handed off to. */
  handoff: "github" | "google" | null;
  /** `magic-link`: where the link went, and the resend countdown. */
  magicLinkTo: string;
  resendIn: string;
  /** `two-factor`: one entry per code box, "" for an empty box. */
  codeDigits: string[];
};

function GoogleMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

/* ── Shared unauthenticated framing ────────────────────────────────────────
   Login, Setup and Welcome are single-task screens with no sidebar, so they
   deliberately sit OFF the 1400px console grid (§11). What they do share is
   each other: one backdrop, one 672px column, one centered logo/title/sub
   header, one card, and a primary-bottom-left action row. Keep these three
   constants identical across the three files. */
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

const DIVIDER =
  "flex items-center gap-3 text-center font-term text-[11px] uppercase tracking-[0.08em] text-ink/65 before:h-px before:flex-1 before:bg-ink/12 after:h-px after:flex-1 after:bg-ink/12";

/* Third-party sign-in. SSO sits here rather than on the credential form: it is
   an alternative identity provider, not a second password field, and giving it
   its own full-width row keeps the enterprise path obvious without crowding
   the two consumer providers. Rendered only for the providers the workspace
   actually offers, so a credentials-only workspace shows no dead buttons. */
function OAuthRow({ providers }: { providers: LoginProvider[] }) {
  if (!providers.length) return null;
  const base = `inline-flex items-center justify-center gap-2 h-9 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80 hover:border-ink/45 disabled:pointer-events-none ${btnDisabled} ${focusRing}`;
  const social = providers.filter((p) => p !== "sso");
  return (
    <>
      <div className={`my-3.5 ${DIVIDER}`}>or continue with</div>
      {social.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {social.includes("github") && (
            <button type="button" className={base}><GithubMark size={16} /> GitHub</button>
          )}
          {social.includes("google") && (
            <button type="button" className={base}><GoogleMark /> Google</button>
          )}
        </div>
      )}
      {providers.includes("sso") && (
        <>
          <button type="button" className={`mt-2 w-full ${base}`}>
            <KeyRound size={16} /> Single sign-on (SAML)
          </button>
          <p className="mt-1.5 text-center text-[11.5px] text-ink/65">
            Workspace admins can require SSO for everyone on your domain.
          </p>
        </>
      )}
    </>
  );
}

function ModeToggle({ register }: { register: boolean }) {
  return (
    <p className="mt-4 text-center text-[12.5px] text-ink/70">
      {register ? (
        <>Already have an account? <span className="font-medium text-biscay-2">Sign in</span></>
      ) : (
        <>New here? <span className="font-medium text-biscay-2">Create an account</span></>
      )}
    </p>
  );
}

function CredForm({ data, error }: { data: LoginData; error: string | null }) {
  const { register, workspace } = data;
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      {register && (
        <Field label="Name">
          <Input className="w-full" autoComplete="name" placeholder="Maya Chen" defaultValue={data.name} />
        </Field>
      )}
      <Field label="Email">
        <Input className="w-full" type="email" autoComplete="email" placeholder="you@team.com" defaultValue={data.email} />
      </Field>
      <Field label="Password">
        <Input className="w-full" type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="••••••••" defaultValue={data.password} />
      </Field>
      {workspace !== null && (
        <Field label="Workspace">
          <Input className="w-full" defaultValue={workspace} />
        </Field>
      )}
      {error && <FieldError>{error}</FieldError>}
      {/* Primary bottom left, secondary to its right (§2). */}
      <div className={`mt-1 ${AUTH_ACTIONS}`}>
        <Button type="submit" variant="primary">
          {register ? "Create account" : workspace !== null ? `Sign in to ${workspace}` : "Sign in"}
        </Button>
        {!register && (
          <button type="button" className={`text-[12.5px] font-medium text-biscay-2 rounded-[3px] ${focusRing}`}>
            Email me a magic link instead
          </button>
        )}
      </div>
    </form>
  );
}

/* The centered "hand-off" card used by the OAuth / magic-link framings. */
function NoticeCard({ icon, title, children, footer }: {
  icon: ReactNode; title: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Card variant="plain">
      <div className="flex flex-col gap-3 py-2">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/70">{icon}</span>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-ink">{title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/70">{children}</p>
          </div>
        </div>
        {footer}
      </div>
    </Card>
  );
}

function Body({ data, error }: { data: LoginData; error: string | null }) {
  switch (data.screen) {
    case "oauth": {
      const google = data.handoff === "google";
      return (
        <NoticeCard
          icon={google ? <GoogleMark size={22} /> : <GithubMark size={22} />}
          title={google ? "Redirecting to Google…" : "Redirecting to GitHub…"}
          footer={<span className="inline-flex items-center gap-2 text-[12.5px] text-ink/65"><Spinner size="sm" /> Waiting for authorization</span>}>
          {google
            ? "You’re being sent to Google to choose an account. This window will return here once you approve access."
            : "You’re being sent to GitHub to authorize Mari. This window will return here once you approve access."}
        </NoticeCard>
      );
    }
    case "magic-link":
      return (
        <NoticeCard icon={<Mail size={22} className="text-biscay-2" />} title="Check your inbox"
          footer={
            <div className={AUTH_ACTIONS}>
              <Button variant="primary"><ArrowLeft size={14} /> Back to sign in</Button>
              <span className="text-[12px] text-ink/65">Didn’t get it? Resend in {data.resendIn}</span>
            </div>
          }>
          We emailed a one-time sign-in link to <b className="text-ink/80">{data.magicLinkTo}</b>.
          It expires in 10 minutes.
        </NoticeCard>
      );
    case "two-factor":
      return (
        <Card variant="plain">
          <div className="flex items-start gap-3 pb-3 pt-1">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/15 text-biscay-2"><ShieldCheck size={22} /></span>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-ink">Two-factor authentication</div>
              <p className="mt-1 text-[13px] text-ink/70">Enter the 6-digit code from your authenticator app.</p>
            </div>
          </div>
          <div className="my-3 flex gap-2" aria-label="Verification code">
            {data.codeDigits.map((d, i) => (
              <input key={i} inputMode="numeric" maxLength={1} defaultValue={d} aria-label={`Digit ${i + 1}`}
                className={`h-11 w-9 rounded-[4px] border border-ink/20 bg-paper text-center font-term text-[16px] text-ink outline-none focus:border-biscay-2 ${focusRing}`} />
            ))}
          </div>
          <div className={`mt-4 ${AUTH_ACTIONS}`}>
            <Button variant="primary">Verify &amp; continue</Button>
            <span className="text-[12.5px] text-ink/65">
              Lost your device? <span className="font-medium text-biscay-2">Use a recovery code</span>
            </span>
          </div>
        </Card>
      );
    default:
      return (
        <Card variant="plain">
          <CredForm data={data} error={error} />
          <OAuthRow providers={data.providers} />
          {data.allowRegister && <ModeToggle register={data.register} />}
        </Card>
      );
  }
}

function LoginPage({ data, loading = false, error = null, mobile = false }: PageProps<LoginData>) {
  if (loading) {
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
        <AuthHeader title={data.title} sub={data.sub} />
        <Body data={data} error={error} />
      </div>
    </div>
  );
}

export const page: PageModule<LoginData> = {
  id: "login",
  title: "Login",
  route: "/login",
  component: LoginPage,
  states: STATES.map((s) => ({ ...s })),
};
