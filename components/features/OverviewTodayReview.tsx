import { useState } from "react";
import { Clipboard, Check, Trash2 } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Avatar } from "../data-display/Avatar";
import { Pill } from "../data-display/Pill";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { ReadError } from "../feedback/ReadError";
import { ResultCount } from "../data-display/Pagination";
import { ShowRest } from "../data-display/ShowRest";
import { SkeletonLine, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { SortHeader, useSort, thPad, tdPad } from "../data-display/sortable";
import { ConfirmButton } from "../actions/ConfirmButton";
import { focusRing } from "../tokens/focusRing";
import { Truncate } from "../data-display/Truncate";
import { Scrollable } from "../data-display/Scrollable";
import { useResync } from "../actions/useResync";

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

/** Collapsed height of the table, in rows, and the expanded page size. */
const PREVIEW_ROWS = 4;
const EXPANDED_ROWS = 25;

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
  tasks: ReviewTask[] | null;
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
  tasks, loading = false, offline = false, onViewAll, onRetry,
  defaultExpanded = false, className = "",
}: OverviewTodayReviewProps) {
  const [rows, setRows] = useState<ReviewTask[]>(tasks ?? []);
  const [expanded, setExpanded] = useState(defaultExpanded);

  /* The queue was copied once, at mount. The overview polls, so every later
     answer — a task someone else closed, one that just opened — was fetched
     and then thrown away (C1).

     `touched` is the guard, and it is doing more work than usual: this card
     has no `actions`, so checking a box and "Clear done" mutate `rows` and
     nothing else. Those check-offs are unsaved by construction, and a poll
     landing underneath would silently un-check them, which is exactly the
     failure worth avoiding. So the card follows the server until the reader
     touches it, then stops. (That the check-off persists nowhere is a separate
     problem — this card needs `actions` before it can honestly claim to.)

     Compared on `tasks` itself, which is stable: `web/src/data/overview.ts`
     memoises the mapped page data on the raw query answer. It is deliberately
     NOT compared on `tasks ?? []`, which would mint a fresh array every render
     while the prop is undefined and resync forever. */
  const [touched, setTouched] = useState(false);
  useResync(tasks, (t) => setRows(t ?? []), { hold: touched });
  // Long task text clamps to two lines with an explicit expand toggle, so one
  // verbose task cannot unbalance the row against its sibling boxes (§15).
  const [textOpen, setTextOpen] = useState<Set<number>>(new Set());
  const toggleText = (id: number) =>
    setTextOpen((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const { sort, onSort, sorted } = useSort(rows, {
    task: (t) => t.text,
    assignee: (t) => t.who,
    kind: (t) => t.pillText,
    status: (t) => (t.done ? 1 : 0),
  });

  const toggle = (id: number) => {
    setTouched(true);
    setRows((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };
  const clearDone = () => { setTouched(true); setRows((ts) => ts.filter((t) => !t.done)); };

  /* Expanding renders one page inside a capped scroll region rather than
     laying out a 400-row inbox and pushing the page below it off screen. */
  const visible = expanded ? sorted.slice(0, EXPANDED_ROWS) : sorted.slice(0, PREVIEW_ROWS);
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
        !loading && !offline && hidden > 0
          ? <ShowRest expanded={expanded} total={rows.length} onToggle={viewAll} />
          : undefined
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
        <div className="px-4 pb-4"><ReadError onRetry={onRetry} /></div>
      ) : (
        <>
        {/* Result/stat strip above the list it describes (§13). The count and
            the "open" tally used to be two bespoke spans in a bespoke bar. */}
        {rows.length > 0 && (
          <ResultCount
            from={1}
            to={visible.length}
            total={rows.length}
            noun="tasks"
            note={`${openCount.toLocaleString("en-US")} open`}
          />
        )}
        <Scrollable axis="both" style={{ maxHeight: visible.length > 8 ? 440 : undefined }}>
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
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5"><TaskCheck done={!!t.done} onToggle={() => toggle(t.id)} /></span>
                      {t.text.length > 140 ? (
                        <button
                          type="button"
                          onClick={() => toggleText(t.id)}
                          aria-expanded={textOpen.has(t.id)}
                          className={`min-w-0 flex-1 text-left text-[13px] ${t.done ? "text-ink/55 line-through" : "text-ink/85"} ${focusRing}`}
                        >
                          {textOpen.has(t.id)
                            ? <span className="break-words">{t.text}</span>
                            : <Truncate lines={2}>{t.text}</Truncate>}
                          {/* Names what it opens, so it cannot be mistaken for
                              the list-level <ShowRest> in the strip above. */}
                          <span className="mt-0.5 block font-term text-[11px] text-biscay-2">
                            {textOpen.has(t.id) ? "Clamp this task" : "Read the full task"}
                          </span>
                        </button>
                      ) : (
                        <span className={`min-w-0 flex-1 break-words text-[13px] ${t.done ? "text-ink/55 line-through" : "text-ink/85"}`}>
                          {t.text}
                        </span>
                      )}
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
        </Scrollable>
        </>
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
        </div>
      )}
    </Card>
  );
}
