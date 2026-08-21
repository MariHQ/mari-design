import { useEffect, useMemo, useState } from "react";
import {
  Play, Eye, MoreVertical, Pencil, Copy, Trash2, Bell, FileText, Workflow,
} from "lucide-react";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Chip } from "../data-display/Chip";
import { Truncate } from "../data-display/Truncate";
import { EmptyState } from "../data-display/EmptyState";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Scrollable } from "../data-display/Scrollable";
import { ResultCount } from "../data-display/Pagination";
import { ShowRest } from "../data-display/ShowRest";
import { why } from "../actions/useWrite";
import { Switch } from "../forms/Switch";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Textarea } from "../forms/Textarea";
import { Drawer } from "../layout/Drawer";
import { Menu, MenuItem } from "../navigation/Menu";
import { type RunStatus } from "../workflow/RunHistory";
import { RunStatusChips } from "./FlowsRunPanel";
import { Skeleton, SkeletonLine, SkeletonCard, SkeletonList } from "../data-display/Skeleton";
import { WriteError } from "../feedback/WriteError";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { fmtDateTime, type DateInput } from "../tokens/format";

/* Flows list — the default Flows surface: a template gallery over a real
   table of flows, each row a live control panel (on/off toggle, name,
   trigger chip, last-run status, recent-run marks, Run / Test-run, delete,
   kebab).

   The rows used to be a hand-spaced <ul> whose "columns" never lined up and
   carried no headers; they are now a table whose headers all go through
   <SortHeader> with the shared px-4 spacing (CONVENTIONS §3). Status renders
   through RunStatusChips — the one run vocabulary — and sits second-to-last
   because every row carries actions. Delete is a <ConfirmButton>, and both
   "New flow" and "Use template" open the same draft drawer, so neither is
   inert (§2). Renders standalone.

   This used to open with its own <PageHeader>, which is why FlowsPage had to
   suppress the page's header on the default view — Flows was the only console
   page whose header came and went with state. The header belongs to the page;
   the list keeps its create action in the table's own top right (§2). */

type TriggerOn = "document_added" | "document_changed" | "schedule" | "" | null;

export type FlowTrigger = {
  on?: TriggerOn;
  source_id?: number | null;
  tag?: string | null;
  path_glob?: string | null;
  every_minutes?: number | null;
};

export type FlowStep = { label: string };

export type FlowRunSummary = { number: number; status: RunStatus; dry?: boolean };

export type Flow = {
  id: number;
  name: string;
  description: string;
  color: string;
  status: "active" | "paused";
  whenLabel: string;
  trigger: FlowTrigger | null;
  nodes: FlowStep[];
  lastRun?: { status: RunStatus; started: DateInput; dry?: boolean } | null;
  recentRuns: FlowRunSummary[];
};

export type SourceRef = { id: number; name: string };

const hasTrigger = (t: FlowTrigger | null) => Boolean(t && t.on);

function fmtEvery(mins: number): string {
  if (mins % 10080 === 0) { const n = mins / 10080; return n === 1 ? "Every week" : `Every ${n} weeks`; }
  if (mins % 1440 === 0) { const n = mins / 1440; return n === 1 ? "Every day" : `Every ${n} days`; }
  if (mins % 60 === 0) { const n = mins / 60; return n === 1 ? "Every hour" : `Every ${n} hours`; }
  return `Every ${mins} min`;
}

function describeTrigger(t: FlowTrigger | null, sources: SourceRef[]): string {
  if (!t || !t.on) return "Manual only";
  if (t.on === "schedule") return fmtEvery(t.every_minutes ?? 1440);
  const verb = t.on === "document_added" ? "Document added" : "Document changed";
  const parts: string[] = [];
  if (t.source_id != null) { const s = sources.find((x) => x.id === t.source_id); if (s) parts.push(s.name); }
  if (t.tag) parts.push(`#${t.tag}`);
  if (t.path_glob) parts.push(t.path_glob);
  return parts.length ? `${verb} · ${parts.join(" · ")}` : verb;
}

const DOT_CLASS: Record<RunStatus, string> = {
  passed: "bg-moss",
  failed: "bg-espelette",
  running: "bg-biscay-2 animate-pulse",
  waiting: "bg-clay",
  skipped: "bg-ink/30",
  pending: "bg-ink/30",
};

/* Shape is the non-colour channel: a colour-blind reader still tells a failed
   run (square) from a passed one (circle) or a waiting one (diamond). §6. */
const DOT_SHAPE: Record<RunStatus, string> = {
  passed: "rounded-full",
  failed: "rounded-[1px]",
  running: "rounded-full ring-1 ring-biscay-2/50 ring-offset-1",
  waiting: "rounded-[1px] rotate-45",
  skipped: "rounded-full opacity-60",
  pending: "rounded-full opacity-60",
};

/** RunDotStrip — recent runs as status marks, each a jump-to-run. */
function RunDotStrip({ runs, max = 5, onOpen }: { runs: FlowRunSummary[]; max?: number; onOpen?: (n: number) => void }) {
  const shown = runs.slice(-max);
  const hidden = runs.length - shown.length;
  if (shown.length === 0) return <span className="font-term text-[11px] text-ink/65">Never run</span>;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {shown.map((r) => (
        <button
          key={r.number}
          type="button"
          onClick={onOpen ? () => onOpen(r.number) : undefined}
          title={`#${r.number}: ${r.status}${r.dry ? ", dry run" : ""}`}
          aria-label={`Run #${r.number}, ${r.status}`}
          className={`h-2.5 w-2.5 shrink-0 ${DOT_SHAPE[r.status]} ${DOT_CLASS[r.status]} ${onOpen ? `cursor-pointer ${focusRing}` : ""}`}
        />
      ))}
      {hidden > 0 && <span className="font-term text-[10.5px] text-ink/65">+{hidden}</span>}
    </span>
  );
}

/* The card describes the flow it copies, and nothing else. It used to look its
   headline up in a name → marketing-copy table baked into this file, so a flow
   that happened to be called "Docs guardrail" was captioned with a promise
   nobody had made about it. A flow's own description is the only honest
   summary of what it guarantees. */
function TemplateCard({ flow, onUse }: { flow: Flow; onUse: (f: Flow) => void }) {
  const mechanism = flow.nodes.map((n) => n.label).join(" → ");
  return (
    <div className={`${card} flex flex-col gap-2 p-4`}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: flow.color }} aria-hidden />
        <span className="font-term text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink/70">Template</span>
      </div>
      <Truncate lines={2} className="text-[14px] font-semibold text-ink">{flow.name}</Truncate>
      <Truncate lines={2} className="text-[12px] leading-snug text-ink/70">{flow.description}</Truncate>
      {mechanism && <Truncate lines={2} className="font-term text-[11px] leading-snug text-ink/65">{mechanism}</Truncate>}
      <Button variant="link" className="mt-auto self-start" onClick={() => onUse(flow)}>Use template →</Button>
    </div>
  );
}

/** What the flow list can DO. Every handler may throw and the control that
    called it shows the message. All optional: without them the list keeps the
    local behaviour the library ships (the design canvas has no server). */
export type FlowsListActions = {
  /** Start a run. `dryRun` executes transforms but previews side effects. */
  runFlow?: (args: { id: number; dryRun: boolean }) => void | Promise<void>;
  /** Turn a flow on or off, so it does or does not fire. */
  setFlowEnabled?: (args: { id: number; enabled: boolean }) => void | Promise<void>;
  /** Delete a flow and its run history. Destructive: goes through ConfirmButton. */
  deleteFlow?: (id: number) => void | Promise<void>;
  /** Create a flow and open it in the pipeline editor.
   *
   *  `fromId` is the flow whose pipeline the new one copies, or null for a
   *  blank one. It is an ID rather than the step list because `Flow.nodes` is
   *  the DISPLAY of a pipeline (labels only) — copying that would produce a
   *  flow whose steps have no kind and therefore cannot run. Whoever owns the
   *  real pipeline copies it; this list only says which one. */
  createFlow?: (args: {
    name: string; description: string; color: string;
    trigger: FlowTrigger; fromId: number | null;
  }) => void | Promise<void>;
  /** Persist a flow's trigger. */
  saveTrigger?: (args: { id: number; trigger: FlowTrigger }) => void | Promise<void>;
};

export type FlowsListProps = {
  flows: Flow[];
  /** Open the trigger editor on this flow id. Canvas only: the drawer owns its
      own open state, which is exactly why FlowsPage carried a static copy of
      it whose Save and Cancel did nothing. */
  editTriggerFor?: number | null;
  /** Open the new-flow drawer on mount, for a caller whose route IS the create
      step. Same reason as `editTriggerFor`: the drawer owns its open state. */
  createOpen?: boolean;
  /** Follow a flow through to its pipeline editor. */
  onOpenFlow?: (id: number) => void;
  /** Sources a document trigger can be scoped to. */
  sources: SourceRef[];
  /** Side effects the list offers. Omitted = local echo only. */
  actions?: FlowsListActions;
  /** One-column layout for a phone. Composed at the page level (§10/§11): the
      list itself stays desktop fixed-width, the page says when it is narrow. */
  compact?: boolean;
  /** Render a content-shaped skeleton silhouette instead of the list. */
  loading?: boolean;
  className?: string;
};

const td = `${tdPad} align-middle border-b border-ink/[0.06]`;

/** Flow rows rendered before "Show all". */
const PAGE = 25;

export function FlowsList({
  flows, sources, actions, editTriggerFor = null, createOpen = false, onOpenFlow,
  compact = false, loading = false, className = "",
}: FlowsListProps) {
  const [rows, setRows] = useState<Flow[]>(flows);
  const [trigEdit, setTrigEdit] = useState<Flow | null>(
    () => flows.find((f) => f.id === editTriggerFor) ?? null,
  );
  const [draft, setDraft] = useState<{ from: Flow | null } | null>(createOpen ? { from: null } : null);

  /* Both drawers are seeded from props and then owned locally, so a route
     change that opens a DIFFERENT flow's trigger (or the create step) used to
     leave the first render's drawer on screen forever. The sentinel adopts the
     new instruction without stamping over a drawer the reader is already in
     (C1: local state seeded from props never resynced). */
  const [seenTrigger, setSeenTrigger] = useState(editTriggerFor);
  if (seenTrigger !== editTriggerFor) {
    setSeenTrigger(editTriggerFor);
    setTrigEdit(flows.find((f) => f.id === editTriggerFor) ?? null);
  }
  const [seenCreate, setSeenCreate] = useState(createOpen);
  if (seenCreate !== createOpen) {
    setSeenCreate(createOpen);
    setDraft(createOpen ? { from: null } : null);
  }
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  /* A write invalidates the read behind it, so the next `flows` is the new
     truth: adopt it rather than staying on the copy taken at mount, which is
     what made a successful delete reappear on the following render. */
  useEffect(() => { setRows(flows); }, [flows]);

  const templates = useMemo(() => flows.slice(0, 4), [flows]);

  const { sort, onSort, sorted } = useSort(rows, {
    status: (r) => (r.lastRun ? r.lastRun.status : "zzz"),
    enabled: (r) => r.status,
    name: (r) => r.name,
    trigger: (r) => describeTrigger(r.trigger, sources),
    lastRun: (r) => (r.lastRun ? new Date(String(r.lastRun.started)).getTime() || 0 : 0),
    runs: (r) => r.recentRuns.length,
  });

  const visible = showAll ? sorted : sorted.slice(0, PAGE);

  /* Optimistic everywhere: the switch flips, the row leaves, the draft lands.
     A rejected write puts the list back exactly as it was and says why, so a
     failed write is as visible as a failed read. */
  const toggleStatus = async (f: Flow) => {
    const enabled = f.status !== "active";
    setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, status: enabled ? "active" : "paused" } : r)));
    setFailed(null);
    setNote(`${f.name} is ${enabled ? "on" : "off"}.`);
    if (!actions?.setFlowEnabled) return;
    try {
      await actions.setFlowEnabled({ id: f.id, enabled });
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, status: f.status } : r)));
      setNote(null);
      setFailed(why(err, `Could not turn ${f.name} ${enabled ? "on" : "off"}.`));
    }
  };

  const removeFlow = async (f: Flow) => {
    setRows((rs) => rs.filter((r) => r.id !== f.id));
    setFailed(null);
    setNote(`Deleted ${f.name}.`);
    if (!actions?.deleteFlow) return;
    try {
      await actions.deleteFlow(f.id);
    } catch (err) {
      setRows((rs) => (rs.some((r) => r.id === f.id) ? rs : [...rs, f]));
      setNote(null);
      setFailed(why(err, `Could not delete ${f.name}.`));
    }
  };

  const runFlow = async (f: Flow, dryRun: boolean) => {
    if (running != null) return;
    setRunning(f.id);
    setFailed(null);
    setNote(null);
    try {
      if (actions?.runFlow) await actions.runFlow({ id: f.id, dryRun });
      else await new Promise((r) => setTimeout(r, 600));
      setNote(`Started ${f.name}${dryRun ? " as a test run" : ""}. Watch the run marks for its result.`);
    } catch (err) {
      setFailed(why(err, `Could not start ${f.name}.`));
    } finally {
      setRunning(null);
    }
  };

  /* Creating a flow is three decisions, not one: what it is called, when it
     fires, and what it does. The drawer takes the first two — the third is the
     pipeline editor, which is where a successful create lands. The row is
     echoed here so the list is right even when nothing follows the write. */
  const createDraft = async (name: string, description: string, trigger: FlowTrigger, from: Flow | null) => {
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
    const steps = from?.nodes ?? [{ label: "Trigger" }];
    const color = from?.color ?? "#1C3F60";
    setDraft(null);
    setFailed(null);
    setRows((rs) => [
      ...rs,
      {
        id, name, description, color, status: "paused",
        whenLabel: describeTrigger(trigger, sources), trigger, nodes: steps,
        lastRun: null, recentRuns: [],
      },
    ]);
    setNote(`Draft flow "${name}" created, paused until you turn it on.`);
    if (!actions?.createFlow) return;
    try {
      await actions.createFlow({ name, description, color, trigger, fromId: from?.id ?? null });
    } catch (err) {
      setRows((rs) => rs.filter((r) => r.id !== id));
      setNote(null);
      setFailed(why(err, `Could not create "${name}".`));
    }
  };

  const saveTrigger = async (f: Flow, trigger: FlowTrigger) => {
    setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, trigger } : r)));
    setTrigEdit(null);
    setFailed(null);
    setNote(`Trigger saved for ${f.name}.`);
    if (!actions?.saveTrigger) return;
    try {
      await actions.saveTrigger({ id: f.id, trigger });
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, trigger: f.trigger } : r)));
      setNote(null);
      setFailed(why(err, `Could not save the trigger for ${f.name}.`));
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col gap-6 ${className}`} aria-hidden="true">
        <div className="space-y-2"><Skeleton width={120} height={20} /><SkeletonLine w={360} h={11} /></div>
        <div>
          <SkeletonLine w={160} h={10} className="mb-2" />
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            <SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} />
          </div>
        </div>
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Template gallery */}
      <div>
        <div className="mb-2 font-term text-[11px] font-medium uppercase tracking-[0.1em] text-ink/65">Start from a template</div>
        {/* Intrinsic track sizing, not a breakpoint (§10): four up on the
            console, and a card never squeezes below 240px, which is what
            crushed the outcome line to one character per line on a phone.
            A phone gets one column from the page's `compact`, never from a
            component breakpoint. */}
        <div className={compact ? "grid grid-cols-1 gap-4" : "grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"}>
          {templates.map((f) => (
            <TemplateCard key={f.id} flow={f} onUse={(t) => setDraft({ from: t })} />
          ))}
        </div>
      </div>

      {/* Flow table */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Automations</h3>
            <div className="mt-0.5 text-[12px] text-ink/70">{rows.length} defined. Toggle one off to stop it running.</div>
          </div>
          <Button variant="primary" compact onClick={() => setDraft({ from: null })}>New automation</Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Workflow size={26} />} title="No automations yet">
            Start from a template or create one.
          </EmptyState>
        ) : (
          <>
          {/* Row count above the table it describes (§13). A workspace can hold
              hundreds of flows; the table renders a page of them and scrolls. */}
          <ResultCount
            from={1}
            to={visible.length}
            total={sorted.length}
            noun="automations"
            actions={sorted.length > PAGE
              ? <ShowRest expanded={showAll} total={sorted.length} onToggle={() => setShowAll((v) => !v)} />
              : undefined}
          />
          <Scrollable axis="both" style={{ maxHeight: visible.length > 8 ? 540 : undefined }}>
            <table className="w-full border-collapse text-left" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <SortHeader label="On" sortKey="enabled" sort={sort} onSort={onSort} />
                  <SortHeader label="Automation" sortKey="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Trigger" sortKey="trigger" sort={sort} onSort={onSort} />
                  <SortHeader label={<>Last run<span className="block normal-case tracking-normal text-ink/65">recent runs</span></>} sortKey="lastRun" sort={sort} onSort={onSort} align="center" />
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Actions" sortable={false} align="right" />
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => {
                  const paused = f.status === "paused";
                  return (
                    <tr key={f.id} className={paused ? "bg-ink/[0.015]" : undefined}>
                      <td className={td}>
                        <Switch checked={!paused} onCheckedChange={() => void toggleStatus(f)} aria-label={`${f.name}: ${f.status}`} />
                      </td>
                      <td className={`${td} max-w-[220px]`}>
                        <button
                          type="button"
                          onClick={() => onOpenFlow?.(f.id)}
                          className={`block max-w-full truncate text-left text-[14px] font-semibold text-ink hover:underline ${focusRing} rounded-[3px]`}
                        >
                          {f.name}
                        </button>
                        <div className="truncate text-[12px] text-ink/70">{f.description}</div>
                      </td>
                      <td className={`${td} max-w-[190px]`}>
                        <div className="truncate font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">When {f.whenLabel}</div>
                        <div className="mt-1 max-w-full overflow-hidden">
                          <Chip
                            label={<span className="block max-w-[150px] truncate">{describeTrigger(f.trigger, sources)}</span>}
                            tone={hasTrigger(f.trigger) ? "ok" : "neutral"}
                            dot={hasTrigger(f.trigger)}
                            onClick={() => setTrigEdit(f)}
                          />
                        </div>
                      </td>
                      <td className={`${td} whitespace-nowrap text-center font-term text-[11.5px] text-ink/70`}>
                        {f.lastRun ? fmtDateTime(f.lastRun.started) : "Never run"}
                        <span className="mt-1 block"><RunDotStrip runs={f.recentRuns} /></span>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {f.lastRun
                          ? <RunStatusChips status={f.lastRun.status} dry={f.lastRun.dry} />
                          : <Chip label="Never run" tone="neutral" />}
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <span className="inline-flex items-center gap-1.5">
                          {/* A run is a background job, so the button says it
                              is starting rather than sitting there clicked. */}
                          <Button compact disabled={running === f.id} onClick={() => void runFlow(f, false)}>
                            <Play size={13} /> {running === f.id ? "Starting…" : "Run"}
                          </Button>
                          <Button compact disabled={running === f.id} title="Runs for real, but side effects become previews" onClick={() => void runFlow(f, true)}>
                            <Eye size={13} /> Test run
                          </Button>
                          <ConfirmButton compact aria-label={`Delete ${f.name}`} confirmLabel="Delete?" onConfirm={() => void removeFlow(f)}>
                            <Trash2 size={13} />
                          </ConfirmButton>
                          <Menu trigger={<Button icon aria-label="More actions"><MoreVertical size={15} /></Button>}>
                            {/* Editing a flow IS its pipeline editor, so this
                                only exists where there is one to open (§2). */}
                            {onOpenFlow && (
                              <MenuItem icon={<Pencil size={14} />} onSelect={() => onOpenFlow(f.id)}>Edit pipeline</MenuItem>
                            )}
                            <MenuItem icon={<Bell size={14} />} onSelect={() => setTrigEdit(f)}>Edit trigger</MenuItem>
                            <MenuItem icon={<Copy size={14} />} onSelect={() => setDraft({ from: f })}>Duplicate</MenuItem>
                          </Menu>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Scrollable>
          </>
        )}
        {/* A refused toggle, delete, run, create or trigger save is a failed
            WRITE, not one named input being wrong, so it gets the banner and
            not a field caption (§8). */}
        {failed && <div className="border-t border-ink/10 px-4 py-2.5"><WriteError onDismiss={() => setFailed(null)}>{failed}</WriteError></div>}
        {note && !failed && <div className="border-t border-ink/10 px-4 py-2.5 font-term text-[11.5px] text-moss">{note}</div>}
      </div>

      {trigEdit && (
        <TriggerEditor
          key={trigEdit.id}
          flow={trigEdit}
          sources={sources}
          onSave={(t) => void saveTrigger(trigEdit, t)}
          onClose={() => setTrigEdit(null)}
        />
      )}
      {draft && (
        <DraftEditor
          from={draft.from}
          sources={sources}
          onCreate={(n, d, t, f) => void createDraft(n, d, t, f)}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

/* ── DraftEditor: "New flow" and "Use template" both land here ─────────── */

function DraftEditor({
  from, sources, onCreate, onClose,
}: {
  from: Flow | null; sources: SourceRef[];
  onCreate: (name: string, description: string, trigger: FlowTrigger, from: Flow | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(from ? `${from.name} copy` : "");
  const [desc, setDesc] = useState(from?.description ?? "");
  /* A template arrives with the trigger it was written for; a blank flow
     starts manual-only, which is the one trigger that needs no configuring. */
  const [trigger, setTrigger] = useState<FlowTrigger>(from?.trigger ?? { on: "" });

  const bad = triggerInvalid(trigger);
  return (
    <Drawer
      open
      onClose={onClose}
      title={from ? "New automation from template" : "New automation"}
      subtitle={from ? from.name : "Start from scratch"}
      icon={<Workflow size={16} className="text-ink/70" />}
      footer={
        <>
          <Button
            variant="primary"
            disabled={!name.trim() || bad}
            onClick={() => onCreate(name.trim(), desc.trim() || "No description yet.", trigger, from)}
          >
            Create and open editor
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Docs guardrail" className="w-full" />
      </Field>
      <Field label="What does it guarantee?">
        <Textarea short value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="One sentence." className="w-full" />
      </Field>

      <div className="pt-1">
        <div className="mb-1 font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink/65">When it fires</div>
        <TriggerFields value={trigger} onChange={setTrigger} sources={sources} />
      </div>

      {/* What the flow will DO is the pipeline, and the pipeline editor is the
          surface for it. Saying so here is the difference between a create
          form that stops halfway and one that hands over. */}
      <div className="pt-2 text-[12.5px] text-ink/70">
        {from
          ? <>Copies {from.nodes.length} steps: {from.nodes.map((n) => n.label).join(", ")}. The editor opens on them next.</>
          : <>The pipeline editor opens next, where you add the steps this automation runs.</>}
      </div>
      <div className="pt-2 text-[11.5px] text-ink/65">The draft starts paused, so nothing fires until you turn it on.</div>
    </Drawer>
  );
}

/* ── TriggerFields: the one trigger form ──────────────────────────────────
   "New flow" and the trigger drawer ask the same four questions, so they ask
   them with the same component — a create form that could not name a schedule
   was why a new flow arrived with no way to fire. */

/** True when the form cannot be saved as it stands. */
function triggerInvalid(t: FlowTrigger): boolean {
  if (t.on !== "schedule") return false;
  const n = t.every_minutes ?? 0;
  return Number.isNaN(n) || n < 1 || n > 10080;
}

function TriggerFields({ value, onChange, sources }: {
  value: FlowTrigger; onChange: (t: FlowTrigger) => void; sources: SourceRef[];
}) {
  const on = value.on ?? "";
  const every = value.every_minutes ?? 1440;
  const bad = triggerInvalid(value);

  /* Switching event resets the filters with it: a path glob left over from a
     document trigger is not a field a schedule has. */
  const setOn = (next: TriggerOn) => onChange(
    next === "schedule" ? { on: next, every_minutes: 1440 }
    : next === "document_added" || next === "document_changed"
      ? { on: next, source_id: null, tag: null, path_glob: null }
      : { on: "" },
  );

  return (
    <>
      <Field label="On">
        <Select value={on} onChange={(e) => setOn(e.target.value as TriggerOn)} className="w-full">
          <option value="">Manual only</option>
          <option value="document_added">Document added</option>
          <option value="document_changed">Document changed</option>
          <option value="schedule">Schedule</option>
        </Select>
      </Field>

      {on === "schedule" && (
        <Field label="Every (minutes)">
          <Input
            type="number" min={1} max={10080} value={every}
            onChange={(e) => onChange({ on: "schedule", every_minutes: Math.floor(Number(e.target.value)) })}
            className="w-full"
          />
          <div className={`mt-1.5 font-term text-[11px] ${bad ? "text-espelette" : "text-ink/70"}`}>
            {bad ? "Enter 1 to 10080 minutes (up to a week)." : `${fmtEvery(every)} · presets: 10 / 60 / 1440 / 10080`}
          </div>
          <div className="mt-1 text-[11.5px] text-ink/65">
            The scheduler checks twice a minute and never starts a run while the previous one is still going.
          </div>
        </Field>
      )}

      {(on === "document_added" || on === "document_changed") && (
        <>
          <Field label="Source">
            <Select
              value={value.source_id != null ? String(value.source_id) : ""}
              onChange={(e) => onChange({ ...value, source_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full"
            >
              <option value="">Any source</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Tag">
            <Input value={value.tag ?? ""} onChange={(e) => onChange({ ...value, tag: e.target.value || null })} placeholder="e.g. customer-facing" className="w-full" />
          </Field>
          <Field label="Path glob">
            <Input value={value.path_glob ?? ""} onChange={(e) => onChange({ ...value, path_glob: e.target.value || null })} placeholder="docs/**" className="w-full font-term" />
          </Field>
          <div className="pt-2 text-[11.5px] text-ink/65">Filters are optional and combine: a run fires only when all set filters match.</div>
        </>
      )}

      {on === "" && (
        <div className="pt-2 text-[12.5px] text-ink/70">
          <FileText size={13} className="mr-1 inline text-ink/65" />
          Manual only: this flow runs when you press Run or Test run.
        </div>
      )}
    </>
  );
}

/* ── TriggerEditor: the compact trigger Drawer ─────────────────────────── */

function TriggerEditor({ flow, sources, onSave, onClose }: {
  flow: Flow; sources: SourceRef[]; onSave: (trigger: FlowTrigger) => void; onClose: () => void;
}) {
  const [trigger, setTrigger] = useState<FlowTrigger>(flow.trigger ?? { on: "" });

  return (
    <Drawer
      open
      onClose={onClose}
      title="Trigger"
      subtitle={flow.name}
      icon={<Bell size={16} className="text-ink/70" />}
      footer={
        <>
          <Button variant="primary" disabled={triggerInvalid(trigger)} onClick={() => onSave(trigger)}>
            Save trigger
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <TriggerFields value={trigger} onChange={setTrigger} sources={sources} />
    </Drawer>
  );
}
