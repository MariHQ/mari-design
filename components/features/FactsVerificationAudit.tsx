import { Fragment, useMemo, useState } from "react";
import { ClipboardCheck, ShieldCheck, X } from "lucide-react";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonTable } from "../data-display/Skeleton";
import { fmtDate, type DateInput } from "../tokens/format";

/* Facts verification audit — a client-side audit derived entirely from the
   already-loaded facts: it lists every Verified fact oldest-first and flags any
   verified more than 60 days ago as a stale candidate, offering a one-click
   Create review task. Ages are anchored to the newest verification on record so
   mixed seed/live data never yields negative ages. Composes Card + Table + Chip
   + Button. Renders standalone with baked facts. */

const STALE_AFTER_DAYS = 60;

const td = `${tdPad} text-[13px] text-ink/75`;

export type Fact = {
  id: number;
  claim: string;
  source: string;
  owner: string;
  status: "Verified" | "Needs evidence" | "Draft" | string;
  verified?: DateInput | null;
};

const DEMO_FACTS: Fact[] = [
  { id: 1, claim: "Free tier includes 3 connected sources.", source: "Pricing page", owner: "Aki K.", status: "Verified", verified: "2026-07-18" },
  { id: 2, claim: "SSO is available on the Team plan and above.", source: "Sales deck", owner: "Dana R.", status: "Verified", verified: "2026-07-02" },
  { id: 3, claim: "Data is encrypted at rest with AES-256.", source: "Security whitepaper", owner: "Priya S.", status: "Verified", verified: "2026-05-30" },
  { id: 4, claim: "The scheduler polls twice a minute.", source: "Flows docs", owner: "Aki K.", status: "Verified", verified: "2026-04-11" },
  { id: 5, claim: "Uploaded PDFs are OCR'd on ingest.", source: "Sources docs", owner: "Dana R.", status: "Verified", verified: "2026-02-20" },
  { id: 6, claim: "Beta regions include eu-west and us-east.", source: "Roadmap", owner: "Priya S.", status: "Draft", verified: null },
  { id: 7, claim: "Support SLA is 1 business day.", source: "Support page", owner: "Aki K.", status: "Needs evidence", verified: null },
];

type TaskState = "idle" | "creating" | "done" | "error";

function toDate(input: DateInput): Date { return input instanceof Date ? input : new Date(input); }

function verifiedAgeDays(verified: DateInput | null | undefined, anchor: number): number | null {
  if (verified == null) return null;
  const d = toDate(verified);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((anchor - d.getTime()) / 86_400_000);
}

export type FactsVerificationAuditProps = {
  facts?: Fact[];
  /** Render the surrounding close affordance (the panel is toggled open). */
  onClose?: () => void;
  /** Render a content-shaped skeleton while the audit is computing. */
  loading?: boolean;
  className?: string;
};

export function FactsVerificationAudit({ facts = DEMO_FACTS, onClose, loading = false, className = "" }: FactsVerificationAuditProps) {
  const [taskState, setTaskState] = useState<Record<number, TaskState>>({});
  const [tasks, setTasks] = useState<Record<number, string>>({});

  const auditRows = useMemo(() => {
    const verified = facts.filter((f) => f.status === "Verified");
    const anchor = verified.reduce((max, f) => {
      const t = f.verified != null ? toDate(f.verified).getTime() : NaN;
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, Number.NEGATIVE_INFINITY);
    const anchorMs = Number.isFinite(anchor) ? anchor : Date.now();
    return verified
      .map((f) => ({ fact: f, age: verifiedAgeDays(f.verified, anchorMs) }))
      .sort((a, b) => (b.age ?? -1) - (a.age ?? -1));
  }, [facts]);

  const { sort, onSort, sorted } = useSort(auditRows, {
    claim: (r) => r.fact.claim,
    owner: (r) => r.fact.owner,
    verified: (r) => (r.fact.verified ? new Date(String(r.fact.verified)).getTime() || 0 : 0),
    status: (r) => (r.age != null && r.age > STALE_AFTER_DAYS ? "stale" : "fresh"),
  });

  const staleCount = auditRows.filter((r) => r.age != null && r.age > STALE_AFTER_DAYS).length;

  const createReviewTask = (f: Fact) => {
    setTaskState((s) => ({ ...s, [f.id]: "creating" }));
    // Emulate the createTask mutation resolving. The button has to leave
    // something behind on screen, so the new task lands as its own row (§2).
    setTaskState((s) => ({ ...s, [f.id]: "done" }));
    setTasks((t) => ({ ...t, [f.id]: `TASK-${1200 + Object.keys(t).length + 1}` }));
  };

  const hint =
    auditRows.length === 0
      ? undefined
      : staleCount === 0
        ? "None verified more than 60 days ago."
        : `${staleCount} verified more than 60 days ago: stale candidate${staleCount === 1 ? "" : "s"}.`;

  if (loading) {
    return (
      <Card
        className={className}
        icon={<ShieldCheck size={17} className="text-moss" />}
        title="Verification audit"
        variant="flush"
      >
        <SkeletonTable rows={4} cols={4} />
      </Card>
    );
  }

  return (
    <Card
      className={className}
      icon={<ShieldCheck size={17} className="text-moss" />}
      title="Verification audit"
      hint={hint}
      actions={onClose && (
        <Button icon variant="link" aria-label="Close audit" onClick={onClose}><X size={16} /></Button>
      )}
      variant="flush"
    >
      {auditRows.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={24} />} title="Nothing to audit">No verified facts to audit yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <SortHeader label="Claim" sortKey="claim" sort={sort} onSort={onSort} />
                <SortHeader label="Owner" sortKey="owner" sort={sort} onSort={onSort} />
                <SortHeader label="Verified" sortKey="verified" sort={sort} onSort={onSort} align="center" />
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                <SortHeader label="Review task" sortable={false} align="right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ fact, age }) => {
                const stale = age != null && age > STALE_AFTER_DAYS;
                const state = taskState[fact.id] ?? "idle";
                return (
                  <Fragment key={fact.id}>
                    <tr className="border-b border-ink/[0.06]">
                      <td className={`${td} max-w-[320px] align-top`}>
                        <b className="block text-[13px] font-medium text-ink">{fact.claim}</b>
                        <div className="mt-0.5 truncate font-term text-[11px] text-ink/65">{fact.source}</div>
                      </td>
                      <td className={`${td} max-w-[160px] truncate align-top`}>{fact.owner}</td>
                      <td className={`${td} whitespace-nowrap text-center align-top font-term text-[12px] text-ink/70`}>
                        {fact.verified ? fmtDate(fact.verified) : "Not recorded"}
                        {age != null && <span className="block text-ink/65">{age}d ago</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap align-top`}>
                        <Chip label={stale ? "Stale candidate" : "Fresh"} tone={stale ? "attention" : "ok"} dot />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right align-top`}>
                        {stale && (
                          state === "error" ? (
                            <span className="font-term text-[11.5px] text-espelette">Couldn’t reach Mari.</span>
                          ) : (
                            <Button
                              variant="primary" compact
                              disabled={state === "creating" || state === "done"}
                              onClick={() => createReviewTask(fact)}
                            >
                              {state === "done" ? "Task created" : state === "creating" ? "Creating" : "Create review task"}
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                    {tasks[fact.id] && (
                      <tr className="border-b border-ink/[0.06] bg-moss/[0.05]">
                        <td className={`${td} font-term text-[11.5px] text-moss`} colSpan={5}>
                          <span className="inline-flex items-center gap-1.5">
                            <ClipboardCheck size={13} />
                            {tasks[fact.id]} opened for {fact.owner}: re-verify “{fact.claim.slice(0, 48)}{fact.claim.length > 48 ? "…" : ""}”
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
