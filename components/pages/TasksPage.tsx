import { useState, type ReactNode } from "react";
import { Plus, Check, Clipboard, CheckCircle2, Trash2, CalendarClock } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, DASH2 } from "./PageFrame";
import { PageHeader, Card, Button, Input, Select, Avatar, AvatarGroup, Pill, IconRing, Badge, Chip, Stat } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { ConfirmButton } from "../actions/ConfirmButton";
import { ErrorMessage, FieldError } from "../feedback/ErrorMessage";

/* Tasks inbox (pages/tasks.md). The standalone / expanded form of the Overview
   "Today's review" card: a composer at the top, then Open and Done columns of
   task rows (check toggle + strikethrough title + assignee + kind pill).

   This page is a pure presenter: it holds no demo content. The board arrives in
   `data`, so an inbox with nothing in it renders the empty columns rather than
   someone's invented backlog. The design canvas supplies the same shape from
   `.preview/fixtures/tasks.ts`. */

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

/** One row of the inbox. Dates arrive pre-formatted (§5: always with a year). */
export type Task = {
  id: number;
  title: string;
  who: string;
  kind: string;
  kindLabel: string;
  done: boolean;
  due?: string;
  overdue?: boolean;
};

/** The chip-row / avatar-stack / headline-number strip above the columns. Only
    some boards carry one, so it is nullable rather than a flag plus content. */
export type TaskStrip = {
  title: string;
  tags: string[];
  /** Initials of everyone on the task. */
  people: string[];
  statValue: string;
  statLabel: string;
};

/** What the Tasks inbox can DO. Every handler may throw; the board reverts the
    row it moved and shows the server's own message beside the control.

    Optional, like every actions object: with none of these the composer, the
    check toggles and Clear done keep the local behaviour below, which is what
    the design canvas renders. */
export type TasksActions = {
  /** Check / uncheck one row. */
  setDone?: (args: { id: number; done: boolean }) => void | Promise<void>;
  /** Add the composer's draft to the inbox. */
  create?: (args: { title: string; kind: string; kindLabel: string }) => void | Promise<void>;
  /** Empty the Done column. Destructive: goes through ConfirmButton. */
  clearDone?: () => void | Promise<void>;
};

/** The kinds the composer can file a task under. The value is the API's key,
    the label is what the pill reads — the two travel together so a task never
    lands with a key nobody has a label for. */
const KINDS: { id: string; label: string }[] = [
  { id: "approval", label: "Approval" },
  { id: "factcheck", label: "Fact check" },
  { id: "stale", label: "Stale" },
];

/** Whatever the server said, or a floor when the failure carried no message. */
const why = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Everything the Tasks page renders. */
export type TasksData = {
  tasks: Task[];
  /** Text already in the composer. Non-empty means someone is drafting. */
  draft: string;
  /** The composer is mid-submit: the add button locks and reads "Adding…". */
  saving: boolean;
  strip: TaskStrip | null;
};

/* Emptiness is derived per column from the rows themselves (`rows.length === 0`
   below), not from a state flag, so an inbox with nothing in it renders the
   same on the canvas and in a real workspace. */

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
function StressStrip({ strip }: { strip: TaskStrip }) {
  return (
    <Card className="space-y-3">
      <div className="min-w-0 text-[13.5px] font-semibold text-ink break-words">{strip.title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {strip.tags.map((t) => <Chip key={t} label={t} tone="neutral" />)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <AvatarGroup people={strip.people.map((initials) => ({ initials }))} max={6} />
        <Stat value={strip.statValue} label={strip.statLabel} tone="info" />
      </div>
    </Card>
  );
}

function Body({ data, error, actions, who, mobile }: {
  data: TasksData; error: string | null; actions?: TasksActions; who: string; mobile: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>(() => data.tasks);
  const [draft, setDraft] = useState(data.draft);
  const [kind, setKind] = useState(KINDS[1].id);
  const [adding, setAdding] = useState(false);
  /* A failed write is as visible as a failed read (PageProps.actions): the
     server's own message lands under the control that tried it. */
  const [composerFailed, setComposerFailed] = useState<string | null>(null);
  const [boardFailed, setBoardFailed] = useState<string | null>(null);

  const saving = data.saving || adding;
  // The composer reads as "active" whenever it holds a draft or is submitting
  // one — a mode derived from the content, not a separate flag.
  const composing = Boolean(draft.trim()) || saving;

  /* Every control below moves local state FIRST and then writes. With no
     actions that local move is the whole behaviour (the canvas renders this
     page with no server); with actions it is an optimistic echo the refetch
     confirms, and a rejected write puts the row back where it was. */
  const toggle = async (id: number) => {
    const row = tasks.find((t) => t.id === id);
    if (!row) return;
    const done = !row.done;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
    if (!actions?.setDone) return;
    setBoardFailed(null);
    try {
      await actions.setDone({ id, done });
    } catch (e) {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !done } : t)));
      setBoardFailed(why(e, "That task could not be updated."));
    }
  };

  const add = async () => {
    const title = draft.trim();
    if (!title || saving) return;
    const kindLabel = KINDS.find((k) => k.id === kind)?.label ?? kind;
    if (!actions?.create) {
      setTasks((ts) => [...ts, { id: Date.now(), title, who, kind, kindLabel, done: false }]);
      setDraft("");
      return;
    }
    setAdding(true);
    setComposerFailed(null);
    try {
      await actions.create({ title, kind, kindLabel });
      // The row the server just wrote, filed to whoever is signed in — the
      // same person its own `assignee` default names.
      setTasks((ts) => [...ts, { id: Date.now(), title, who, kind, kindLabel, done: false }]);
      setDraft("");
    } catch (e) {
      setComposerFailed(why(e, "That task could not be added."));
    } finally {
      setAdding(false);
    }
  };

  const clearDone = async () => {
    const cleared = tasks.filter((t) => t.done);
    setTasks((ts) => ts.filter((t) => !t.done));
    if (!actions?.clearDone) return;
    setBoardFailed(null);
    try {
      await actions.clearDone();
    } catch (e) {
      setTasks((ts) => [...ts, ...cleared]);
      setBoardFailed(why(e, "Done tasks could not be cleared."));
    }
  };

  const offline = Boolean(error);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const listBody = (rows: Task[], emptyText: string) => {
    // One banner for the page, not one per column: the same alert twice reads
    // as two separate failures.
    if (error) return <div className="py-6 text-center text-[13px] text-ink/70">{error}</div>;
    if (rows.length === 0) return <div className="py-6 text-center text-[13px] text-ink/70">{emptyText}</div>;
    return rows.map((t) => <TaskRow key={t.id} task={t} onToggle={toggle} />);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Fields first, primary action bottom LEFT (§2). */}
      <Card className={composing ? "ring-1 ring-biscay-2/40" : ""}>
        <div className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New task: e.g. Re-verify SLA uptime fact"
            className="min-w-0 flex-1"
          />
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-40 shrink-0">
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </Select>
        </div>
        {composerFailed && <FieldError>{composerFailed}</FieldError>}
        <div className="mt-3">
          <Button variant="primary" onClick={add} disabled={saving || !draft.trim()}>
            <Plus size={15} /> {saving ? "Adding…" : "Add task"}
          </Button>
        </div>
      </Card>

      {offline && <ErrorMessage id="server.unavailable" />}
      {boardFailed && <FieldError>{boardFailed}</FieldError>}

      {data.strip && <StressStrip strip={data.strip} />}

      {/* Two equal columns on a full-size desktop (§11); mobile, and any window
          too narrow for two task columns, collapses to one column at the page
          level, not via a component breakpoint (§10). */}
      <div className={mobile ? "grid grid-cols-1 gap-5" : DASH2}>
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

function TasksPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<TasksData, TasksActions>) {
  return (
    <PageFrame chrome={chrome} active={navFor("tasks")} title="Tasks" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="board" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Tasks"
          title="Tasks"
          description="Everything Mari opened for a human: fact checks, approvals, stale docs, and canonical tagging."
          backLink={{ href: "/", label: "Overview" }}
        />
        <div className="mt-6">
          <Body data={data} error={error} actions={actions} who={chrome?.user?.initials ?? "—"} mobile={mobile} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<TasksData, TasksActions> = {
  id: "tasks",
  title: "Tasks",
  route: "/tasks",
  component: TasksPage,
  states: STATES.map((s) => ({ ...s })),
};
