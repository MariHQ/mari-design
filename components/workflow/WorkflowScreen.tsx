import { useState } from "react";
import { card } from "../tokens/card";
import { Chip } from "../data-display/Chip";
import { PipelineView, type WorkflowStep, type WorkflowSection } from "./PipelineView";
import { RunHistory, type WorkflowRun } from "./RunHistory";
import { RunPanel } from "./RunPanel";

/* WorkflowScreen: the composite that ties the pipeline, run history, and run
   panel together with its own navigation state. It is the "screen that
   navigates you": clicking a stage swaps the stage detail into the right
   column, clicking a run swaps in the RunPanel. No router — selection lives
   here and the sub-views switch off it. */

const SECTION_TITLE: Record<WorkflowSection, string> = {
  when: "When", do: "Do", check: "Check", then: "Then",
};

const SECTION_ACCENT: Record<WorkflowSection, string> = {
  when: "text-moss", do: "text-biscay-2", check: "text-clay", then: "text-espelette",
};

function StageDetail({ step }: { step: WorkflowStep }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-ink/10 px-5 py-3.5">
        <div className={`font-term text-[10px] font-bold uppercase tracking-[0.14em] ${SECTION_ACCENT[step.section]}`}>
          {SECTION_TITLE[step.section]}
        </div>
        <div className="mt-1 flex items-center gap-1.5 break-words font-display text-[17px] font-bold text-ink">
          {step.icon}{step.label}
        </div>
      </div>
      <div className="px-5 py-4 break-words text-[13px] leading-relaxed text-ink/70">
        {step.summary || "This stage runs as configured. There is no further detail."}
        {/* One chip system everywhere (§4), not a bespoke rounded-full pill. */}
        {step.llm && (
          <div className="mt-3">
            <Chip label="LLM stage: runs the local model, slower" tone="attention" />
          </div>
        )}
      </div>
    </div>
  );
}

export type WorkflowScreenProps = {
  name?: string;
  description?: string;
  steps: WorkflowStep[];
  runs: WorkflowRun[];
  /** Stage selected by default; falls back to the first stage. */
  defaultStageId?: string;
  onApprove?: (run: WorkflowRun) => void;
  onRerun?: (run: WorkflowRun, dry: boolean) => void;
  busy?: boolean;
  note?: string | null;
  className?: string;
};

export function WorkflowScreen({
  name, description, steps, runs, defaultStageId,
  onApprove, onRerun, busy, note, className = "",
}: WorkflowScreenProps) {
  const [stageId, setStageId] = useState<string | null>(defaultStageId ?? steps[0]?.id ?? null);
  const [runId, setRunId] = useState<string | null>(null);

  const selectStage = (id: string) => { setStageId(id); setRunId(null); };
  const selectRun = (run: WorkflowRun) => { setRunId(run.id); };
  const closeRun = () => setRunId(null);

  const selectedRun = runId ? runs.find((r) => r.id === runId) ?? null : null;
  const selectedStage = stageId ? steps.find((s) => s.id === stageId) ?? null : null;

  return (
    <div className={`grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] ${className}`}>
      <div className="flex flex-col gap-5">
        <PipelineView
          name={name}
          description={description}
          steps={steps}
          selectedId={runId ? null : stageId}
          onSelect={selectStage}
        />
        <RunHistory runs={runs} selectedId={runId} onSelect={selectRun} />
      </div>

      <div className="lg:sticky lg:top-4">
        {selectedRun ? (
          <RunPanel
            run={selectedRun}
            onClose={closeRun}
            onApprove={onApprove}
            onRerun={onRerun}
            busy={busy}
            note={note}
          />
        ) : selectedStage ? (
          <StageDetail step={selectedStage} />
        ) : (
          <div className={`${card} px-5 py-6 text-[13px] text-ink/70`}>
            Select a stage or a run to see its detail here.
          </div>
        )}
      </div>
    </div>
  );
}
