import { Fragment, useMemo, useState } from "react";
import { ClipboardCheck, ShieldCheck, X } from "lucide-react";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonTable } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { PagerBar, ResultCount, usePaged } from "../data-display/Pagination";
import { Truncate } from "../data-display/Truncate";
import { FieldError } from "../feedback/ErrorMessage";
import { CreateReviewTaskButton } from "../actions/RepeatedActions";
import { why } from "../actions/useWrite";
import { fmtDate, type DateInput } from "../tokens/format";

/* Facts verification audit — a client-side audit derived entirely from the
   already-loaded facts: it lists every Verified fact oldest-first and flags any
   verified more than 60 days ago as a stale candidate, offering a one-click
   Create review task. Ages are anchored to the newest verification on record so
   mixed seed/live data never yields negative ages. Composes Card + Table + Chip
   + Button. */

const STALE_AFTER_DAYS = 60;

const td = `${tdPad} text-[13px] text-ink/75`;

export type Fact = {
  id: number;
  claim: string;
  source: string;
  owner: string;
  /* XA-25: this union used to advertise "Needs evidence", a spelling that
     appears in no chip table and that FactsPage's FACT_STATUS has to alias
     onto `unsupported`. The suggestions are now the console's own status
     vocabulary (data-display/Chip.tsx), which is what the chips actually
     render; the trailing `string` stays because a ledger may spell a status
     however it likes and `factStatusKey` below is what normalises it. */
  status: "verified" | "unsupported" | "draft" | "retired" | "contradiction" | string;
  verified?: DateInput | null;
};

/** A ledger status reduced to one comparable token: case, spacing and
    underscores are the API's business, not the console's. Every status test in
    the fact views goes through this, because the audit used to compare against
    the literal English string "Verified" and quietly dropped every row a
    workspace spelled "verified" or "VERIFIED" (P-FA-1). */
export const factStatusKey = (status: string) => status.trim().toLowerCase().replace(/[\s_]+/g, "-");

/** Is this claim verified, however its ledger spells the word? */
export const isVerifiedFact = (f: Pick<Fact, "status">) => factStatusKey(f.status) === "verified";

type TaskState = "idle" | "creating" | "done" | "error";

function toDate(input: DateInput): Date { return input instanceof Date ? input : new Date(input); }

function verifiedAgeDays(verified: DateInput | null | undefined, anchor: number): number | null {
  if (verified == null) return null;
  const d = toDate(verified);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((anchor - d.getTime()) / 86_400_000);
}

export type FactsVerificationAuditProps = {
  /** The facts to audit. Required: the panel never invents claims. */
  facts: Fact[];
  /** Open a re-verification task on a stale fact. May throw; the row shows the
      message in place of the button. Omitted = the local echo below. */
  onCreateReviewTask?: (fact: Fact) => void | Promise<void>;
  /** Render the surrounding close affordance (the panel is toggled open). */
  onClose?: () => void;
  /** Render a content-shaped skeleton while the audit is computing. */
  loading?: boolean;
  className?: string;
};

export function FactsVerificationAudit({
  facts, onCreateReviewTask, onClose, loading = false, className = "",
}: FactsVerificationAuditProps) {
  const [taskState, setTaskState] = useState<Record<number, TaskState>>({});
  const [tasks, setTasks] = useState<Record<number, string>>({});
  const [failed, setFailed] = useState<Record<number, string>>({});

  const auditRows = useMemo(() => {
    const verified = facts.filter(isVerifiedFact);
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

  /* A mature knowledge base verifies thousands of facts; the audit pages
     instead of rendering every one into the panel (CONVENTIONS §13). */
  const pager = usePaged(sorted, 10);

  const createReviewTask = async (f: Fact) => {
    setTaskState((s) => ({ ...s, [f.id]: "creating" }));
    setFailed((e) => { const n = { ...e }; delete n[f.id]; return n; });
    try {
      // No handler: the button still has to leave something behind on screen,
      // so the new task lands as its own row (§2) exactly as before.
      if (onCreateReviewTask) await onCreateReviewTask(f);
      setTaskState((s) => ({ ...s, [f.id]: "done" }));
      setTasks((t) => ({ ...t, [f.id]: `TASK-${1200 + Object.keys(t).length + 1}` }));
    } catch (err) {
      setTaskState((s) => ({ ...s, [f.id]: "error" }));
      setFailed((e) => ({ ...e, [f.id]: why(err, "Couldn’t reach Mari.") }));
    }
  };

  /* Prose, not a number: this used to restate `staleCount`, which the strip
     below already carries as its note (§13 count rule). */
  const hint = auditRows.length === 0
    ? undefined
    : "Anything verified more than 60 days ago is a stale candidate.";

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
        <>
        <ResultCount from={pager.from} to={pager.to} total={pager.total} noun="verified facts"
          note={`${staleCount.toLocaleString("en-US")} stale`} />
        <Scrollable>
          {/* table-fixed + a floor wide enough that "Create review task"
              never has to wrap: the widths are binding, so the claim column
              gives up space rather than the action column collapsing. */}
          <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: 820 }}>
            <colgroup>
              {/* Verified is 14%, not 13%: at the 820px floor that column is
                  the only one holding two no-wrap lines ("May 30, 2026" over
                  "148d ago"), and 13% left it 3px short, so the date spilled
                  through the cell border. The width comes off Claim, which
                  truncates anyway. */}
              <col style={{ width: "30%" }} /><col style={{ width: "12%" }} /><col style={{ width: "14%" }} />
              <col style={{ width: "18%" }} /><col style={{ width: "26%" }} />
            </colgroup>
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
              {pager.pageRows.map(({ fact, age }) => {
                const stale = age != null && age > STALE_AFTER_DAYS;
                const state = taskState[fact.id] ?? "idle";
                return (
                  <Fragment key={fact.id}>
                    <tr className="border-b border-ink/[0.06]">
                      <td className={`${td} align-top`}>
                        <Truncate lines={2} className="text-[13px] font-medium text-ink">{fact.claim}</Truncate>
                        <Truncate className="mt-0.5 font-term text-[11px] text-ink/65">{fact.source}</Truncate>
                      </td>
                      <td className={`${td} align-top`}><Truncate>{fact.owner}</Truncate></td>
                      <td className={`${td} whitespace-nowrap text-center align-top font-term text-[12px] text-ink/70`}>
                        {fact.verified ? fmtDate(fact.verified) : "Not recorded"}
                        {age != null && <span className="block text-ink/65">{age}d ago</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap align-top`}>
                        {/* "Stale", not "Stale candidate": the longer label
                            did not fit the column and rendered as an
                            ellipsised chip. The card hint carries the full
                            meaning. */}
                        <Chip label={stale ? "Stale" : "Fresh"} tone={stale ? "attention" : "ok"} dot />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right align-top`}>
                        {stale && (
                          <div className="flex flex-col items-end gap-1">
                            {/* XA-23: this was the table copy of "Create review
                                task", drawn with no icon and a done word
                                ("Task created") the drawers spelled differently.
                                One component owns label, glyph and both states. */}
                            <CreateReviewTaskButton
                              compact
                              state={state === "done" ? "done" : state === "creating" ? "busy" : "idle"}
                              onClick={() => void createReviewTask(fact)}
                            />
                            {/* XA-02 keeps <FieldError> for exactly this case: a
                                <WriteError> banner inside an action cell would
                                blow the row height apart and shove every other
                                column out of line (§3). The message still sits
                                beside the control that failed, and the button
                                stays clickable so the reader can retry. */}
                            {state === "error" && <FieldError>{failed[fact.id] ?? "Couldn’t reach Mari."}</FieldError>}
                          </div>
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
        </Scrollable>
        {pager.paged && <PagerBar page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} />}
        </>
      )}
    </Card>
  );
}
