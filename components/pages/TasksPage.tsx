import { useMemo, useState, type ReactNode } from "react";
import { Plus, Check, Clipboard, CheckCircle2, Trash2, CalendarClock, FileText } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, DASH2 } from "./PageFrame";
import { PageHeader, Card, Button, Input, Select, Avatar, AvatarGroup, Pill, IconRing, Badge, Chip, Stat } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { Truncate, TruncateInline } from "../data-display/Truncate";
import { Tabs } from "../navigation/Tabs";
import { Combobox } from "../forms/Combobox";
import { FormField } from "../forms/FormField";
import { ConfirmButton } from "../actions/ConfirmButton";
import { ReadError } from "../feedback/ReadError";
import { WriteError } from "../feedback/WriteError";
import { useWrite } from "../actions/useWrite";
import { fmtDate, type DateInput } from "../tokens/format";
import { PagerBar, ResultCount, usePaged } from "../data-display/Pagination";

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
  { id: "single", label: "Single review item" },
  { id: "many", label: "Many review items" },
  { id: "overdue", label: "Overdue" },
  { id: "assigned-to-me", label: "Assigned to me" },
  { id: "composer-open", label: "Composer · drafting" },
  { id: "saving", label: "Adding review item…" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error / service unavailable" },
  { id: "empty", label: "No review items" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** One row of the inbox. */
export type Task = {
  id: number;
  title: string;
  who: string;
  kind: string;
  kindLabel: string;
  done: boolean;
  /** When the task is due: an ISO date. The row renders it with `fmtDate`
      (§5), and the board sorts on it. It used to arrive PRE-FORMATTED, so it
      could be neither sorted nor localised (P-TA-4). */
  due?: DateInput;
  /** The server's own overdue verdict, when it has one. Absent, the board
      compares `due` against the reader's own midnight — a stated timezone
      rather than the unstated one the flag used to carry. */
  overdue?: boolean;
  /** What the task is about. Rendered as a link only when the page can open it
      (`actions.openDoc`); a task with no way back to its document is where the
      inbox used to dead-end (P-TA-5). */
  doc?: { id: string; title: string };
  /** How urgent, in the workspace's own words ("High"). Display text, like
      `kindLabel`, so a workspace with no priority vocabulary shows none. */
  priority?: string;
};

/** Someone a task can be filed to. */
export type TaskAssignee = {
  /** What `create` receives, e.g. an email or a member id. */
  id: string;
  name: string;
  initials?: string;
};

/** One option of the composer's priority control. */
export type TaskPriority = { id: string; label: string };

/** Local midnight: "overdue" needs a boundary, and the reader's own day is the
    only one this page can honestly name. */
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

const isOverdue = (t: Task, floor: number): boolean => {
  if (t.overdue !== undefined) return t.overdue;
  if (!t.due || t.done) return false;
  const ms = new Date(String(t.due)).getTime();
  return Number.isFinite(ms) && ms < floor;
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
  /** Add the composer's draft to the inbox.

      `assignee`, `priority` and `due` are only sent when the composer collected
      them, which it only does when the board carries the vocabulary for them.
      Answer with the row that was written and the board shows THAT row: it
      used to invent one keyed `id: Date.now()`, a number that can collide with
      a real server id the very next refetch (P-TA-3). */
  create?: (args: {
    title: string; kind: string; kindLabel: string;
    assignee?: string; priority?: string; priorityLabel?: string; due?: string;
  }) => Task | void | Promise<Task | void>;
  /** Empty the Done column. Destructive: goes through ConfirmButton. */
  clearDone?: () => void | Promise<void>;
  /** Open the document a task is about. Without it a task's document is text,
      not a link that goes nowhere (§2). */
  openDoc?: (docId: string) => void;
};

/** The kinds the composer can file a task under. The value is the API's key,
    the label is what the pill reads — the two travel together so a task never
    lands with a key nobody has a label for. */
const KINDS: { id: string; label: string }[] = [
  { id: "approval", label: "Approval" },
  { id: "factcheck", label: "Fact check" },
  { id: "stale", label: "Stale" },
];

/** Everything the Tasks page renders. */
export type TasksData = {
  tasks: Task[];
  /** Text already in the composer. Non-empty means someone is drafting. */
  draft: string;
  /** The composer is mid-submit: the add button locks and reads "Adding…". */
  saving: boolean;
  strip: TaskStrip | null;
  /** Who a task can be filed to. Empty (or absent) and the composer draws no
      owner picker and the task files to whoever is signed in — which is what
      it silently did for EVERY task before, with a due date on screen that
      could never be set (P-TA-1). Non-empty, it draws a searchable combobox,
      never a plain select (§7, P-TA-2). */
  assignees?: TaskAssignee[];
  /** The workspace's priority vocabulary. Empty and no priority control is
      drawn: a control whose value nothing can store is decoration (§2). */
  priorities?: TaskPriority[];
};

/* Emptiness is derived per column from the rows themselves (`rows.length === 0`
   below), not from a state flag, so an inbox with nothing in it renders the
   same on the canvas and in a real workspace. */

/* One row = title + a meta cluster. The title takes the slack and TRUNCATES:
   it used to `[overflow-wrap:anywhere]`, which is exactly the "pack it in"
   the rule names (§12, C4). The full title rides the title attribute. The done
   marker is a SQUARE checkbox: a circle reads as "pick one" (§6). */
function TaskRow({ task, overdue, onToggle, onOpenDoc }: {
  task: Task;
  overdue: boolean;
  onToggle: (id: number) => void;
  onOpenDoc?: (docId: string) => void;
}) {
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
      <span className="min-w-[9rem] flex-1">
        <Truncate
          lines={2}
          className={`text-[13.5px] ${task.done ? "text-ink/70 line-through" : "text-ink"}`}
        >
          {task.title}
        </Truncate>
        {task.doc && (
          onOpenDoc ? (
            <Button variant="link" compact className="mt-0.5" onClick={() => onOpenDoc(task.doc!.id)}>
              <FileText size={12} /> <TruncateInline className="max-w-[220px]">{task.doc.title}</TruncateInline>
            </Button>
          ) : (
            <Truncate className="mt-0.5 text-[12px] text-ink/70">{task.doc.title}</Truncate>
          )
        )}
      </span>
      <span className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
        {task.priority && <Chip label={task.priority} tone={overdue ? "attention" : "neutral"} />}
        {task.due && !task.done && (
          <Chip
            label={fmtDate(task.due)}
            tone={overdue ? "blocked" : "neutral"}
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
      {/* §12: a strip headline truncates like every other long value (C4). */}
      <Truncate lines={2} className="text-[13.5px] font-semibold text-ink">{strip.title}</Truncate>
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
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState("");
  const [due, setDue] = useState("");
  const [view, setView] = useState<"all" | "mine" | "overdue">("all");
  const [sort, setSort] = useState<"due" | "title" | "priority">("due");

  /* The board is the page's most-mutated state, and it was seeded from `data`
     ONCE: every refetch landed behind it, so a task someone else closed stayed
     open here until a reload (C1, P-TA-6). The sentinel adopts each new server
     read while keeping the optimistic moves that have not been overwritten by
     it — a new array identity means a new answer. */
  const [seenTasks, setSeenTasks] = useState(data.tasks);
  if (seenTasks !== data.tasks) { setSeenTasks(data.tasks); setTasks(data.tasks); }
  const [seenDraft, setSeenDraft] = useState(data.draft);
  if (seenDraft !== data.draft) { setSeenDraft(data.draft); setDraft(data.draft); }

  const assignees = data.assignees ?? [];
  const priorities = data.priorities ?? [];
  /* A failed write is as visible as a failed read (PageProps.actions): the
     server's own message lands beside the control that tried it. Two hooks
     because the composer and the board are two independent surfaces with two
     banners (XA-04). */
  const composer = useWrite();
  const board = useWrite();

  const saving = data.saving || composer.busy;
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
    // `run` answers whether the write landed, so the optimistic row can go back
    // where it was when it did not.
    const ok = await board.run(() => actions.setDone!({ id, done }));
    if (!ok) setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !done } : t)));
  };

  const add = async () => {
    const title = draft.trim();
    if (!title || saving) return;
    const kindLabel = KINDS.find((k) => k.id === kind)?.label ?? kind;
    const picked = assignees.find((a) => a.id === assignee);
    const pickedPriority = priorities.find((p) => p.id === priority);

    /* An optimistic row's id is NEGATIVE and decreasing: `Date.now()` can
       collide with a real server id, and the collision silently merges two
       different tasks in every keyed list on the page (P-TA-3). Nothing
       server-side issues a negative id, so this one cannot. */
    const localRow = (): Task => ({
      id: -Date.now(),
      title,
      // Filed to the picked owner, or to whoever is standing at the composer,
      // which is who the server's own `assignee` default names.
      who: picked ? (picked.initials ?? picked.name.slice(0, 2)) : who,
      kind, kindLabel, done: false,
      due: due || undefined,
      priority: pickedPriority?.label,
    });

    const settle = (row: Task) => {
      setTasks((ts) => [...ts, row]);
      setDraft("");
      setDue("");
    };

    // The row the server wrote, when it answers with one; otherwise the
    // optimistic row the next refetch replaces. With no handler the echo is the
    // whole story, which is what the canvas renders.
    let created: Task | void = undefined;
    await composer.run(
      actions?.create && (async () => {
        created = await actions.create!({
          title, kind, kindLabel,
          assignee: picked?.id,
          priority: pickedPriority?.id,
          priorityLabel: pickedPriority?.label,
          due: due || undefined,
        });
      }),
      () => settle(created ?? localRow()),
    );
  };

  const clearDone = async () => {
    const cleared = tasks.filter((t) => t.done);
    setTasks((ts) => ts.filter((t) => !t.done));
    if (!actions?.clearDone) return;
    const ok = await board.run(() => actions.clearDone!());
    if (!ok) setTasks((ts) => [...ts, ...cleared]);
  };

  const offline = Boolean(error);

  /* Filter and sort, over the rows already on the board. An inbox you cannot
     narrow to "mine" or "overdue", and cannot order by when things are due,
     is a list you read top to bottom forever (P-TA-5). Dates are ISO now, so
     "due" is a real comparison rather than a string ordering (P-TA-4). */
  const floor = startOfToday();
  const shown = useMemo(() => {
    const kept = tasks.filter((t) => {
      if (view === "mine") return t.who === who;
      if (view === "overdue") return isOverdue(t, floor);
      return true;
    });
    const rank = (t: Task) => priorities.findIndex((p) => p.label === t.priority);
    return [...kept].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "priority") {
        const ra = rank(a), rb = rank(b);
        return (ra < 0 ? priorities.length : ra) - (rb < 0 ? priorities.length : rb);
      }
      // Undated tasks sort last: an absent deadline is not an urgent one.
      const av = a.due ? new Date(String(a.due)).getTime() : Infinity;
      const bv = b.due ? new Date(String(b.due)).getTime() : Infinity;
      return av - bv;
    });
  }, [tasks, view, sort, who, floor, priorities]);

  const open = shown.filter((t) => !t.done);
  const done = shown.filter((t) => t.done);
  const openPager = usePaged(open, 25);
  const donePager = usePaged(done, 25);

  const views = [
    { id: "all" as const, label: "All", count: tasks.length },
    { id: "mine" as const, label: "Assigned to me", count: tasks.filter((t) => t.who === who).length },
    { id: "overdue" as const, label: "Overdue", count: tasks.filter((t) => isOverdue(t, floor)).length },
  ];

  const listBody = (rows: Task[], emptyText: string) => {
    /* One banner for the page, not one per column: the same failure twice reads
       as two separate failures. The column used to echo the raw `error` string
       as bare centred text, a ninth rendering of the same prop (XA-01), so the
       page banner just above the columns now carries it alone. */
    if (error) return null;
    if (rows.length === 0) return <div className="py-6 text-center text-[13px] text-ink/70">{emptyText}</div>;
    return rows.map((t) => (
      <TaskRow key={t.id} task={t} overdue={isOverdue(t, floor)} onToggle={toggle} onOpenDoc={actions?.openDoc} />
    ));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Fields first, primary action bottom LEFT (§2). Owner, priority and
          due date sit on ONE line, in that order (§7): the composer used to
          collect a title and a kind only, so a due date was visible on every
          row and settable on none, and every task filed itself to whoever was
          signed in (P-TA-1). Each of the three is drawn only where the board
          carries the vocabulary to store it. */}
      <Card className={composing ? "ring-1 ring-biscay-2/40" : ""}>
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <span className="min-w-0 flex-1">
              <FormField label="Review item">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder="Re-verify SLA uptime fact"
                  className="w-full"
                />
              </FormField>
            </span>
            <span className="w-40 shrink-0">
              <FormField label="Kind">
                <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full">
                  {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </Select>
              </FormField>
            </span>
          </div>

          {(assignees.length > 0 || priorities.length > 0) && (
            <div className="flex items-end gap-3">
              {assignees.length > 0 && (
                <span className="w-[220px] shrink-0">
                  <FormField label="Owner">
                    {/* An assignee picker is always a searchable combobox,
                        never a plain select (§7, P-TA-2). */}
                    <Combobox
                      ariaLabel="Owner"
                      placeholder="Assign to"
                      searchPlaceholder="Search people"
                      value={assignee}
                      onChange={setAssignee}
                      options={assignees.map((a) => ({ value: a.id, label: a.name }))}
                    />
                  </FormField>
                </span>
              )}
              {priorities.length > 0 && (
                <span className="w-40 shrink-0">
                  <FormField label="Priority">
                    <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
                      <option value="">No priority</option>
                      {priorities.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </Select>
                  </FormField>
                </span>
              )}
              <span className="w-44 shrink-0">
                <FormField label="Due date">
                  <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full" />
                </FormField>
              </span>
            </div>
          )}

          {/* The composer collects five fields; a refused create accuses none
              of them in particular, so it is a banner, not a FieldError. */}
          <WriteError onDismiss={() => composer.setFailed(null)}>{composer.failed}</WriteError>
          <div>
            <Button variant="primary" onClick={add} disabled={saving || !draft.trim()}>
              <Plus size={15} /> {saving ? "Adding…" : "Add review item"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Catalog heading, the server's own message underneath as detail. */}
      {offline && <ReadError>{error}</ReadError>}
      {/* A rejected toggle or a refused Clear done accuses no input: it is a
          banner beside the board, at the weight a failed read gets (XA-02). */}
      <WriteError onDismiss={() => board.setFailed(null)}>{board.failed}</WriteError>

      {/* Filter left, sort on the SAME line (§13). */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs ariaLabel="Filter review items" options={views} value={view} onChange={setView} />
        <span className="ml-auto flex items-center gap-2">
          <label className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/65" htmlFor="tasks-sort">Sort</label>
          <Select id="tasks-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-44">
            <option value="due">Due date</option>
            <option value="title">Title</option>
            {priorities.length > 0 && <option value="priority">Priority</option>}
          </Select>
        </span>
      </div>

      {data.strip && <StressStrip strip={data.strip} />}

      {/* Two equal columns on a full-size desktop (§11); mobile, and any window
          too narrow for two task columns, collapses to one column at the page
          level, not via a component breakpoint (§10). */}
      <div className={mobile ? "grid grid-cols-1 gap-5" : DASH2}>
        <Column title="Open" icon={<Clipboard size={16} />} tone="ink" count={open.length}>
          <ResultCount from={openPager.from} to={openPager.to} total={openPager.total} noun="open review items" whenTruncated />
          {/* The empty line names the filter, so a hidden backlog never reads
              as an empty inbox. */}
          {listBody(openPager.pageRows, view === "all" ? "Nothing open: all caught up." : "Nothing open in this filter.")}
          {openPager.paged && <PagerBar page={openPager.page} pageCount={openPager.pageCount} onChange={openPager.setPage} />}
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
          <ResultCount from={donePager.from} to={donePager.to} total={donePager.total} noun="completed review items" whenTruncated />
          {listBody(donePager.pageRows, view === "all" ? "No completed review items yet." : "No completed review items in this filter.")}
          {donePager.paged && <PagerBar page={donePager.page} pageCount={donePager.pageCount} onChange={donePager.setPage} />}
        </Column>
      </div>
    </div>
  );
}

function TasksPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<TasksData, TasksActions>) {
  return (
    <PageFrame chrome={chrome} active={navFor("tasks")} title="Review" mobile={mobile}>
      {loading ? (
        <SkeletonPage
          variant="board"
          eyebrow="Review queue"
          title="Review"
          description="Everything Mari needs a person to check: facts, approvals, stale documents, and canonical tags."
          /* The board's two columns are the workflow itself, never a query
             result, so they name themselves while the cards are still bars. */
          sections={["Open", "Done"]}
          actions={0}
          mobile={mobile}
        />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Review queue"
          title="Review"
          description="Everything Mari needs a person to check: facts, approvals, stale documents, and canonical tags."
          backLink={{ href: "/", label: "Overview" }}
        />
        <div className="mt-6">
          {/* No session, no initials: a neutral marker, not an em dash. Dashes
              are out of rendered copy (§5) and inventing a person here would
              file every new task to somebody who is not signed in. */}
          <Body data={data} error={error} actions={actions} who={chrome?.user?.initials ?? "?"} mobile={mobile} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<TasksData, TasksActions> = {
  id: "tasks",
  title: "Review",
  route: "/tasks",
  component: TasksPage,
  states: STATES.map((s) => ({ ...s })),
};
