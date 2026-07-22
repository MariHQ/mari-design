import { useState } from "react";
import { Clipboard, Check, Trash2, ChevronRight } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Avatar } from "../data-display/Avatar";
import { Pill } from "../data-display/Pill";
import { CountChip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { focusRing } from "../tokens/focusRing";

/* Overview — Today's review (task inbox) ──────────────────────────────────
   A short task-inbox card showing up to four open/near-term tasks with an
   assignee and a kind pill. Check off tasks inline, clear completed ones, and
   jump to the full Tasks page. Composes Card + IconRing + Avatar + Pill +
   CountChip, with local TaskCheck/TaskRow sub-components.
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
];

function TaskCheck({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? "Mark undone" : "Mark done"}
      className={[
        "grid place-items-center w-[18px] h-[18px] shrink-0 rounded-full border transition-colors",
        done ? "border-moss bg-moss text-white" : "border-ink/30 text-transparent hover:border-ink/50",
        focusRing,
      ].join(" ")}
    >
      <Check size={11} strokeWidth={2.6} />
    </button>
  );
}

function TaskRow({ task, onToggle }: { task: ReviewTask; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <TaskCheck done={!!task.done} onToggle={onToggle} />
      <span className={`min-w-0 flex-1 truncate text-[13px] ${task.done ? "text-ink/40 line-through" : "text-ink/85"}`}>
        {task.text}
      </span>
      <Avatar initials={task.who} />
      <Pill kind={task.pill} text={task.pillText} />
    </div>
  );
}

export type OverviewTodayReviewProps = {
  tasks?: ReviewTask[] | null;
  loading?: boolean;
  offline?: boolean;
  onViewAll?: () => void;
  className?: string;
};

export function OverviewTodayReview({
  tasks = DEMO_TASKS, loading = false, offline = false, onViewAll, className = "",
}: OverviewTodayReviewProps) {
  const [rows, setRows] = useState<ReviewTask[]>(tasks ?? []);

  const toggle = (id: number) =>
    setRows((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const clearDone = () => setRows((ts) => ts.filter((t) => !t.done));

  const visible = rows.slice(0, 4);
  const anyDone = rows.some((t) => t.done);
  const openCount = rows.filter((t) => !t.done).length;

  return (
    <Card
      className={className}
      icon={<IconRing><Clipboard size={16} /></IconRing>}
      title="Today's review"
    >
      {loading ? (
        <div className="grid place-items-center min-h-[120px]"><Spinner size="sm" /></div>
      ) : offline ? (
        <EmptyState>API offline — tasks unavailable.</EmptyState>
      ) : (
        <div className="divide-y divide-ink/10">
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      )}

      {!loading && !offline && (
        <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
          {anyDone ? (
            <button
              type="button"
              onClick={clearDone}
              className={`inline-flex items-center gap-1.5 font-term text-[11.5px] text-espelette hover:underline underline-offset-2 ${focusRing}`}
            >
              <Trash2 size={13} /> Clear done
            </button>
          ) : (
            <span className="font-term text-[11.5px] text-ink/55">{openCount} open</span>
          )}
          <button
            type="button"
            onClick={onViewAll}
            className={`inline-flex items-center gap-1.5 text-[12.5px] text-biscay-2 hover:text-ink ${focusRing}`}
          >
            View all tasks <CountChip count={rows.length} /> <ChevronRight size={15} />
          </button>
        </div>
      )}
    </Card>
  );
}
