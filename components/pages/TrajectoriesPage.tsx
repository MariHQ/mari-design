import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { SkeletonPage } from "../data-display/Skeletons";
import { ReadError } from "../feedback/ReadError";
import { Button, Card, Chip } from "../index";
import { CheckCircle2, ChevronDown, CircleAlert, GitBranch } from "lucide-react";

const STATES = [
  { id: "default", label: "Default" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error / service unavailable" },
  { id: "empty", label: "Empty / no trajectories" },
  { id: "stress", label: "Stress / large archive" },
] as const;

export type TrajectoryStep = {
  ordinal: number;
  tool: string;
  actionFamily: string;
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
};

export type TrajectoryPhase = {
  id: number;
  name: string;
  family: string;
  start: number;
  end: number;
  steps: number;
  substate: string;
  failures: number;
};

export type TrajectoryRow = {
  id: number;
  sessionId: number | null;
  prompt: string;
  status: string;
  model: string;
  layer1: string;
  layer2: string;
  category: string;
  macroIntent: string;
  phases: TrajectoryPhase[];
  stepCount: number;
  failureCount: number;
  reworkCount: number;
  startedAt: string;
  completedAt: string;
  steps: TrajectoryStep[];
};

export type TrajectoriesData = {
  rows: TrajectoryRow[];
  total: number;
  categories: string[];
  category: string | null;
  offset: number;
  limit: number;
};

export type TrajectoriesActions = {
  setCategory?: (category: string | null) => void;
  setOffset?: (offset: number) => void;
};

function PhaseRail({ phases }: { phases: TrajectoryPhase[] }) {
  if (!phases.length) return <p className="text-[12px] text-ink/70">No tool phases were observed.</p>;
  return (
    <ol aria-label="Workflow phases" className="flex min-w-0 flex-wrap gap-2">
      {phases.map((phase, index) => (
        <li key={`${phase.id}-${index}`} className="min-w-[120px] flex-1 rounded-[6px] border border-ink/12 bg-paper px-3 py-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold">
            <span className="text-ink/40">{index + 1}</span>
            <span className="truncate">{phase.name}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink/70">{phase.steps} step{phase.steps === 1 ? "" : "s"} · {phase.substate}</p>
        </li>
      ))}
    </ol>
  );
}

function TrajectoryCard({ row }: { row: TrajectoryRow }) {
  const ready = row.status === "ready" || row.status === "fallback";
  return (
    <Card>
      <article aria-labelledby={`trajectory-${row.id}`} className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip label={row.category || "Unclassified"} />
              <span className="text-[11px] text-ink/70">{row.model || "model unavailable"}</span>
              {!ready && <span className="text-[11px] font-medium text-biscay">Analyzing</span>}
            </div>
            <h2 id={`trajectory-${row.id}`} className="mt-2 truncate text-[16px] font-semibold text-ink">
              {row.macroIntent || row.prompt || `Trajectory ${row.id}`}
            </h2>
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink/65">
              {row.layer2 || "Workflow abstraction is still being generated."}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-3 text-center text-[11px] text-ink/70">
            <span><b className="block text-[15px] text-ink">{row.stepCount}</b>steps</span>
            <span><b className="block text-[15px] text-ink">{row.failureCount}</b>failures</span>
            <span><b className="block text-[15px] text-ink">{row.reworkCount}</b>rework</span>
          </div>
        </div>
        <div className="mt-4"><PhaseRail phases={row.phases} /></div>
        <details className="group mt-4 border-t border-ink/10 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold text-biscay">
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            Evidence and abstraction layers
          </summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Grounded workflow</h3>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink/70">{row.layer1 || "Pending"}</p>
            </section>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/70">Chronological evidence</h3>
              <ol className="mt-1 max-h-64 space-y-1 overflow-y-auto pr-1" aria-label="Trajectory steps">
                {row.steps.map((step) => (
                  <li key={step.ordinal} className="flex min-w-0 items-start gap-2 rounded-[4px] px-1 py-1 text-[12px] even:bg-ink/[0.025]">
                    {step.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-olive" /> : <CircleAlert size={13} className="mt-0.5 shrink-0 text-rust" />}
                    <span className="w-24 shrink-0 truncate font-mono text-[11px]">{step.tool}</span>
                    <span className="min-w-0 flex-1 truncate text-ink/70">{step.summary}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </details>
      </article>
    </Card>
  );
}

function TrajectoriesPage({ data, loading = false, error = null, actions, chrome, mobile = false }:
  PageProps<TrajectoriesData, TrajectoriesActions>) {
  const pageStart = data.total ? data.offset + 1 : 0;
  const pageEnd = Math.min(data.offset + data.rows.length, data.total);
  if (loading) return (
    <PageFrame chrome={chrome} active={navFor("trajectories")} title="Agent trajectories" mobile={mobile}>
      <SkeletonPage variant="list" eyebrow="AI monitoring" title="Agent trajectories" description="Grounded workflow abstractions and coarse-to-fine intent paths." mobile={mobile} />
    </PageFrame>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("trajectories")} title="Agent trajectories" mobile={mobile}>
      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
        <PageHeader eyebrow="AI monitoring" title="Agent trajectories" description="Grounded workflow abstractions and coarse-to-fine intent paths." />
        {error ? <ReadError>{error}</ReadError> : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-ink/12 bg-paper px-4 py-3">
              <label className="flex items-center gap-2 text-[12px] font-medium">
                Category
                <select aria-label="Trajectory category" value={data.category ?? ""} onChange={(event) => actions?.setCategory?.(event.target.value || null)} className="rounded-[5px] border border-ink/20 bg-paper px-2 py-1.5 text-[12px]">
                  <option value="">All categories</option>
                  {data.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <span className="text-[12px] text-ink/70">Showing {pageStart}-{pageEnd} of {data.total}</span>
            </div>
            {!data.rows.length ? (
              <div className="rounded-[8px] border border-dashed border-ink/20 px-6 py-16 text-center">
                <GitBranch className="mx-auto text-ink/35" size={26} />
                <h2 className="mt-3 text-[15px] font-semibold">No agent trajectories yet</h2>
                <p className="mt-1 text-[13px] text-ink/70">Agent tool runs will appear here after their grounded abstraction is harvested.</p>
              </div>
            ) : <div className="space-y-4">{data.rows.map((row) => <TrajectoryCard key={row.id} row={row} />)}</div>}
            {data.total > data.limit && (
              <nav aria-label="Trajectory pages" className="mt-6 flex items-center justify-between">
                <Button disabled={data.offset === 0} onClick={() => actions?.setOffset?.(Math.max(0, data.offset - data.limit))}>Previous</Button>
                <span className="text-[12px] text-ink/50">Page {Math.floor(data.offset / data.limit) + 1}</span>
                <Button disabled={data.offset + data.limit >= data.total} onClick={() => actions?.setOffset?.(data.offset + data.limit)}>Next</Button>
              </nav>
            )}
          </>
        )}
      </div>
    </PageFrame>
  );
}

export const page: PageModule<TrajectoriesData, TrajectoriesActions> = {
  id: "trajectories",
  title: "Agent trajectories",
  route: "/trajectories",
  component: TrajectoriesPage,
  states: STATES.map((state) => ({ ...state })),
};
