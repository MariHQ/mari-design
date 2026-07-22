import { useState, type ReactNode } from "react";
import { Plus, Check, Clipboard, CheckCircle2, Trash2, CalendarClock } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { PageHeader, Card, Button, Input, Select, Avatar, AvatarGroup, Pill, IconRing, Badge, Chip, Stat } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { ConfirmButton } from "../actions/ConfirmButton";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { fmtDate } from "../tokens/format";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_DOC_TITLE, LONG_URL, UNBREAKABLE, LONG_WORD,
  HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS,
} from "./stress";

/* Tasks inbox (pages/tasks.md). The standalone / expanded form of the Overview
   "Today's review" card: a composer at the top, then Open and Done columns of
   task rows (check toggle + strikethrough title + assignee + kind pill). States
   walk content variants (mixed / open-only / all-done / single / many),
   overdue and assigned-to-me filters, the composer-open and saving lifecycle,
   and the loading / offline / empty edges. */

const STATES = [
  { id: "default", label: "Default · mixed" },
  { id: "open-only", label: "All open" },
  { id: "all-done", label: "All caught up" },
  { id: "single", label: "Single task" },
  { id: "many", label: "Many tasks" },
  { id: "overdue", label: "Overdue" },
  { id: "assigned-to-me", label: "Assigned to me" },
  { id: "composer-open", label: "Composer · drafting" },
  { id: "saving", label: "Adding task…" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No tasks" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

type Task = {
  id: number;
  title: string;
  who: string;
  kind: string;
  kindLabel: string;
  done: boolean;
  due?: string;
  overdue?: boolean;
};

const SEED: Task[] = [
  { id: 1, title: "Verify the new proration rule in the billing runbook", who: "DR", kind: "factcheck", kindLabel: "Fact check", done: false },
  { id: 2, title: "Approve the SSO onboarding guide for publish", who: "MG", kind: "approval", kindLabel: "Approval", done: false },
  { id: 3, title: "Review the incident escalation ladder", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false },
  { id: 4, title: "Retire two stale screenshots in auth/README", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 5, title: "Tag the pricing FAQ as canonical", who: "DR", kind: "canonical", kindLabel: "Canonical", done: true },
];

/* Due dates always carry a year and go through fmtDate (§5): "Yesterday" and
   "Fri" are ambiguous the moment a board spans two years. */
const OVERDUE: Task[] = [
  { id: 11, title: "Re-verify the SLA uptime fact: source expired", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false, due: fmtDate("2026-07-18"), overdue: true },
  { id: 12, title: "Approve the refund policy update", who: "MG", kind: "approval", kindLabel: "Approval", done: false, due: fmtDate("2026-07-20"), overdue: true },
  { id: 13, title: "Review the on-call rotation doc", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false, due: fmtDate("2026-07-21") },
  { id: 14, title: "Retire the deprecated v1 export guide", who: "PK", kind: "stale", kindLabel: "Stale", done: true, due: fmtDate("2026-07-12") },
];

const MINE: Task[] = [
  { id: 21, title: "Fact-check the new webhook retry cadence", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false, due: fmtDate("2026-07-22") },
  { id: 22, title: "Draft an answer for 'How do I rotate my API key?'", who: "MM", kind: "needs-review", kindLabel: "Needs review", done: false, due: fmtDate("2026-07-24") },
  { id: 23, title: "Approve the billing proration runbook", who: "MM", kind: "approval", kindLabel: "Approval", done: true },
];

const MANY: Task[] = [
  ...SEED,
  { id: 31, title: "Reconcile the pricing table against Stripe", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false },
  { id: 32, title: "Publish the SSO enforcement announcement", who: "MG", kind: "approval", kindLabel: "Approval", done: false },
  { id: 33, title: "Prune 6 stale onboarding screenshots", who: "PK", kind: "stale", kindLabel: "Stale", done: false },
  { id: 34, title: "Verify JWKS rotation cadence in the auth doc", who: "AK", kind: "factcheck", kindLabel: "Fact check", done: false },
  { id: 35, title: "Review the data-retention policy update", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false },
  { id: 36, title: "Tag the incident postmortem as canonical", who: "DR", kind: "canonical", kindLabel: "Canonical", done: true },
  { id: 37, title: "Retire the legacy billing FAQ", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 38, title: "Approve the support macros refresh", who: "MG", kind: "approval", kindLabel: "Approval", done: true },
];

const OVERFLOW_TASKS: Task[] = [
  { id: 41, title: LONG_TITLE, who: "AW", kind: "factcheck", kindLabel: "Fact check: reconcile against the last four incident retrospectives", done: false, due: "Due by the end of the third fiscal quarter, 2026" },
  { id: 42, title: `Approve ${LONG_DOC_TITLE} for publish across every connected workspace and region`, who: "DR", kind: "approval", kindLabel: "Needs a second approver", done: false, due: "Before the platform-wide freeze on Jul 23, 2026" },
  { id: 43, title: LONG_PARAGRAPH, who: "MC", kind: "needs-review", kindLabel: "Needs review", done: false },
  { id: 44, title: "Retire the deprecated single-sign-on migration screenshots scattered across the authentication README and the onboarding guide", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 45, title: "Tag the consolidated quarterly platform reliability runbook as the canonical source of truth", who: "SL", kind: "canonical", kindLabel: "Canonical", done: true },
];

const STRESS_TASKS: Task[] = [
  { id: 51, title: UNBREAKABLE, who: "ABCDEFGH", kind: "factcheck", kindLabel: LONG_WORD, done: false, due: HUGE_NUMBER_STR },
  { id: 52, title: LONG_WORD, who: "日本語ABC", kind: "approval", kindLabel: MIXED_SCRIPT, done: false, due: MIXED_SCRIPT },
  { id: 53, title: LONG_URL, who: "MM", kind: "stale", kindLabel: "stale", done: false, due: HUGE_NUMBER_STR },
  { id: 54, title: `${MIXED_SCRIPT} ${UNBREAKABLE}`, who: MANY_INITIALS.slice(0, 4).join(""), kind: "canonical", kindLabel: HUGE_NUMBER_STR, done: true },
];

function seedFor(state: string): Task[] {
  switch (state) {
    case "overflow": return OVERFLOW_TASKS;
    case "stress": return STRESS_TASKS;
    case "open-only": return SEED.map((t) => ({ ...t, done: false }));
    case "all-done": return SEED.map((t) => ({ ...t, done: true }));
    case "single": return SEED.slice(0, 1);
    case "many": return MANY;
    case "overdue": return OVERDUE;
    case "assigned-to-me": return MINE;
    default: return SEED;
  }
}

/* One row = title + a meta cluster. The title takes the slack (min-w-0 so a
   long one wraps instead of collapsing to one word per line) and the meta
   cluster wraps under it rather than shoving chips outside the card. The done
   marker is a SQUARE checkbox: a circle reads as "pick one" (§6). */
function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: number) => void }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 py-2.5">
      <button
        type="button"
        aria-label={task.done ? "Mark not done" : "Mark done"}
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border transition-colors ${
          task.done ? "border-moss bg-moss text-white" : "border-ink/30 text-transparent hover:border-ink/50"
        }`}
      >
        <Check size={12} />
      </button>
      <span
        className={`min-w-[9rem] flex-1 text-[13.5px] [overflow-wrap:anywhere] ${
          task.done ? "text-ink/70 line-through" : "text-ink"
        }`}
      >
        {task.title}
      </span>
      <span className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
        {task.due && !task.done && (
          <Chip
            label={<span className="block max-w-[190px] truncate">{task.due}</span>}
            tone={task.overdue ? "blocked" : "neutral"}
            icon={<CalendarClock size={12} />}
          />
        )}
        <Avatar initials={task.who.slice(0, 2)} />
        <span className="max-w-[220px] truncate"><Pill kind={task.kind} text={task.kindLabel} /></span>
      </span>
    </div>
  );
}

function Column({
  title, icon, tone, count, action, children,
}: {
  title: string;
  icon: ReactNode;
  tone: "ink" | "ok";
  count: number;
  action?: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2.5">
        <IconRing tone={tone}>{icon}</IconRing>
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <Badge tone="neutral" label={String(count)} />
        {action && <span className="ml-auto">{action}</span>}
      </div>
      <div className="divide-y divide-ink/10">{children}</div>
    </Card>
  );
}

/* Inline strip exercising chip-row / avatar-stack / huge-number / mixed-script
   overflow that the two-column task list can't show on its own. */
function StressStrip({ pathological }: { pathological: boolean }) {
  const tags = pathological ? MANY_TAGS : MANY_TAGS.slice(0, 10);
  const people = (pathological ? MANY_INITIALS : MANY_INITIALS.slice(0, 8)).map((i) => ({ initials: i }));
  return (
    <Card className="space-y-3">
      <div className="min-w-0 text-[13.5px] font-semibold text-ink break-words">
        {pathological ? MIXED_SCRIPT : "Every reviewer, tag, and label on this task: wrapped rather than clipped"}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => <Chip key={t} label={t} tone="neutral" />)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <AvatarGroup people={people} max={6} />
        <Stat value={pathological ? HUGE_NUMBER_STR : "482,913"} label="times reopened" tone="info" />
      </div>
    </Card>
  );
}

function Body({ state }: { state: string }) {
  const composerOpen = state === "composer-open";
  const saving = state === "saving";
  const [tasks, setTasks] = useState<Task[]>(() => seedFor(state));
  const [draft, setDraft] = useState(
    composerOpen ? "Re-verify the enterprise SLA uptime fact against the status page" : "",
  );

  const toggle = (id: number) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setTasks((ts) => [...ts, { id: Date.now(), title, who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false }]);
    setDraft("");
  };
  const clearDone = () => setTasks((ts) => ts.filter((t) => !t.done));

  const offline = state === "error";
  const isEmpty = state === "empty";

  const open = isEmpty ? [] : tasks.filter((t) => !t.done);
  const done = isEmpty ? [] : tasks.filter((t) => t.done);

  const listBody = (rows: Task[], emptyText: string) => {
    // One banner for the page, not one per column: the same alert twice reads
    // as two separate failures.
    if (offline) return <div className="py-6 text-center text-[13px] text-ink/70">Tasks are unavailable right now.</div>;
    if (rows.length === 0) return <div className="py-6 text-center text-[13px] text-ink/70">{emptyText}</div>;
    return rows.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} />);
  };

  return (
    <div className="space-y-4">
      {/* Fields first, primary action bottom LEFT (§2). */}
      <Card className={composerOpen || saving ? "ring-1 ring-biscay-2/40" : ""}>
        <div className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New task: e.g. Re-verify SLA uptime fact"
            className="min-w-0 flex-1"
          />
          <Select defaultValue="factcheck" className="w-40 shrink-0">
            <option value="approval">Approval</option>
            <option value="factcheck">Fact check</option>
            <option value="stale">Stale</option>
          </Select>
        </div>
        <div className="mt-3">
          <Button variant="primary" onClick={add} disabled={saving || !draft.trim()}>
            <Plus size={15} /> {saving ? "Adding…" : "Add task"}
          </Button>
        </div>
      </Card>

      {offline && <ErrorMessage id="server.unavailable" />}

      {(state === "overflow" || state === "stress") && <StressStrip pathological={state === "stress"} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Column title="Open" icon={<Clipboard size={16} />} tone="ink" count={open.length}>
          {listBody(open, "Nothing open: all caught up.")}
        </Column>
        <Column
          title="Done"
          icon={<CheckCircle2 size={16} />}
          tone="ok"
          count={done.length}
          action={
            done.length > 0 && !offline ? (
              <ConfirmButton compact confirmLabel="Clear all?" onConfirm={clearDone}>
                <Trash2 size={14} /> Clear done
              </ConfirmButton>
            ) : null
          }
        >
          {listBody(done, "No completed tasks yet.")}
        </Column>
      </div>
    </div>
  );
}

function TasksPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("tasks")} title="Tasks" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="board" />
      ) : (
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Tasks"
          title="Tasks"
          description="Everything Mari opened for a human: fact checks, approvals, stale docs, and canonical tagging."
          backLink={{ href: "/", label: "Overview" }}
        />
        <div className="mt-6">
          <Body key={state} state={state} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "tasks",
  title: "Tasks",
  route: "/tasks",
  component: TasksPage,
  states: STATES.map((s) => ({ ...s })),
};
