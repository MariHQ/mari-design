import { useState } from "react";
import { Clipboard, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Avatar } from "../data-display/Avatar";
import { Pill } from "../data-display/Pill";
import { Chip, CountChip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { SkeletonLine, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { SortHeader, useSort, thPad, tdPad } from "../data-display/sortable";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { focusRing } from "../tokens/focusRing";

/* Overview — Today's review (task inbox) ──────────────────────────────────
   The open/near-term task inbox, rendered as a real table so it spaces and
   sorts like every other table in the console (CONVENTIONS.md §3): SortHeader
   column headers, uniform thPad/tdPad, status chip last. Check tasks off
   inline, expand to the full list, and clear completed tasks through a
   two-step <ConfirmButton> anchored bottom-left (§2).
   Source: web/src/pages/Overview.tsx (.card.review block). */

export type ReviewTask = {
  id: number;
  text: string;
  who: string;
  pill: string;
  pillText: string;
  done?: boolean;
};

const DEMO_TASKS: ReviewTask[] = [
  { id: 1, text: "Verify the new proration rule in the billing runbook", who: "DR", pill: "factcheck", pillText: "Fact check" },
  { id: 2, text: "Approve the SSO onboarding guide for publish", who: "MG", pill: "approval", pillText: "Approval" },
  { id: 3, text: "Retire two stale screenshots in auth/README", who: "PK", pill: "stale", pillText: "Stale", done: true },
  { id: 4, text: "Review the incident escalation ladder", who: "SL", pill: "needs-review", pillText: "Needs review" },
  { id: 5, text: "Tag the pricing FAQ as canonical", who: "DR", pill: "canonical", pillText: "Canonical" },
  { id: 6, text: "Link the on-call guide to the escalation ladder", who: "MG", pill: "needs-review", pillText: "Needs review" },
  { id: 7, text: "Confirm the Okta walkthrough screenshots are current", who: "PK", pill: "factcheck", pillText: "Fact check" },
];

/** Collapsed height of the table, in rows. */
const PREVIEW_ROWS = 4;

function TaskCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? "Mark undone" : "Mark done"}
      className={[
        // Square marker, not a radio-style circle (CONVENTIONS.md §6).
        "grid place-items-center w-[18px] h-[18px] shrink-0 rounded-[3px] border transition-colors",
        done ? "border-moss bg-moss text-white" : "border-ink/35 text-transparent hover:border-ink/55",
        focusRing,
      ].join(" ")}
    >
      <Check size={11} strokeWidth={2.6} />
    </button>
  );
}

export type OverviewTodayReviewProps = {
  tasks?: ReviewTask[] | null;
  loading?: boolean;
  offline?: boolean;
  onViewAll?: () => void;
  /** Wires the error banner's Retry control. Omitted = no button. */
  onRetry?: () => void;
  /** Start with the full task list showing. */
  defaultExpanded?: boolean;
  className?: string;
};

export function OverviewTodayReview({
  tasks = DEMO_TASKS, loading = false, offline = false, onViewAll, onRetry,
  defaultExpanded = false, className = "",
}: OverviewTodayReviewProps) {
  const [rows, setRows] = useState<ReviewTask[]>(tasks ?? []);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { sort, onSort, sorted } = useSort(rows, {
    task: (t) => t.text,
    assignee: (t) => t.who,
    kind: (t) => t.pillText,
    status: (t) => (t.done ? 1 : 0),
  });

  const toggle = (id: number) =>
    setRows((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const clearDone = () => setRows((ts) => ts.filter((t) => !t.done));

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_ROWS);
  const hidden = Math.max(0, rows.length - PREVIEW_ROWS);
  const anyDone = rows.some((t) => t.done);
  const doneCount = rows.filter((t) => t.done).length;
  const openCount = rows.length - doneCount;

  const viewAll = () => {
    setExpanded((v) => !v);
    onViewAll?.();
  };

  return (
    <Card
      className={className}
      variant="flush"
      icon={<IconRing><Clipboard size={16} /></IconRing>}
      title="Today's review"
      /* A table's action button lives in the top right (§3). */
      actions={
        !loading && !offline && hidden > 0 ? (
          <Button compact onClick={viewAll}>
            {expanded ? <><ChevronUp size={14} /> Show fewer</> : <><ChevronDown size={14} /> View all tasks</>}
            <CountChip count={rows.length} />
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="divide-y divide-ink/10 px-4 pb-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-3">
              <SkeletonCircle size={18} />
              <span className="flex-1"><SkeletonLine w={["82%", "68%", "76%", "60%"][i]} h={11} /></span>
              <SkeletonCircle size={22} />
              <SkeletonChip w={68} />
            </div>
          ))}
        </div>
      ) : offline ? (
        /* §8: failure copy comes from the catalog, never a bespoke string. */
        <div className="px-4 pb-4"><ErrorMessage id="server.unavailable" onAction={onRetry} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {/* w-full + max-w-0 lets the task column absorb the leftover
                    width and wrap, instead of stretching the table past the
                    card and pushing the other three columns out of view. The
                    min-w floor keeps it from collapsing to a one-letter column
                    when the card itself is narrow. */}
                <SortHeader label="Task" sortKey="task" sort={sort} onSort={onSort} className="w-full min-w-[200px] max-w-0" />
                <SortHeader label="Assignee" sortKey="assignee" sort={sort} onSort={onSort} align="center" className="whitespace-nowrap" />
                <SortHeader label="Kind" sortKey="kind" sort={sort} onSort={onSort} align="center" className="whitespace-nowrap" />
                {/* No clickable item in the row past the checkbox, so status is last (§3). */}
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} align="right" className="whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className="border-b border-ink/10 last:border-0">
                  <td className={`${tdPad} w-full min-w-[200px] max-w-0`}>
                    <div className="flex items-center gap-2.5">
                      <TaskCheck done={!!t.done} onToggle={() => toggle(t.id)} />
                      <span className={`min-w-0 flex-1 break-words text-[13px] ${t.done ? "text-ink/55 line-through" : "text-ink/85"}`}>
                        {t.text}
                      </span>
                    </div>
                  </td>
                  <td className={`${tdPad} text-center align-middle whitespace-nowrap`}>
                    <span className="inline-flex"><Avatar initials={t.who} /></span>
                  </td>
                  <td className={`${tdPad} text-center align-middle whitespace-nowrap`}>
                    <Pill kind={t.pill} text={t.pillText} />
                  </td>
                  <td className={`${tdPad} text-right align-middle whitespace-nowrap`}>
                    <Chip label={t.done ? "Done" : "Open"} tone={t.done ? "ok" : "neutral"} dot />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td className={`${tdPad} text-[13px] text-ink/70`} colSpan={4}>
                    Nothing to review. Every task is cleared.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !offline && (
        /* Bottom-left actions, on the same left plumb line as the first
           column's text (px-4 = thPad/tdPad's horizontal padding). */
        <div className={`flex flex-wrap items-center gap-2 border-t border-ink/10 ${thPad}`}>
          <ConfirmButton
            compact
            confirmLabel="Really clear?"
            onConfirm={clearDone}
            disabled={!anyDone}
          >
            <Trash2 size={13} /> {doneCount > 0 ? `Clear ${doneCount} done` : "Clear done"}
          </ConfirmButton>
          <span className="font-term text-[11.5px] text-ink/65">{openCount} open</span>
        </div>
      )}
    </Card>
  );
}
