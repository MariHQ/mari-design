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
import { Chip } from "../data-display/Chip";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { GithubMark } from "../icons/marks";
import { FieldError } from "../feedback/ErrorMessage";
import { focusRing } from "../tokens/focusRing";
import { btnDisabled } from "../actions/buttons";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, UNBREAKABLE, LONG_WORD,
  HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS,
} from "./stress";

const LONG_EMAIL =
  "alexandra.wilhelmina.featherstonehaugh-montgomery@platform-reliability-and-incident-response.enterprise-workspace.example.com";

/* Login (pages/login.md). Unauthenticated route — renders OUTSIDE the console
   shell. A centered auth card on a full-bleed backdrop with decorative brand
   marks in the corners. Each state is a self-contained, presentational framing
   of the sign-in experience so the canvas can capture the full auth surface:
   sign-in, register, in-flight, bad-credentials, OAuth hand-off (GitHub /
   Google), magic-link sent, and the 2FA code prompt. */

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

const DIVIDER =
  "flex items-center gap-3 text-center font-term text-[11px] uppercase tracking-[0.08em] text-ink/65 before:h-px before:flex-1 before:bg-ink/12 after:h-px after:flex-1 after:bg-ink/12";

/* Third-party sign-in. SSO sits here rather than on the credential form: it is
   an alternative identity provider, not a second password field, and giving it
   its own full-width row keeps the enterprise path obvious without crowding
   the two consumer providers. */
function OAuthRow({ busy }: { busy?: string }) {
  const base = `inline-flex items-center justify-center gap-2 h-9 rounded-[4px] border border-ink/20 bg-paper text-[13px] font-medium text-ink/80 hover:border-ink/45 disabled:pointer-events-none ${btnDisabled} ${focusRing}`;
  return (
    <>
      <div className={`my-3.5 ${DIVIDER}`}>or continue with</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={base} disabled={busy != null}>
          {busy === "github" ? <Spinner size="sm" /> : <GithubMark size={16} />} GitHub
        </button>
        <button type="button" className={base} disabled={busy != null}>
          {busy === "google" ? <Spinner size="sm" /> : <GoogleMark />} Google
        </button>
      </div>
      <button type="button" className={`mt-2 w-full ${base}`} disabled={busy != null}>
        {busy === "sso" ? <Spinner size="sm" /> : <KeyRound size={16} />} Single sign-on (SAML)
      </button>
      <p className="mt-1.5 text-center text-[11.5px] text-ink/65">
        Workspace admins can require SSO for everyone on your domain.
      </p>
    </>
  );
}

function ModeToggle({ register }: { register?: boolean }) {
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

function CredForm({
  register, error, busy,
}: { register?: boolean; error?: boolean; busy?: boolean }) {
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      {register && (
        <Field label="Name">
          <Input className="w-full" autoComplete="name" placeholder="Maya Chen" defaultValue="Maya Chen" />
        </Field>
      )}
      <Field label="Email">
        <Input className="w-full" type="email" autoComplete="email" placeholder="you@team.com" defaultValue="maya@team.com" />
      </Field>
      <Field label="Password">
        <Input className="w-full" type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="••••••••" defaultValue="••••••••••" />
      </Field>
      {error && <FieldError id="auth.invalid" />}
      <Button type="submit" variant="primary" block disabled={busy}>
        {busy ? "One moment…" : register ? "Create account" : "Sign in"}
      </Button>
      {!register && (
        <button type="button" className={`mx-auto text-[12.5px] font-medium text-biscay-2 rounded-[3px] ${focusRing}`}>
          Email me a magic link instead
        </button>
      )}
    </form>
  );
}

/* The centered "hand-off" card used by the OAuth / magic-link / done framings. */
function NoticeCard({ icon, title, children, footer }: {
  icon: ReactNode; title: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-ink/70">{icon}</span>
        <div>
          <div className="text-[16px] font-semibold text-ink">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/70">{children}</p>
        </div>
        {footer}
      </div>
    </Card>
  );
}

function Body({ state }: { state: string }) {
  switch (state) {
    case "oauth-github":
      return (
        <NoticeCard icon={<GithubMark size={22} />} title="Redirecting to GitHub…"
          footer={<span className="inline-flex items-center gap-2 text-[12.5px] text-ink/65"><Spinner size="sm" /> Waiting for authorization</span>}>
          You’re being sent to GitHub to authorize Mari. This window will
          return here once you approve access.
        </NoticeCard>
      );
    case "oauth-google":
      return (
        <NoticeCard icon={<GoogleMark size={22} />} title="Redirecting to Google…"
          footer={<span className="inline-flex items-center gap-2 text-[12.5px] text-ink/65"><Spinner size="sm" /> Waiting for authorization</span>}>
          You’re being sent to Google to choose an account. This window will
          return here once you approve access.
        </NoticeCard>
      );
    case "magic-link":
      return (
        <NoticeCard icon={<Mail size={22} className="text-biscay-2" />} title="Check your inbox"
          footer={
            <div className="flex flex-col items-center gap-2">
              <Button variant="default"><ArrowLeft size={14} /> Back to sign in</Button>
              <span className="text-[12px] text-ink/65">Didn’t get it? Resend in 0:42</span>
            </div>
          }>
          We emailed a one-time sign-in link to <b className="text-ink/80">maya@team.com</b>.
          It expires in 10 minutes.
        </NoticeCard>
      );
    case "2fa":
      return (
        <Card>
          <div className="flex flex-col items-center gap-2 pb-3 pt-1 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-biscay-2"><ShieldCheck size={22} /></span>
            <div className="text-[16px] font-semibold text-ink">Two-factor authentication</div>
            <p className="text-[13px] text-ink/70">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <div className="my-3 flex justify-center gap-2" aria-label="Verification code">
            {["4", "1", "9", "", "", ""].map((d, i) => (
              <input key={i} inputMode="numeric" maxLength={1} defaultValue={d} aria-label={`Digit ${i + 1}`}
                className={`h-11 w-9 rounded-[4px] border border-ink/20 bg-paper text-center font-term text-[16px] text-ink outline-none focus:border-biscay-2 ${focusRing}`} />
            ))}
          </div>
          <Button variant="primary" block>Verify &amp; continue</Button>
          <p className="mt-3 text-center text-[12.5px] text-ink/65">
            Lost your device? <span className="font-medium text-biscay-2">Use a recovery code</span>
          </p>
        </Card>
      );
    case "overflow":
      return (
        <Card>
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <Field label="Name">
              <Input className="w-full" defaultValue={LONG_NAME} />
            </Field>
            <Field label="Email">
              <Input className="w-full" type="email" defaultValue={LONG_EMAIL} />
            </Field>
            <Field label="Workspace">
              <Input className="w-full" defaultValue={LONG_TITLE} />
            </Field>
            <p role="alert" className="text-[12.5px] leading-relaxed text-espelette">{LONG_PARAGRAPH}</p>
            <Button type="submit" variant="primary" block>Sign in to {LONG_TITLE}</Button>
          </form>
          <OAuthRow />
          <ModeToggle />
        </Card>
      );
    case "stress":
      return (
        <Card>
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <Field label="Email">
              <Input className="w-full" defaultValue={`${UNBREAKABLE}@example.com`} />
            </Field>
            <Field label="Password">
              <Input className="w-full" type="password" defaultValue={LONG_WORD} />
            </Field>
            <p role="alert" className="break-words text-[12.5px] leading-relaxed text-espelette">
              {MIXED_SCRIPT}, {UNBREAKABLE}
            </p>
            <div className="flex w-full gap-1.5 overflow-x-auto pb-1">
              {MANY_TAGS.map((t) => <Chip key={t} label={t} tone="neutral" className="shrink-0" />)}
            </div>
            <AvatarGroup people={MANY_INITIALS.map((i) => ({ initials: i }))} max={MANY_INITIALS.length} />
            <p className="font-term text-[11px] text-ink/65">{HUGE_NUMBER_STR} sign-ins</p>
            <Button type="submit" variant="primary" block>{LONG_WORD}</Button>
          </form>
        </Card>
      );
    default: {
      const register = state === "register";
      const busy = state === "loading";
      const error = state === "error";
      return (
        <div className="relative">
          <Card>
            <CredForm register={register} error={error} busy={busy} />
            <OAuthRow />
            <ModeToggle register={register} />
          </Card>
          {busy && (
            <div className="absolute inset-0 grid place-items-center rounded-[8px] bg-paper/70 backdrop-blur-[1px]">
              <Spinner size="md" label="Signing in" />
            </div>
          )}
        </div>
      );
    }
  }
}

function heading(state: string): { title: string; sub: string } {
  if (state === "register") return { title: "Create your account", sub: "Your product knowledge, curated." };
  if (state === "2fa") return { title: "Verify it’s you", sub: "One more step to keep your workspace secure." };
  if (state === "overflow") return { title: LONG_NAME, sub: LONG_PARAGRAPH };
  if (state === "stress") return { title: MIXED_SCRIPT, sub: UNBREAKABLE };
  return { title: "Mari", sub: "Your product knowledge, curated." };
}

function LoginPage({ state = "sign-in", mobile = false }: PageProps) {
  const { title, sub } = heading(state);
  if (state === "loading") {
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

      <div className={`relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center ${mobile ? "px-4 py-10" : "px-6 py-16"}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="text-biscay"><Logo size={34} /></span>
          <h1 className="mt-4 font-display text-[26px] font-bold tracking-[-0.01em] text-ink">{title}</h1>
          <p className="mt-1 text-[13.5px] text-ink/70">{sub}</p>
        </div>
        <div className="w-full">
          <Body state={state} />
        </div>
      </div>
    </div>
  );
}

export const page: PageModule = {
  id: "login",
  title: "Login",
  route: "/login",
  component: LoginPage,
  states: STATES.map((s) => ({ ...s })),
};
