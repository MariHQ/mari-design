import { useMemo, useState } from "react";
import {
  Play, Eye, MoreVertical, Pencil, Copy, Trash2, Bell, FileText, Workflow,
} from "lucide-react";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Switch } from "../forms/Switch";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Drawer } from "../layout/Drawer";
import { Menu, MenuItem, MenuSeparator } from "../navigation/Menu";
import { PageHeader } from "../layout/PageHeader";
import { RunStatusChip, type RunStatus } from "../workflow/RunHistory";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { fmtDateTime, type DateInput } from "../tokens/format";

/* Flows list — the default Flows surface: a template gallery over a list of
   flow rows, each a live control panel (on/off toggle, name, trigger chip,
   last-run status, recent-run dots, Run / Test-run, kebab). Editing a trigger
   opens the TriggerEditor Drawer. Composes Switch + Chip + Menu + Drawer +
   RunStatusChip, with a bespoke RunDotStrip. Renders standalone. */

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

/** RunDotStrip — recent runs as status-colored dots, each a jump-to-run. */
function RunDotStrip({ runs, max = 5, onOpen }: { runs: FlowRunSummary[]; max?: number; onOpen?: (n: number) => void }) {
  const shown = runs.slice(-max);
  if (shown.length === 0) return <span className="font-term text-[11px] text-ink/40">Never run</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {shown.map((r) => (
        <button
          key={r.number}
          type="button"
          onClick={onOpen ? () => onOpen(r.number) : undefined}
          title={`#${r.number} · ${r.status}${r.dry ? " · dry run" : ""}`}
          aria-label={`Run #${r.number}, ${r.status}`}
          className={`h-2.5 w-2.5 rounded-full ${DOT_CLASS[r.status]} ${onOpen ? `cursor-pointer ${focusRing}` : ""}`}
        />
      ))}
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
        <span className="font-term text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink/50">Template</span>
      </div>
      <div className="text-[14px] font-semibold text-ink">{outcome}</div>
      <div className="text-[12px] leading-snug text-ink/55">{mechanism}</div>
      <Button variant="link" className="mt-auto self-start" onClick={() => onUse(flow)}>Use template →</Button>
    </div>
  );
}

export type FlowsListProps = {
  flows?: Flow[];
  sources?: SourceRef[];
  className?: string;
};

export function FlowsList({ flows = DEMO_FLOWS, sources = DEMO_SOURCES, className = "" }: FlowsListProps) {
  const [rows, setRows] = useState<Flow[]>(flows);
  const [trigEdit, setTrigEdit] = useState<Flow | null>(null);

  const templates = useMemo(() => rows.slice(0, 4), [rows]);

  const toggleStatus = (f: Flow) =>
    setRows((rs) => rs.map((r) => (r.id === f.id ? { ...r, status: r.status === "active" ? "paused" : "active" } : r)));

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <PageHeader
        eyebrow="Flows"
        title="Flows"
        description="Automations that watch your knowledge and do editorial work — start from a template or build your own."
        actions={<Button variant="primary"><Play size={14} /> New flow</Button>}
      />

      {/* Template gallery */}
      <div>
        <div className="mb-2 font-term text-[11px] font-medium uppercase tracking-[0.1em] text-ink/50">Start from a template</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((f) => (
            <TemplateCard key={f.id} flow={f} onUse={() => { /* opens editor with a new draft */ }} />
          ))}
        </div>
      </div>

      {/* Flow list */}
      <div className={`${card} overflow-hidden`}>
        {rows.length === 0 ? (
          <EmptyState icon={<Workflow size={26} />} title="No flows yet">
            Start from a template or create one.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-ink/10">
            {rows.map((f) => {
              const paused = f.status === "paused";
              return (
                <li key={f.id} className={`grid grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1.4fr)] items-center gap-4 px-4 py-3.5 lg:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1.3fr)_auto_auto_auto] ${paused ? "opacity-60" : ""}`}>
                  {/* 1. toggle */}
                  <Switch
                    checked={!paused}
                    onCheckedChange={() => toggleStatus(f)}
                    aria-label={`${f.name}: ${f.status}`}
                  />
                  {/* 2. name + description */}
                  <div className="min-w-0">
                    <button type="button" className={`block truncate text-left text-[14px] font-semibold text-ink hover:underline ${focusRing} rounded-[3px]`}>
                      {f.name}
                    </button>
                    <div className="truncate text-[12px] text-ink/55">{f.description}</div>
                  </div>
                  {/* 3. trigger */}
                  <div className="min-w-0">
                    <div className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">When {f.whenLabel}</div>
                    <div className="mt-1">
                      <Chip
                        label={describeTrigger(f.trigger, sources)}
                        tone={hasTrigger(f.trigger) ? "ok" : "neutral"}
                        dot={hasTrigger(f.trigger)}
                        onClick={() => setTrigEdit(f)}
                      />
                    </div>
                  </div>
                  {/* 4. last run */}
                  <div className="hidden items-center gap-2 lg:flex">
                    {f.lastRun ? (
                      <>
                        <RunStatusChip status={f.lastRun.status} dry={f.lastRun.dry} />
                        <span className="font-term text-[11px] text-ink/45">{fmtDateTime(f.lastRun.started)}</span>
                      </>
                    ) : (
                      <span className="font-term text-[11px] text-ink/40">Never run</span>
                    )}
                  </div>
                  {/* 5. run dots */}
                  <div className="hidden lg:block"><RunDotStrip runs={f.recentRuns} /></div>
                  {/* 6. actions */}
                  <div className="flex items-center gap-1.5">
                    <Button compact><Play size={13} /> Run</Button>
                    <Button compact title="Runs for real, but side effects become previews"><Eye size={13} /> Test run</Button>
                    <Menu trigger={<Button icon aria-label="More actions"><MoreVertical size={15} /></Button>}>
                      <MenuItem icon={<Pencil size={14} />}>Edit</MenuItem>
                      <MenuItem icon={<Bell size={14} />} onSelect={() => setTrigEdit(f)}>Edit trigger…</MenuItem>
                      <MenuItem icon={<Copy size={14} />}>Duplicate</MenuItem>
                      <MenuSeparator />
                      <MenuItem danger icon={<Trash2 size={14} />}>Delete…</MenuItem>
                    </Menu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {trigEdit && <TriggerEditor key={trigEdit.id} flow={trigEdit} sources={sources} onClose={() => setTrigEdit(null)} />}
    </div>
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
      icon={<Bell size={16} className="text-ink/50" />}
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
          <div className={`mt-1.5 font-term text-[11px] ${everyBad ? "text-espelette" : "text-ink/50"}`}>
            {everyBad ? "Enter 1–10080 minutes (up to a week)." : `${fmtEvery(everyN)} · presets: 10 / 60 / 1440 / 10080`}
          </div>
          <div className="mt-1 text-[11.5px] text-ink/45">
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
          <div className="pt-2 text-[11.5px] text-ink/45">Filters are optional and combine — a run fires only when all set filters match.</div>
        </>
      )}

      {(on === "" || on == null) && (
        <div className="pt-2 text-[12.5px] text-ink/55">
          <FileText size={13} className="mr-1 inline text-ink/40" />
          Manual-only — this flow runs when you press Run or Test run.
        </div>
      )}
    </Drawer>
  );
}
