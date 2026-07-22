import type { ReactNode } from "react";
import { Fragment } from "react";
import { Workflow, Settings, Bell, FileText, Feather, ShieldCheck, Layers, Tag, GitFork, Clipboard, Send, Globe, RefreshCw, Calendar, type LucideIcon } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Badge } from "../data-display/Badge";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { Button } from "../actions/Button";

/* Overview — Workflow strip ───────────────────────────────────────────────
   A one-flow summary strip: the workspace's active flow shown as a horizontal
   When/Do/Check/Then step sequence, plus its name, active/paused status, and
   last-run time/outcome. Local <StepStrip> (section-toned icon bubbles with
   dotted connectors — catalog Stepper is numbered/vertical).
   Source: web/src/pages/Overview.tsx (wfQ, wfRunsQ, .card.wf); step metadata
   from web/src/pages/flows/data.ts. */

type StepKind =
  | "trigger" | "fetch_docs" | "refine" | "fact_check" | "condition" | "tag"
  | "derive_links" | "create_task" | "approval" | "deploy_site" | "notify"
  | "summarize" | "sync_source" | "refresh_digest";

type Section = "when" | "do" | "check" | "then";

const SECTION_OF: Record<StepKind, Section> = {
  trigger: "when",
  fetch_docs: "do", refine: "do", fact_check: "do", summarize: "do", tag: "do",
  derive_links: "do", sync_source: "do", refresh_digest: "do",
  condition: "check", approval: "check",
  create_task: "then", notify: "then", deploy_site: "then",
};

const KIND_ICON: Record<StepKind, LucideIcon> = {
  trigger: Bell, fetch_docs: FileText, refine: Feather, fact_check: ShieldCheck,
  summarize: Layers, tag: Tag, derive_links: GitFork, condition: Workflow,
  approval: ShieldCheck, create_task: Clipboard, notify: Send, deploy_site: Globe,
  sync_source: RefreshCw, refresh_digest: Calendar,
};

/* per-section bubble tone: when→green, do→blue, check→gold, then→red */
const SECTION_BUBBLE: Record<Section, string> = {
  when: "border-moss/40 text-moss bg-moss/[0.06]",
  do: "border-biscay-2/40 text-biscay-2 bg-biscay-2/[0.06]",
  check: "border-clay/45 text-clay bg-clay/[0.07]",
  then: "border-espelette/40 text-espelette bg-espelette/[0.06]",
};

export type WfStep = { kind: StepKind; label: string };

/* ── StepStrip — horizontal When/Do/Check/Then bubbles + dotted connectors ── */
function StepStrip({ steps, max = 4 }: { steps: WfStep[]; max?: number }) {
  const shown = steps.slice(0, max);
  return (
    <div className="flex flex-wrap items-start gap-1">
      {shown.map((s, i) => {
        const Icon = KIND_ICON[s.kind] ?? Workflow;
        const sec = SECTION_OF[s.kind] ?? "then";
        return (
          <Fragment key={`${s.kind}-${i}`}>
            <div className="flex w-[68px] flex-col items-center gap-1.5 text-center">
              <span className={`grid place-items-center w-9 h-9 rounded-full border ${SECTION_BUBBLE[sec]}`}>
                <Icon size={18} />
              </span>
              <span className="font-term text-[10.5px] leading-tight text-ink/70">{s.label}</span>
            </div>
            {i < shown.length - 1 && (
              <span className="mt-4 border-t border-dotted border-ink/30 min-w-[14px] flex-1 self-start" aria-hidden />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export type WfFlow = {
  name: string;
  status: "active" | "paused";
  nodes: WfStep[];
};

export type WfRun = { started: string; outcome: string } | null;

const DEMO_FLOW: WfFlow = {
  name: "Docs guardrail",
  status: "active",
  nodes: [
    { kind: "trigger", label: "When docs change" },
    { kind: "refine", label: "Tighten" },
    { kind: "condition", label: "No contradictions" },
    { kind: "notify", label: "Post to Slack" },
  ],
};

const DEMO_RUN: WfRun = { started: "Jul 20, 2:57 PM", outcome: "Passed" };

export type OverviewWorkflowStripProps = {
  flow?: WfFlow | null;
  run?: WfRun;
  loading?: boolean;
  offline?: boolean;
  runsLoading?: boolean;
  onConfigure?: () => void;
  className?: string;
};

export function OverviewWorkflowStrip({
  flow = DEMO_FLOW, run = DEMO_RUN, loading = false, offline = false,
  runsLoading = false, onConfigure, className = "",
}: OverviewWorkflowStripProps) {
  const configure: ReactNode = (
    <Button variant="link" onClick={onConfigure} className="text-[12.5px]">
      <Settings size={14} /> Configure
    </Button>
  );

  return (
    <Card
      className={className}
      icon={<IconRing><Workflow size={16} /></IconRing>}
      title="Workflow"
      actions={configure}
    >
      {loading ? (
        <div className="grid place-items-center min-h-[120px]"><Spinner size="sm" /></div>
      ) : offline ? (
        <EmptyState>API offline — flows unavailable.</EmptyState>
      ) : !flow ? (
        <EmptyState>No flows yet — create one in Flows.</EmptyState>
      ) : (
        <>
          <StepStrip steps={flow.nodes} />
          <div className="mt-4 border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-semibold text-ink">{flow.name}</span>
              <span className="inline-flex items-center gap-1.5 font-term text-[11px] text-ink/70">
                <span className={`w-1.5 h-1.5 rounded-full ${flow.status === "active" ? "bg-moss" : "bg-ink/40"}`} />
                {flow.status === "active" ? "Active" : "Paused"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-term text-[11.5px] text-ink/55">
                {run ? `Last run: ${run.started}` : runsLoading ? "Loading runs…" : "Never run"}
              </span>
              {run && <Badge label={run.outcome} tone={run.outcome === "Passed" ? "ok" : "neutral"} />}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
