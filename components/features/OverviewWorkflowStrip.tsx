import type { ReactNode } from "react";
import { Fragment, useState } from "react";
import { Workflow, Settings, Bell, FileText, Feather, ShieldCheck, Layers, Tag, GitFork, Clipboard, Send, Globe, RefreshCw, Calendar, type LucideIcon } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { Chip, StatusChip, type ChipStatus } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { CardSection } from "../layout/CardShell";
import { Truncate } from "../data-display/Truncate";
import { Button } from "../actions/Button";
import { runStatusChip } from "../tokens/runStatus";
import { fmtDateTime } from "../tokens/format";

/* Overview — Workflow strip ───────────────────────────────────────────────
   A one-flow summary strip: the workspace's active flow shown as a horizontal
   When/Do/Check/Then step sequence, plus its name, run status, and last-run
   time/outcome. Local <StepStrip> (section-toned icon bubbles with dotted
   connectors — catalog Stepper is numbered/vertical).

   Step labels are the flow's *configuration* and stay static text. Anything
   that expresses run STATE — the flow's own status, the last run's outcome,
   and each check step's result ("No contradictions") — is a real <StatusChip>,
   so a reader can tell a setting from a result. Configure toggles the settings
   panel below the strip (§2: no inert controls).
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

export type WfStep = {
  kind: StepKind;
  label: string;
  /** Result of this step on the last run. Renders as a StatusChip when set. */
  state?: ChipStatus;
};

/** Last-run checks listed before the count line takes over. */
const CHECK_CAP = 6;

/* ── StepStrip — horizontal When/Do/Check/Then bubbles + dotted connectors ── */
function StepStrip({ steps, max = 4 }: { steps: WfStep[]; max?: number }) {
  const shown = steps.slice(0, max);
  const rest = steps.length - shown.length;
  return (
    <div className="flex flex-wrap items-start gap-1">
      {shown.map((s, i) => {
        const Icon = KIND_ICON[s.kind] ?? Workflow;
        const sec = SECTION_OF[s.kind] ?? "then";
        return (
          <Fragment key={`${s.kind}-${i}`}>
            <div className="flex w-[86px] flex-col items-center gap-1.5 text-center">
              <span className={`grid place-items-center w-9 h-9 rounded-full border ${SECTION_BUBBLE[sec]}`}>
                <Icon size={18} />
              </span>
              {/* The bubble column is a fixed 68px. Without an explicit break
                  a long unbreakable step name overprints its neighbours. */}
              <Truncate lines={2} className="w-full font-term text-[10.5px] leading-tight text-ink/70">
                {s.label}
              </Truncate>
            </div>
            {i < shown.length - 1 && (
              <span className="mt-4 border-t border-dotted border-ink/30 min-w-[14px] flex-1 self-start" aria-hidden />
            )}
          </Fragment>
        );
      })}
      {rest > 0 && (
        <>
          <span className="mt-4 min-w-[14px] flex-1 self-start border-t border-dotted border-ink/30" aria-hidden />
          <div className="flex w-[86px] flex-col items-center gap-1.5 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-ink/25 font-term text-[11px] text-ink/70">
              +{rest}
            </span>
            <span className="w-full font-term text-[10.5px] leading-tight text-ink/70">
              more {rest === 1 ? "step" : "steps"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export type WfFlow = {
  name: string;
  status: "active" | "paused";
  nodes: WfStep[];
};

export type WfRun = { started: string; outcome: string } | null;

/* Run outcomes arrive as free text from the API. The local word→chip table that
   stood here is now the shared one (tokens/runStatus, X2): it agreed on values
   but was a fourth independent copy of the same vocabulary, and it knew fewer
   spellings than the engines emit. An unrecognized word still renders as a real
   chip (never a bare span) rather than being dropped or guessed at. */
function OutcomeChip({ outcome }: { outcome: string }) {
  const status = runStatusChip(outcome);
  if (status) return <StatusChip status={status} />;
  return <Chip label={outcome} tone="neutral" className="max-w-[240px] truncate" />;
}

export type OverviewWorkflowStripProps = {
  flow: WfFlow | null;
  run: WfRun;
  loading?: boolean;
  offline?: boolean;
  runsLoading?: boolean;
  onConfigure?: () => void;
  /** Wires the error banner's Retry control. Omitted = no button. */
  onRetry?: () => void;
  /** Start with the settings panel open. */
  defaultConfiguring?: boolean;
  className?: string;
};

export function OverviewWorkflowStrip({
  flow, run, loading = false, offline = false,
  runsLoading = false, onConfigure, onRetry, defaultConfiguring = false, className = "",
}: OverviewWorkflowStripProps) {
  const [configuring, setConfiguring] = useState(defaultConfiguring);

  const toggleConfigure = () => {
    setConfiguring((v) => !v);
    onConfigure?.();
  };

  const configure: ReactNode = (
    <Button compact onClick={toggleConfigure} aria-expanded={configuring}>
      <Settings size={14} /> {configuring ? "Hide settings" : "Configure"}
    </Button>
  );

  /* "Last run checks" are results, so they only exist once a run has happened.
     Showing green check chips next to "Never run" was a straight contradiction. */
  const checks = run ? (flow?.nodes ?? []).filter((s) => s.state) : [];

  return (
    <Card
      className={className}
      icon={<IconRing><Workflow size={16} /></IconRing>}
      title="Workflow"
      actions={configure}
    >
      {loading ? (
        <div aria-hidden="true">
          <div className="flex flex-wrap items-start gap-1">
            {[0, 1, 2, 3].map((i) => (
              <Fragment key={i}>
                <div className="flex w-[86px] flex-col items-center gap-1.5">
                  <SkeletonCircle size={36} />
                  <SkeletonLine w="80%" h={9} />
                </div>
                {i < 3 && <span className="mt-4 min-w-[14px] flex-1 self-start border-t border-dotted border-ink/20" />}
              </Fragment>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between"><SkeletonLine w="40%" h={12} /><SkeletonLine w={54} h={10} /></div>
            <div className="flex items-center justify-between"><SkeletonLine w="30%" h={10} /><SkeletonLine w={44} h={16} /></div>
          </div>
        </div>
      ) : offline ? (
        /* §8: failure copy comes from the catalog, never a bespoke string. */
        <ErrorMessage id="server.unavailable" onAction={onRetry} />
      ) : !flow ? (
        <EmptyState>No flows yet. Create one in Flows.</EmptyState>
      ) : (
        <>
          <StepStrip steps={flow.nodes} />

          <div className="mt-4 border-t border-ink/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <Truncate className="text-[13.5px] font-semibold text-ink">{flow.name}</Truncate>
              {/* shrink-0: the chip is a fixed two-state label, so it is the
                  flow NAME that gives way, never the status. Without it a long
                  name squeezed the chip to "RUNN…", which reads as neither
                  "Running" nor "Runnable" — an ALL-CAPS state truncated into
                  ambiguity (§12). */}
              <StatusChip className="shrink-0" status={flow.status === "active" ? "running" : "paused"} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              {/* `started` is free text from the API and can be arbitrarily
                  long, so the line ellipsises rather than pushing the strip
                  past the card (§12). */}
              <Truncate className="font-term text-[11.5px] text-ink/65">
                {run ? `Last run: ${fmtDateTime(run.started)}` : runsLoading ? "Loading runs…" : "Never run"}
              </Truncate>
              {run && <OutcomeChip outcome={run.outcome} />}
            </div>
          </div>

          {checks.length > 0 && (
            <CardSection label="Last run checks" className="mt-4 border-t border-ink/10 pt-3">
              {/* A 60-step flow reports 60 checks: the list says how many of
                  how many it shows (§13) and scrolls past CHECK_CAP (§20). */}
              {checks.length > CHECK_CAP && (
                <div className="mb-1.5 font-term text-[11px] text-ink/65">
                  Showing {CHECK_CAP} of {checks.length.toLocaleString()} checks
                </div>
              )}
              <ul className="flex flex-col gap-1.5">
                {checks.slice(0, CHECK_CAP).map((s, i) => (
                  <li key={`${s.label}-${i}`} className="flex items-center justify-between gap-3">
                    <Truncate className="text-[13px] text-ink/70">{s.label}</Truncate>
                    <StatusChip status={s.state!} />
                  </li>
                ))}
              </ul>
            </CardSection>
          )}

          {configuring && (
            <CardSection label="Settings" className="mt-4 border-t border-ink/10 pt-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/65">Trigger</dt>
                <Truncate as="dd" className="text-ink/70">{flow.nodes[0]?.label ?? "Manual"}</Truncate>
                <dt className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/65">Steps</dt>
                <dd className="text-ink/70">
                  {flow.nodes.length} steps, {flow.nodes.filter((n) => n.state).length} checked
                </dd>
                <dt className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/65">State</dt>
                {/* This read "Runs on every doc change" for any active flow.
                    The cadence is the trigger's, it is the row directly above,
                    and a scheduled or manual flow was described as neither
                    (I8). The state row says only whether the flow is on. */}
                <dd className="text-ink/70">{flow.status === "active" ? "Enabled" : "Paused, no runs scheduled"}</dd>
              </dl>
              {/* Read-only: this panel is a <dl>, there is no field to edit and
                  no handler behind it. It used to draw a primary "Save flow"
                  beside a "Cancel" that did the identical thing, so a user who
                  pressed Save was told nothing and saved nothing (A2). Editing
                  a flow happens in Flows. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button compact onClick={() => setConfiguring(false)}>Close</Button>
              </div>
            </CardSection>
          )}
        </>
      )}
    </Card>
  );
}
