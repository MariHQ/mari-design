import { useState } from "react";
import { CalendarClock, Pause, Play, Trash2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, PAGE_CONTAINER } from "./PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Truncate } from "../data-display/Truncate";
import { Select } from "../forms/Select";
import { SkeletonPage } from "../data-display/Skeletons";
import { ReadError } from "../feedback/ReadError";
import { WriteError } from "../feedback/WriteError";
import { useWrite } from "../actions/useWrite";
import { fmtDateTime } from "../tokens/format";

export type ScheduledTask = {
  id: number;
  name: string;
  description: string;
  status: string;
  scheduleMinutes: number | null;
  lastRunNumber: number | null;
  lastRunStatus: string;
  lastRunStarted: string;
};

export type ScheduledTasksData = { tasks: ScheduledTask[] };

export type ScheduledTasksActions = {
  setStatus?: (taskId: number, status: "active" | "paused") => void | Promise<void>;
  setSchedule?: (taskId: number, everyMinutes: number | null) => void | Promise<void>;
  runNow?: (taskId: number) => number | Promise<number>;
  remove?: (taskId: number) => void | Promise<void>;
};

const OPTIONS = [
  { value: "", label: "Manual only" },
  { value: "60", label: "Every hour" },
  { value: "360", label: "Every 6 hours" },
  { value: "1440", label: "Every day" },
  { value: "10080", label: "Every week" },
];

function scheduleLabel(minutes: number): string {
  if (minutes % 1440 === 0) return `Every ${minutes / 1440} days`;
  if (minutes % 60 === 0) return `Every ${minutes / 60} hours`;
  return `Every ${minutes} min`;
}

function TaskRow({ task, actions }: { task: ScheduledTask; actions?: ScheduledTasksActions }) {
  const [status, setStatus] = useState(task.status);
  const [minutes, setMinutes] = useState<number | null>(task.scheduleMinutes);
  const [startedRun, setStartedRun] = useState<number | null>(null);
  const [removed, setRemoved] = useState(false);
  const [seen, setSeen] = useState(`${task.status}:${task.scheduleMinutes}:${task.lastRunNumber}`);
  const write = useWrite();
  const signature = `${task.status}:${task.scheduleMinutes}:${task.lastRunNumber}`;
  if (seen !== signature) {
    setSeen(signature); setStatus(task.status); setMinutes(task.scheduleMinutes);
  }
  const active = status === "active" && minutes !== null;
  const options = minutes !== null && !OPTIONS.some((option) => option.value === String(minutes))
    ? [...OPTIONS, { value: String(minutes), label: scheduleLabel(minutes) }] : OPTIONS;
  let next = "Manual only";
  if (minutes !== null && status === "paused") next = "Paused — cadence is preserved";
  else if (active && task.lastRunStatus === "running") next = "After the current run finishes";
  else if (active && task.lastRunStarted) {
    next = fmtDateTime(new Date(new Date(task.lastRunStarted).getTime() + minutes! * 60_000));
  } else if (active) next = "On the next scheduler check";

  const changeSchedule = (value: string) => {
    const valueMinutes = value ? Number(value) : null;
    void write.run(actions?.setSchedule && (() => actions.setSchedule!(task.id, valueMinutes)),
      () => setMinutes(valueMinutes));
  };
  const toggle = () => {
    const value = status === "active" ? "paused" : "active";
    void write.run(actions?.setStatus && (() => actions.setStatus!(task.id, value)),
      () => setStatus(value));
  };
  const run = async () => {
    const number = await write.runFor(actions?.runNow && (() => actions.runNow!(task.id)));
    if (number !== undefined) setStartedRun(number);
  };
  const remove = () => {
    void write.run(actions?.remove && (() => actions.remove!(task.id)), () => setRemoved(true));
  };

  if (removed) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CalendarClock size={17} className="shrink-0 text-biscay-2" />
            <h3 className="min-w-0 font-semibold text-ink"><Truncate>{task.name}</Truncate></h3>
            <Chip
              label={minutes === null ? "Manual" : status === "paused" ? "Paused" : task.lastRunStatus === "running" ? "Running" : "Active"}
              tone={minutes === null ? "neutral" : status === "paused" ? "attention" : task.lastRunStatus === "failed" ? "blocked" : "ok"}
              dot={minutes !== null}
            />
          </div>
          {task.description && <p className="mt-1 text-[12.5px] text-ink/70">{task.description}</p>}
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[610px] lg:grid-cols-[180px_1fr_auto] lg:items-end">
          {/* ink/70, not /60: 11px text on a white card needs 4.5:1, and
              ink at 60% over white lands at ~4.25 (axe color-contrast). */}
          <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">
            Cadence
            <Select aria-label={`${task.name} cadence`} className="mt-1 h-9 w-full text-[12px] normal-case tracking-normal"
              value={minutes === null ? "" : String(minutes)} disabled={write.busy}
              onChange={(event) => changeSchedule(event.target.value)}>
              {options.map((option) => <option key={option.value || "manual"} value={option.value}>{option.label}</option>)}
            </Select>
          </label>
          <div className="min-w-0 text-[11px] text-ink/65">
            <div className="font-semibold uppercase tracking-[0.08em]">Last / next</div>
            <div className="mt-1 truncate text-[12px] text-ink/80">
              {task.lastRunStarted ? `#${task.lastRunNumber} ${task.lastRunStatus} · ${fmtDateTime(task.lastRunStarted)}` : "Not run yet"}
            </div>
            <div className="truncate text-[12px] text-ink/65">Next: {next}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-3 lg:col-span-1">
            {actions?.remove && <ConfirmButton compact disabled={write.busy || task.lastRunStatus === "running"}
              confirmLabel="Really remove?" onConfirm={remove}>
              <Trash2 size={12} /> Remove
            </ConfirmButton>}
            {minutes !== null && <Button compact disabled={write.busy} onClick={toggle}>
              {status === "active" ? <Pause size={12} /> : <Play size={12} />}{status === "active" ? "Pause" : "Resume"}
            </Button>}
            <Button compact variant="primary" disabled={write.busy || task.lastRunStatus === "running"} onClick={() => void run()}>
              <Play size={12} /> {write.busy ? "Working…" : "Run now"}
            </Button>
          </div>
        </div>
      </div>
      {(startedRun !== null || write.failed) && <div className="border-t border-ink/10 px-5 py-2 text-[12px] text-ink/70">
        {startedRun !== null && <>Run #{startedRun} started. Its status will update here.</>}
        <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
      </div>}
    </Card>
  );
}

function ScheduledTasksPage({ data, loading = false, error = null, actions, chrome, mobile = false }:
  PageProps<ScheduledTasksData, ScheduledTasksActions>) {
  if (loading) return <PageFrame chrome={chrome} active={navFor("scheduled-tasks")} title="Scheduled tasks" mobile={mobile}>
    <SkeletonPage variant="list" eyebrow="Automation" title="Scheduled tasks"
      description="Control recurring background jobs and one-off runs." mobile={mobile} />
  </PageFrame>;
  const active = data.tasks.filter((task) => task.status === "active" && task.scheduleMinutes !== null).length;
  return <PageFrame chrome={chrome} active={navFor("scheduled-tasks")} title="Scheduled tasks" mobile={mobile}>
    <div className={PAGE_CONTAINER}>
      <PageHeader eyebrow="Automation" title="Scheduled tasks"
        description="Control recurring background jobs and one-off runs." />
      <div className="mt-6 space-y-4">
        {error ? <Card><ReadError>{error}</ReadError></Card> : !data.tasks.length ? <Card>
          <EmptyState icon={<CalendarClock size={22} />} title="No scheduled tasks">
            Connector syncs and recurring knowledge jobs appear here when configured.
          </EmptyState>
        </Card> : <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink/70">
            <p>Schedules stay configured when paused. Manual runs do not turn a schedule back on.</p>
            <span className="font-term">{active} active · {data.tasks.length - active} paused or manual</span>
          </div>
          {data.tasks.map((task) => <TaskRow key={task.id} task={task} actions={actions} />)}
        </>}
      </div>
    </div>
  </PageFrame>;
}

export const page: PageModule<ScheduledTasksData, ScheduledTasksActions> = {
  id: "scheduled-tasks", title: "Scheduled tasks", route: "/scheduled-tasks",
  component: ScheduledTasksPage,
  states: [{ id: "default", label: "Default" }, { id: "loading", label: "Loading" },
    { id: "error", label: "Error" }, { id: "empty", label: "Empty" }],
};
