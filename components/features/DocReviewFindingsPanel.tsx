// DocReview findings / fact-check panel — two tabs: Fact check (claim tallies,
// the top contradiction as a two-part evidence callout, and a create-review-task
// row) and All claims (the full claim list with status). Ported from
// mari-cloud/web/src/pages/docreview/FindingsPanel.tsx. Renders standalone with
// baked-in facts, findings, and task owners; the run/create-task flows are
// simulated locally.

import { Fragment, useState } from "react";
import { Check, ShieldCheck, CheckCircle2, ChevronDown, Calendar, ArrowRight, FileText } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Avatar } from "../data-display/Avatar";
import { StatusChip } from "../data-display/Chip";
import { Menu, MenuRadioGroup, MenuRadioItem } from "../navigation/Menu";
import { Tabs } from "../navigation/Tabs";
import { fmtDate } from "../tokens/format";

type Finding = { id: number; kind: string; severity: string; text: string; note: string };
type Claim = { claim: string; source: string; status: string; verified: string };
type FactTab = "check" | "claims";

/* ————— demo data ————— */

const DEMO_FINDINGS: Finding[] = [
  { id: 1, kind: "fact", severity: "error", text: "reduces login latency by roughly 40%", note: "Contradicts verified fact: measured reduction was 22% in staging." },
  { id: 2, kind: "fact", severity: "warn", text: "tokens rotate every 24 hours", note: "No verified source for rotation cadence." },
  { id: 3, kind: "freshness", severity: "warn", text: "JWKS endpoint published Q1", note: "Endpoint doc last updated 8 months ago." },
];

const DEMO_CLAIMS: Claim[] = [
  { claim: "Tokens are signed with RS256.", source: "Auth RFC v1.2", status: "Verified", verified: "May 1, 2024" },
  { claim: "Login latency drops by 40%.", source: "Migration brief", status: "Contradicted", verified: "—" },
  { claim: "All downstream services validate against JWKS.", source: "Platform wiki", status: "Verified", verified: "Apr 12, 2024" },
  { claim: "Tokens rotate every 24 hours.", source: "—", status: "Unsupported", verified: "—" },
  { claim: "Rollback drains every active token.", source: "Runbook", status: "Verified", verified: "Mar 3, 2024" },
];

const daysFromNow = (days: number) => fmtDate(new Date(Date.now() + days * 86400000));
const TASK_OWNERS = [
  { init: "AK", name: "Aki Kim" },
  { init: "LS", name: "Lena Shah" },
  { init: "MC", name: "Maya Chen" },
];
const TASK_DUES = [daysFromNow(3), daysFromNow(7), daysFromNow(14)];
const TASK_PRIS: [string, string][] = [
  ["High", "#B23A1E"],
  ["Medium", "#A05E1C"],
  ["Low", "#2C6E49"],
];


export function DocReviewFindingsPanel({
  findings = DEMO_FINDINGS,
  claims = DEMO_CLAIMS,
}: {
  findings?: Finding[];
  claims?: Claim[];
}) {
  const [tab, setTab] = useState<FactTab>("check");
  const [checking, setChecking] = useState(false);
  const [taskState, setTaskState] = useState<"idle" | "creating" | "done">("idle");
  const [ownerIx, setOwnerIx] = useState(0);
  const [dueIx, setDueIx] = useState(0);
  const [priIx, setPriIx] = useState(0);
  const [flashId, setFlashId] = useState<number | null>(null);

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

  const tallies: [number, string, string, React.ReactNode][] = [
    [supportedN, "Supported", "text-moss", <Check size={14} key="s" />],
    [contradictionN, "Contradiction", "text-espelette", <span key="c" className="font-bold">!</span>],
    [unsupportedN, "Unsupported", "text-clay", <span key="u" className="font-bold">!</span>],
  ];

  const pickBtn = "flex w-full items-center justify-between gap-2";

  return (
    <Card variant="flush" className="max-w-[440px]">
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

      {/* tallies */}
      <div className="flex items-stretch px-4 py-3.5 border-b border-ink/10">
        {tallies.map(([n, label, tone, icon], i) => (
          <Fragment key={label}>
            {i > 0 && <span className="mx-3 w-px bg-ink/12" />}
            <span className="flex-1">
              <span className={`flex items-center gap-1.5 text-[11.5px] font-medium ${tone}`}>{icon} {label}</span>
              <b className="mt-0.5 block font-display text-[20px] text-ink">{n}</b>
            </span>
          </Fragment>
        ))}
      </div>

      <div className="px-4 py-3">
        <Button block disabled={checking} onClick={runCheck}>
          <ShieldCheck size={14} /> {checking ? "Checking claims against verified facts…" : "Run fact check"}
        </Button>
      </div>

      {tab === "claims" ? (
        <div className="px-4 pb-4 space-y-2">
          {claims.map((f) => (
            <div key={f.claim} className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 ${f.status === "Verified" ? "text-moss" : "text-ink/25"}`}>
                <CheckCircle2 size={15} />
              </span>
              <span className="min-w-0 text-[13px] text-ink/85">
                {f.claim}
                <span className="mt-0.5 block text-[11px] text-ink/45">
                  {f.source} · {f.status}{f.verified !== "—" ? ` · ${f.verified}` : ""}
                </span>
              </span>
            </div>
          ))}
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
                <span className="text-[11px] text-ink/45">High confidence</span>
              </div>
              <div className="mt-2.5">
                <span className="block text-[10.5px] uppercase tracking-[0.06em] text-ink/45">In document</span>
                <mark
                  className={`mt-1 inline-block cursor-pointer rounded-[3px] bg-espelette/15 px-1 py-0.5 text-[12.5px] text-ink/85 transition-colors ${flashId === contra.id ? "ring-2 ring-espelette/50" : ""}`}
                  onClick={() => jump(contra.id)}
                >{contra.text}</mark>
              </div>
              <div className="mt-2.5">
                <span className="block text-[10.5px] uppercase tracking-[0.06em] text-ink/45">Verified evidence</span>
                <mark className="mt-1 inline-block rounded-[3px] bg-moss/15 px-1 py-0.5 text-[12.5px] text-ink/85">{evidence}</mark>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink/55">
                <FileText size={13} /> Auth RFC v1.2 · May 1, 2024
                <StatusChip status="canonical" />
                <Button variant="link" className="ml-auto" onClick={() => window.open("/knowledge?q=Auth%20RFC", "_blank")}>
                  Open source <ArrowRight size={11} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-[12.5px] text-ink/50">No contradictions found. Run a fact check to scan the latest claims.</div>
          )}

          {/* create-task row */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-ink/45">Owner</span>
              <Menu align="start" trigger={(
                <Button className={pickBtn}>
                  <span className="flex items-center gap-1.5">
                    <Avatar initials={TASK_OWNERS[ownerIx].init} />
                    {TASK_OWNERS[ownerIx].name}
                  </span>
                  <ChevronDown size={12} />
                </Button>
              )}>
                <MenuRadioGroup value={String(ownerIx)} onValueChange={(v) => setOwnerIx(Number(v))}>
                  {TASK_OWNERS.map((o, i) => <MenuRadioItem key={o.name} value={String(i)}>{o.name}</MenuRadioItem>)}
                </MenuRadioGroup>
              </Menu>
            </div>
            <div>
              <span className="text-[11px] text-ink/45">Due date</span>
              <Menu align="start" trigger={(
                <Button className={pickBtn}>
                  <span className="flex items-center gap-1.5"><Calendar size={13} /> {TASK_DUES[dueIx]}</span>
                  <ChevronDown size={12} />
                </Button>
              )}>
                <MenuRadioGroup value={String(dueIx)} onValueChange={(v) => setDueIx(Number(v))}>
                  {TASK_DUES.map((d, i) => <MenuRadioItem key={d} value={String(i)}>{d}</MenuRadioItem>)}
                </MenuRadioGroup>
              </Menu>
            </div>
            <div>
              <span className="text-[11px] text-ink/45">Priority</span>
              <Menu align="start" trigger={(
                <Button className={pickBtn}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: TASK_PRIS[priIx][1] }} /> {TASK_PRIS[priIx][0]}
                  </span>
                  <ChevronDown size={12} />
                </Button>
              )}>
                <MenuRadioGroup value={String(priIx)} onValueChange={(v) => setPriIx(Number(v))}>
                  {TASK_PRIS.map(([label], i) => <MenuRadioItem key={label} value={String(i)}>{label}</MenuRadioItem>)}
                </MenuRadioGroup>
              </Menu>
            </div>
            <div className="flex items-end">
              <Button variant="primary" block onClick={createTask} disabled={taskState !== "idle"}>
                {taskState === "done" ? "Task created ✓" : taskState === "creating" ? "Creating…" : "Create review task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
