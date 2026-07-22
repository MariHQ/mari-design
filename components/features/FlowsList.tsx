import { useMemo, useState } from "react";
import {
  Play, Eye, MoreVertical, Pencil, Copy, Trash2, Bell, FileText, Workflow,
} from "lucide-react";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Switch } from "../forms/Switch";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Textarea } from "../forms/Textarea";
import { Drawer } from "../layout/Drawer";
import { Menu, MenuItem } from "../navigation/Menu";
import { PageHeader } from "../layout/PageHeader";
import { type RunStatus } from "../workflow/RunHistory";
import { RunStatusChips } from "./FlowsRunPanel";
import { Skeleton, SkeletonLine, SkeletonCard, SkeletonList } from "../data-display/Skeleton";
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
   inert (§2). Renders standalone. */

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

const TEMPLATE_OUTCOME: Record<string, string> = {
  "Docs guardrail": "Never merge a PR that contradicts your facts",
  "Slack digest": "Turn a week of discussion into a Monday digest",
  "Stale sweeper": "Docs that go quiet get flagged and assigned",
  "Translation sync": "Customer-facing edits ship with review-ready drafts",
};

const DEMO_SOURCES: SourceRef[] = [
  { id: 1, name: "GitHub · product-docs" },
  { id: 2, name: "Slack · #support" },
  { id: 3, name: "Google Drive · Handbook" },
];

const DEMO_FLOWS: Flow[] = [
  {
    id: 1, name: "Docs guardrail", color: "#B23A1E", status: "active",
    description: "Fact-checks every changed doc before it can ship.",
    whenLabel: "GitHub PR merged", trigger: { on: "document_changed", source_id: 1, path_glob: "docs/**" },
    nodes: [{ label: "GitHub PR merged" }, { label: "Fetch docs" }, { label: "Fact check" }, { label: "Contradictions?" }, { label: "Create task" }],
    lastRun: { status: "passed", started: "2026-07-20T14:12:00", dry: false },
    recentRuns: [
      { number: 141, status: "passed" }, { number: 142, status: "passed" },
      { number: 143, status: "failed" }, { number: 144, status: "passed" }, { number: 145, status: "passed" },
    ],
  },
  {
    id: 2, name: "Slack digest", color: "#1E6FA8", status: "active",
    description: "Summarizes a week of #support into a Monday digest.",
    whenLabel: "Every week", trigger: { on: "schedule", every_minutes: 10080 },
    nodes: [{ label: "Weekly scan" }, { label: "Fetch docs" }, { label: "Summarize" }, { label: "Notify" }],
    lastRun: { status: "passed", started: "2026-07-20T09:00:00" },
    recentRuns: [{ number: 88, status: "passed" }, { number: 92, status: "passed" }, { number: 97, status: "passed" }],
  },
  {
    id: 3, name: "Stale sweeper", color: "#A05E1C", status: "paused",
    description: "Flags docs that have gone quiet and assigns an owner.",
    whenLabel: "Every day", trigger: { on: "schedule", every_minutes: 1440 },
    nodes: [{ label: "Daily scan" }, { label: "Fetch docs" }, { label: "Tag docs" }, { label: "Create task" }],
    lastRun: { status: "waiting", started: "2026-07-19T06:00:00" },
    recentRuns: [{ number: 51, status: "passed" }, { number: 57, status: "waiting" }],
  },
  {
    id: 4, name: "Translation sync", color: "#2C6E49", status: "active",
    description: "Turns customer-facing edits into review-ready drafts.",
    whenLabel: "Document changed", trigger: { on: "document_changed", tag: "customer-facing" },
    nodes: [{ label: "Doc changed" }, { label: "Fetch docs" }, { label: "Summarize" }, { label: "Approval" }, { label: "Deploy site" }],
    lastRun: { status: "running", started: "2026-07-21T08:30:00", dry: true },
    recentRuns: [{ number: 201, status: "passed" }, { number: 205, status: "passed" }, { number: 209, status: "running", dry: true }],
  },
  {
    id: 5, name: "Onboarding checker", color: "#1C3F60", status: "active",
    description: "Verifies new hire docs stay consistent with the handbook.",
    whenLabel: "Manual only", trigger: {},
    nodes: [{ label: "Manual" }, { label: "Fetch docs" }, { label: "Fact check" }],
    lastRun: null,
    recentRuns: [],
  },
];

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

function TemplateCard({ flow, onUse }: { flow: Flow; onUse: (f: Flow) => void }) {
  const outcome = TEMPLATE_OUTCOME[flow.name] ?? flow.description;
  const mechanism = flow.nodes.map((n) => n.label).join(" → ");
  return (
    <div className={`${card} flex flex-col gap-2 p-4`}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: flow.color }} aria-hidden />
        <span className="font-term text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink/70">Template</span>
      </div>
      <div className="text-[14px] font-semibold text-ink">{outcome}</div>
      <div className="text-[12px] leading-snug text-ink/70">{mechanism}</div>
      <Button variant="link" className="mt-auto self-start" onClick={() => onUse(flow)}>Use template →</Button>
    </div>
  );
}

export type FlowsListProps = {
  flows?: Flow[];
  sources?: SourceRef[];
  /** Render a content-shaped skeleton silhouette instead of the list. */
  loading?: boolean;
  className?: string;
};

const td = `${tdPad} align-middle border-b border-ink/[0.06]`;

export function FlowsList({ flows = DEMO_FLOWS, sources = DEMO_SOURCES, loading = false, className = "" }: FlowsListProps) {
  const [rows, setRows] = useState<Flow[]>(flows);
  const [trigEdit, setTrigEdit] = useState<Flow | null>(null);
  const [draft, setDraft] = useState<{ from: Flow | null } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const templates = useMemo(() => flows.slice(0, 4), [flows]);

  const { sort, onSort, sorted } = useSort(rows, {
    status: (r) => (r.lastRun ? r.lastRun.status : "zzz"),
    enabled: (r) => r.status,
    name: (r) => r.name,
    trigger: (r) => describeTrigger(r.trigger, sources),
    lastRun: (r) => (r.lastRun ? new Date(String(r.lastRun.started)).getTime() || 0 : 0),
    runs: (r) => r.recentRuns.length,
  });

  const toggleStatus = (f: Flow) =>
    setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r)));

  const removeFlow = (f: Flow) => {
    setRows((rs) => rs.filter((r) => r.id !== f.id));
    setNote(`Deleted ${f.name}.`);
  };

  const createDraft = (name: string, description: string, from: Flow | null) => {
    const id = Math.max(0, ...rows.map((r) => r.id)) + 1;
    setRows((rs) => [
      ...rs,
      {
        id, name, description, color: from?.color ?? "#1C3F60", status: "paused",
        whenLabel: "Manual only", trigger: {}, nodes: from?.nodes ?? [{ label: "Manual" }],
        lastRun: null, recentRuns: [],
      },
    ]);
    setDraft(null);
    setNote(`Draft flow "${name}" created, paused until you turn it on.`);
  };

  if (loading) {
    return (
      <div className={`flex flex-col gap-6 ${className}`} aria-hidden="true">
        <div className="space-y-2"><Skeleton width={120} height={20} /><SkeletonLine w={360} h={11} /></div>
        <div>
          <SkeletonLine w={160} h={10} className="mb-2" />
          <div className="grid gap-4 grid-cols-4">
            <SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} />
          </div>
        </div>
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <PageHeader
        eyebrow="Flows"
        title="Flows"
        description="Automations that watch your knowledge and do editorial work: start from a template or build your own."
        actions={<Button variant="primary" onClick={() => setDraft({ from: null })}><Play size={14} /> New flow</Button>}
      />

      {/* Template gallery */}
      <div>
        <div className="mb-2 font-term text-[11px] font-medium uppercase tracking-[0.1em] text-ink/65">Start from a template</div>
        <div className="grid gap-4 grid-cols-4">
          {templates.map((f) => (
            <TemplateCard key={f.id} flow={f} onUse={(t) => setDraft({ from: t })} />
          ))}
        </div>
      </div>

      {/* Flow table */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Flows</h3>
            <div className="mt-0.5 text-[12px] text-ink/70">{rows.length} defined. Toggle one off to stop it firing.</div>
          </div>
          <Button variant="primary" compact onClick={() => setDraft({ from: null })}>New flow</Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={<Workflow size={26} />} title="No flows yet">
            Start from a template or create one.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <SortHeader label="On" sortKey="enabled" sort={sort} onSort={onSort} />
                  <SortHeader label="Flow" sortKey="name" sort={sort} onSort={onSort} />
                  <SortHeader label="Trigger" sortKey="trigger" sort={sort} onSort={onSort} />
                  <SortHeader label={<>Last run<span className="block normal-case tracking-normal text-ink/65">recent runs</span></>} sortKey="lastRun" sort={sort} onSort={onSort} align="center" />
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Actions" sortable={false} align="right" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((f) => {
                  const paused = f.status === "paused";
                  return (
                    <tr key={f.id} className={paused ? "bg-ink/[0.015]" : undefined}>
                      <td className={td}>
                        <Switch checked={!paused} onCheckedChange={() => toggleStatus(f)} aria-label={`${f.name}: ${f.status}`} />
                      </td>
                      <td className={`${td} max-w-[220px]`}>
                        <button type="button" className={`block max-w-full truncate text-left text-[14px] font-semibold text-ink hover:underline ${focusRing} rounded-[3px]`}>
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
                          <Button compact><Play size={13} /> Run</Button>
                          <Button compact title="Runs for real, but side effects become previews"><Eye size={13} /> Test run</Button>
                          <ConfirmButton compact aria-label={`Delete ${f.name}`} confirmLabel="Delete?" onConfirm={() => removeFlow(f)}>
                            <Trash2 size={13} />
                          </ConfirmButton>
                          <Menu trigger={<Button icon aria-label="More actions"><MoreVertical size={15} /></Button>}>
                            <MenuItem icon={<Pencil size={14} />}>Edit</MenuItem>
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
          </div>
        )}
        {note && <div className="border-t border-ink/10 px-4 py-2.5 font-term text-[11.5px] text-moss">{note}</div>}
      </div>

      {trigEdit && <TriggerEditor key={trigEdit.id} flow={trigEdit} sources={sources} onClose={() => setTrigEdit(null)} />}
      {draft && <DraftEditor from={draft.from} onCreate={createDraft} onClose={() => setDraft(null)} />}
    </div>
  );
}

/* ── DraftEditor: "New flow" and "Use template" both land here ─────────── */

function DraftEditor({
  from, onCreate, onClose,
}: { from: Flow | null; onCreate: (name: string, description: string, from: Flow | null) => void; onClose: () => void }) {
  const [name, setName] = useState(from ? `${from.name} copy` : "");
  const [desc, setDesc] = useState(from?.description ?? "");

  return (
    <Drawer
      open
      onClose={onClose}
      title={from ? "New flow from template" : "New flow"}
      subtitle={from ? from.name : "Start from scratch"}
      icon={<Workflow size={16} className="text-ink/70" />}
      footer={
        <>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name.trim(), desc.trim() || "No description yet.", from)}>
            Create draft
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
      {from && (
        <div className="pt-2 text-[12.5px] text-ink/70">
          Copies {from.nodes.length} steps: {from.nodes.map((n) => n.label).join(", ")}.
        </div>
      )}
      <div className="pt-2 text-[11.5px] text-ink/65">The draft starts paused, so nothing fires until you turn it on.</div>
    </Drawer>
  );
}

/* ── TriggerEditor: the compact trigger Drawer ─────────────────────────── */

function TriggerEditor({ flow, sources, onClose }: { flow: Flow; sources: SourceRef[]; onClose: () => void }) {
  const [on, setOn] = useState<TriggerOn>(flow.trigger?.on ?? "");
  const [every, setEvery] = useState<number>(flow.trigger?.every_minutes ?? 1440);
  const [sourceId, setSourceId] = useState<string>(flow.trigger?.source_id != null ? String(flow.trigger.source_id) : "");
  const [tag, setTag] = useState<string>(flow.trigger?.tag ?? "");
  const [pathGlob, setPathGlob] = useState<string>(flow.trigger?.path_glob ?? "");

  const everyN = Math.floor(Number(every));
  const everyBad = on === "schedule" && (Number.isNaN(everyN) || everyN < 1 || everyN > 10080);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Trigger"
      subtitle={flow.name}
      icon={<Bell size={16} className="text-ink/70" />}
      footer={
        <>
          <Button variant="primary" disabled={everyBad}>Save trigger</Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="On">
        <Select value={on ?? ""} onChange={(e) => setOn(e.target.value as TriggerOn)} className="w-full">
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
            onChange={(e) => setEvery(Number(e.target.value))} className="w-full"
          />
          <div className={`mt-1.5 font-term text-[11px] ${everyBad ? "text-espelette" : "text-ink/70"}`}>
            {everyBad ? "Enter 1 to 10080 minutes (up to a week)." : `${fmtEvery(everyN)} · presets: 10 / 60 / 1440 / 10080`}
          </div>
          <div className="mt-1 text-[11.5px] text-ink/65">
            The scheduler checks twice a minute and never starts a run while the previous one is still going.
          </div>
        </Field>
      )}

      {(on === "document_added" || on === "document_changed") && (
        <>
          <Field label="Source">
            <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full">
              <option value="">Any source</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Tag">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. customer-facing" className="w-full" />
          </Field>
          <Field label="Path glob">
            <Input value={pathGlob} onChange={(e) => setPathGlob(e.target.value)} placeholder="docs/**" className="w-full font-term" />
          </Field>
          <div className="pt-2 text-[11.5px] text-ink/65">Filters are optional and combine: a run fires only when all set filters match.</div>
        </>
      )}

      {(on === "" || on == null) && (
        <div className="pt-2 text-[12.5px] text-ink/70">
          <FileText size={13} className="mr-1 inline text-ink/65" />
          Manual only: this flow runs when you press Run or Test run.
        </div>
      )}
    </Drawer>
  );
}
