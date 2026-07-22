// DocReview findings / fact-check panel — two tabs: Fact check (claim tallies,
// the top contradiction as a two-part evidence callout, and a create-review-task
// row) and All claims (the full claim list with status). Ported from
// mari-cloud/web/src/pages/docreview/FindingsPanel.tsx. Renders standalone with
// baked-in facts, findings, and task owners; the run/create-task flows are
// simulated locally.

import { Fragment, useState } from "react";
import { Check, ShieldCheck, CheckCircle2, ChevronDown, Calendar, ArrowRight, FileText } from "lucide-react";
import { Card } from "../layout/Card";
import { CardActions } from "../layout/CardShell";
import { Button } from "../actions/Button";
import { StatusChip } from "../data-display/Chip";
import { Combobox } from "../forms/Combobox";
import { Menu, MenuRadioGroup, MenuRadioItem } from "../navigation/Menu";
import { Tabs } from "../navigation/Tabs";
import { fmtDate } from "../tokens/format";
import { Skeleton, SkeletonLine, SkeletonText } from "../data-display/Skeleton";

type Finding = { id: number; kind: string; severity: string; text: string; note: string };
type Claim = { claim: string; source: string; status: string; verified: string };
type FactTab = "check" | "claims";

/* ————— demo data ————— */

const DEMO_FINDINGS: Finding[] = [
  { id: 1, kind: "fact", severity: "error", text: "reduces login latency by roughly 40%", note: "Contradicts verified fact: measured reduction was 22% in staging." },
  { id: 2, kind: "fact", severity: "warn", text: "tokens rotate every 24 hours", note: "No verified source for rotation cadence." },
  { id: 3, kind: "freshness", severity: "warn", text: "JWKS endpoint published Q1", note: "Endpoint doc last updated 8 months ago." },
];

/* "Not verified" / "No source" rather than a bare dash: CONVENTIONS.md §5
   bans em/en dashes in user-visible copy. */
const NONE = "Not verified";
const DEMO_CLAIMS: Claim[] = [
  { claim: "Tokens are signed with RS256.", source: "Auth RFC v1.2", status: "Verified", verified: "May 1, 2024" },
  { claim: "Login latency drops by 40%.", source: "Migration brief", status: "Contradicted", verified: NONE },
  { claim: "All downstream services validate against JWKS.", source: "Platform wiki", status: "Verified", verified: "Apr 12, 2024" },
  { claim: "Tokens rotate every 24 hours.", source: "No source", status: "Unsupported", verified: NONE },
  { claim: "Rollback drains every active token.", source: "Runbook", status: "Verified", verified: "Mar 3, 2024" },
];

const daysFromNow = (days: number) => fmtDate(new Date(Date.now() + days * 86400000));
/* Owner picker is a searchable Combobox (CONVENTIONS.md §7), so the roster can
   grow past the three demo names without becoming a scroll hunt. */
const TASK_OWNERS = [
  { init: "AK", name: "Aki Kim" },
  { init: "LS", name: "Lena Shah" },
  { init: "MC", name: "Maya Chen" },
  { init: "PN", name: "Priya Nair" },
  { init: "MV", name: "Marcus Vale" },
  { init: "DO", name: "Dana Osei" },
  { init: "SO", name: "Sam Ortiz" },
];
const OWNER_OPTIONS = TASK_OWNERS.map((o, i) => ({ value: String(i), label: o.name }));
const TASK_DUES = [daysFromNow(3), daysFromNow(7), daysFromNow(14)];
const TASK_PRIS: [string, string][] = [
  ["High", "#B23A1E"],
  ["Medium", "#A05E1C"],
  ["Low", "#2C6E49"],
];


export function DocReviewFindingsPanel({
  findings = DEMO_FINDINGS,
  claims = DEMO_CLAIMS,
  defaultTab = "check",
  loading = false,
}: {
  findings?: Finding[];
  claims?: Claim[];
  /** Which tab opens first, so each tab can be reviewed on its own. */
  defaultTab?: FactTab;
  loading?: boolean;
}) {
  const [tab, setTab] = useState<FactTab>(defaultTab);
  const [checking, setChecking] = useState(false);
  const [taskState, setTaskState] = useState<"idle" | "creating" | "done">("idle");
  const [ownerIx, setOwnerIx] = useState(0);
  const [dueIx, setDueIx] = useState(0);
  const [priIx, setPriIx] = useState(0);
  const [flashId, setFlashId] = useState<number | null>(null);
  /* The tally row is the claim filter: picking one narrows the claim list. */
  const [claimFilter, setClaimFilter] = useState<string | null>(null);

  const contra = findings.find((f) => f.kind === "fact" && f.severity === "error") ?? null;
  const evidence = contra ? contra.note.replace(/^Contradicts verified fact:\s*/i, "") : "";
  const contradictionN = findings.filter((f) => f.kind === "fact" && f.severity === "error").length;
  const unsupportedN = findings.filter((f) => (f.kind === "fact" && f.severity !== "error") || f.kind === "freshness").length;
  const supportedN = claims.filter((f) => f.status === "Verified").length;
  const allClaimsN = supportedN + contradictionN + unsupportedN;

  const runCheck = () => {
    if (checking) return;
    setChecking(true);
    setTimeout(() => setChecking(false), 1400);
  };
  const createTask = () => {
    if (taskState !== "idle") return;
    setTaskState("creating");
    setTimeout(() => setTaskState("done"), 900);
  };
  const jump = (id: number) => { setFlashId(id); setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1200); };

  /* Overview-style tab row: label on top, count centered UNDERNEATH it, the
     whole cell clickable and wired to the claim list below. */
  const tallies: { n: number; label: string; status: string; tone: string; icon: React.ReactNode }[] = [
    { n: supportedN, label: "Supported", status: "Verified", tone: "text-moss", icon: <Check size={14} /> },
    { n: contradictionN, label: "Contradiction", status: "Contradicted", tone: "text-espelette", icon: <span className="font-bold">!</span> },
    { n: unsupportedN, label: "Unsupported", status: "Unsupported", tone: "text-clay", icon: <span className="font-bold">!</span> },
  ];

  const pickClaims = (status: string) => {
    setClaimFilter((f) => (f === status ? null : status));
    setTab("claims");
  };

  const shownClaims = claimFilter ? claims.filter((c) => c.status === claimFilter) : claims;

  const pickBtn = "flex w-full items-center justify-between gap-2";

  if (loading) {
    return (
      <Card variant="flush" className="w-full">
        <div className="flex gap-4 px-4 pt-4" aria-hidden="true">
          <SkeletonLine w={70} h={11} /><SkeletonLine w={80} h={11} />
        </div>
        <div className="flex items-stretch border-b border-ink/10 px-4 py-3.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Fragment key={i}>
              {i > 0 && <span className="mx-3 w-px bg-ink/12" />}
              <span className="flex-1 space-y-1.5"><SkeletonLine w="70%" h={10} /><Skeleton width={24} height={20} /></span>
            </Fragment>
          ))}
        </div>
        <div className="px-4 py-3" aria-hidden="true"><Skeleton height={34} rounded="rounded-[4px]" /></div>
        <div className="space-y-3 px-4 pb-4" aria-hidden="true">
          <div className="rounded-[6px] border border-ink/12 p-3 space-y-2.5">
            <SkeletonLine w="45%" h={11} /><SkeletonText lines={2} /><SkeletonLine w="60%" h={10} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Skeleton height={34} rounded="rounded-[4px]" /><Skeleton height={34} rounded="rounded-[4px]" /><Skeleton height={34} rounded="rounded-[4px]" />
          </div>
          <Skeleton width={132} height={28} rounded="rounded-[4px]" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="flush" className="w-full">
      <div className="px-4 pt-4">
        <Tabs<FactTab>
          value={tab}
          onChange={setTab}
          ariaLabel="Fact check"
          variant="underline"
          options={[
            { id: "check", label: "Fact check" },
            { id: "claims", label: "All claims", count: allClaimsN },
          ]}
        />
      </div>

      {/* tally row, doubling as the claim filter */}
      <div className="flex items-stretch border-b border-ink/10 px-4 py-3.5">
        {tallies.map((t, i) => {
          const on = claimFilter === t.status;
          return (
            <Fragment key={t.label}>
              {i > 0 && <span className="mx-2 w-px bg-ink/12" />}
              <button
                type="button"
                aria-pressed={on}
                onClick={() => pickClaims(t.status)}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[5px] border px-1.5 py-1.5 text-center transition-colors ${
                  on ? "border-biscay-2 bg-biscay-2/[0.08] ring-1 ring-biscay-2" : "border-transparent hover:border-ink/20"
                }`}
              >
                <span className={`flex max-w-full items-center justify-center gap-1.5 text-[11.5px] font-medium ${t.tone}`}>
                  {t.icon}
                  <span className="truncate">{t.label}</span>
                </span>
                <b className="block font-display text-[20px] leading-tight text-ink">{t.n}</b>
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className="px-4 py-3">
        <Button block disabled={checking} onClick={runCheck}>
          <ShieldCheck size={14} /> {checking ? "Checking claims against verified facts…" : "Run fact check"}
        </Button>
      </div>

      {tab === "claims" ? (
        <div className="space-y-2 px-4 pb-4">
          {claimFilter && (
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ink/70">
              <span>Filtered to {claimFilter.toLowerCase()} claims.</span>
              <Button variant="link" compact onClick={() => setClaimFilter(null)}>Show all claims</Button>
            </div>
          )}
          {shownClaims.map((f) => (
            <div key={f.claim} className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 ${f.status === "Verified" ? "text-moss" : "text-ink/65"}`}>
                <CheckCircle2 size={15} />
              </span>
              <span className="min-w-0 break-words text-[13px] text-ink/85">
                {f.claim}
                <span className="mt-0.5 block break-words text-[11px] text-ink/65">
                  {f.source} · {f.status} · {f.verified}
                </span>
              </span>
            </div>
          ))}
          {shownClaims.length === 0 && (
            <p className="text-[12.5px] text-ink/70">
              {claims.length === 0
                ? "No claims extracted yet. Run a fact check to scan the document."
                : "No claims in this state."}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          {contra ? (
            <div className="rounded-[6px] border border-espelette/25 bg-espelette/[0.04] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-espelette">
                  <span className="grid place-items-center w-4 h-4 rounded-full bg-espelette text-white text-[10px] font-bold">!</span>
                  Contradiction
                </span>
                <span className="text-[11px] text-ink/65">High confidence</span>
              </div>
              <div className="mt-2.5">
                <span className="block text-[10.5px] uppercase tracking-[0.06em] text-ink/65">In document</span>
                <mark
                  className={`mt-1 inline-block max-w-full cursor-pointer break-words rounded-[3px] bg-espelette/15 px-1 py-0.5 text-[12.5px] text-ink/85 transition-colors ${flashId === contra.id ? "ring-2 ring-espelette/50" : ""}`}
                  onClick={() => jump(contra.id)}
                >{contra.text}</mark>
              </div>
              <div className="mt-2.5">
                <span className="block text-[10.5px] uppercase tracking-[0.06em] text-ink/65">Verified evidence</span>
                <mark className="mt-1 inline-block max-w-full break-words rounded-[3px] bg-moss/15 px-1 py-0.5 text-[12.5px] text-ink/85">{evidence}</mark>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink/65">
                <FileText size={13} /> Auth RFC v1.2 · May 1, 2024
                <StatusChip status="canonical" />
                <Button variant="link" className="ml-auto" onClick={() => window.open("/knowledge?q=Auth%20RFC", "_blank")}>
                  Open source <ArrowRight size={11} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-[12.5px] text-ink/65">No contradictions found. Run a fact check to scan the latest claims.</div>
          )}

          {/* create-task row: owner, priority, due date on ONE line in that
              order (CONVENTIONS.md §7), primary action bottom left (§2). */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="min-w-0">
              <span className="block text-[11px] text-ink/65">Owner</span>
              <div className="mt-1">
                <Combobox
                  ariaLabel="Task owner"
                  search
                  value={String(ownerIx)}
                  onChange={(v) => setOwnerIx(Number(v))}
                  options={OWNER_OPTIONS}
                  searchPlaceholder="Search people…"
                  emptyLabel="No people match"
                />
              </div>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-ink/65">Priority</span>
              <div className="mt-1">
                <Menu align="start" trigger={(
                  <Button className={pickBtn}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="inline-block h-2 w-2 shrink-0 rounded-[1px]" style={{ background: TASK_PRIS[priIx][1] }} />
                      <span className="truncate">{TASK_PRIS[priIx][0]}</span>
                    </span>
                    <ChevronDown size={12} className="shrink-0" />
                  </Button>
                )}>
                  <MenuRadioGroup value={String(priIx)} onValueChange={(v) => setPriIx(Number(v))}>
                    {TASK_PRIS.map(([label], i) => <MenuRadioItem key={label} value={String(i)}>{label}</MenuRadioItem>)}
                  </MenuRadioGroup>
                </Menu>
              </div>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-ink/65">Due date</span>
              <div className="mt-1">
                <Menu align="start" trigger={(
                  <Button className={pickBtn}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Calendar size={13} className="shrink-0" />
                      <span className="truncate">{TASK_DUES[dueIx]}</span>
                    </span>
                    <ChevronDown size={12} className="shrink-0" />
                  </Button>
                )}>
                  <MenuRadioGroup value={String(dueIx)} onValueChange={(v) => setDueIx(Number(v))}>
                    {TASK_DUES.map((d, i) => <MenuRadioItem key={d} value={String(i)}>{d}</MenuRadioItem>)}
                  </MenuRadioGroup>
                </Menu>
              </div>
            </div>
          </div>

          <CardActions
            className="mt-3"
            primary={
              <Button variant="primary" compact onClick={createTask} disabled={taskState !== "idle"}>
                {taskState === "done" ? "Task created" : taskState === "creating" ? "Creating…" : "Create review task"}
              </Button>
            }
          />
        </div>
      )}
    </Card>
  );
}
