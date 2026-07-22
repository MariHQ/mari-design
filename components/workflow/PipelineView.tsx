import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Chip } from "../data-display/Chip";
import { SkeletonLine, SkeletonChip } from "../data-display/Skeleton";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

/* Workflow pipeline: the "When / Do / Check / Then" stages of a flow laid
   out on a dashed vertical spine. This is the visualization + navigator: it
   holds no data of its own and no router — clicking a stage calls onSelect,
   and the parent decides which detail to swap into view. */

export type WorkflowSection = "when" | "do" | "check" | "then";

export type WorkflowStep = {
  id: string;
  section: WorkflowSection;
  /** Stage title, e.g. "Fetch docs". */
  label: string;
  /** One-line plain-language summary of what the stage does. */
  summary?: string;
  /** Runs the local model — flags the stage as slower. */
  llm?: boolean;
  /** Indents the stage as a conditional yes-branch off the spine. */
  branch?: boolean;
  /** Shown above the first branch stage, e.g. "if contradictions > 0". */
  branchLabel?: string;
  icon?: ReactNode;
};

/* Section marker and spine node share one tone per section. The marker is a
   <Chip>, not a hand-rolled span: §4 forbids bespoke chips, and a rounded-full
   pill matched nothing else on the page. */
const SECTION: Record<WorkflowSection, { title: string; tone: string; dotBorder: string }> = {
  when: { title: "When", tone: "ok", dotBorder: "border-moss" },
  do: { title: "Do", tone: "info", dotBorder: "border-biscay-2" },
  check: { title: "Check", tone: "attention", dotBorder: "border-clay" },
  then: { title: "Then", tone: "blocked", dotBorder: "border-espelette" },
};

const llmBadge = (
  <span className="mt-1.5 block">
    <Chip label="LLM: runs the local model, slower" tone="attention" icon={<Sparkles size={10} aria-hidden />} />
  </span>
);

export type PipelineViewProps = {
  steps: WorkflowStep[];
  /** id of the currently-selected stage, if any. */
  selectedId?: string | null;
  /** Fired when a stage is clicked — the parent swaps the detail view. */
  onSelect?: (id: string) => void;
  name?: string;
  description?: string;
  /** Show a spine of step-block skeletons instead of the steps. */
  loading?: boolean;
  className?: string;
};

export function PipelineView({
  steps, selectedId = null, onSelect, name, description, loading = false, className = "",
}: PipelineViewProps) {
  if (loading) {
    return (
      <div className={className} aria-hidden="true">
        <div className="relative pl-10">
          <span className="pointer-events-none absolute left-[17px] top-4 bottom-4 border-l border-dashed border-ink/25" />
          <ol className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div className={`${card} relative block w-full px-3.5 py-3`}>
                  <span className="absolute top-5 -left-[29px] h-2.5 w-2.5 rounded-full border-2 border-ink/20 bg-paper" />
                  <div className="flex items-center gap-2">
                    <SkeletonChip w={40} />
                    <SkeletonLine w={`${40 + (i % 3) * 12}%`} h={13} />
                  </div>
                  <SkeletonLine w="70%" h={10} className="mt-2" />
                  <SkeletonLine w="52%" h={10} className="mt-1.5" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      {(name || description) && (
        <div className={`${card} mb-4 px-5 py-4`}>
          {name && <div className="break-words font-display text-[22px] font-bold tracking-[-0.01em] text-ink">{name}</div>}
          {description && <div className="mt-1 break-words text-[13px] text-ink/70">{description}</div>}
        </div>
      )}

      <div className="relative pl-10">
        {/* dashed spine */}
        <span aria-hidden className="pointer-events-none absolute left-[17px] top-4 bottom-4 border-l border-dashed border-ink/25" />

        <ol className="flex flex-col gap-3">
          {steps.map((s) => {
            const sec = SECTION[s.section];
            const selected = s.id === selectedId;
            return (
              <li key={s.id} className={s.branch ? "ml-9" : ""}>
                {s.branch && s.branchLabel && (
                  <div className="mb-1 font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-espelette">{s.branchLabel}</div>
                )}
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(s.id) : undefined}
                  aria-current={selected ? "true" : undefined}
                  className={[
                    card,
                    "relative block w-full px-3.5 py-3 text-left transition-colors",
                    selected ? "border-espelette/60 ring-2 ring-espelette/25" : "hover:border-ink/30",
                    onSelect ? "cursor-pointer" : "cursor-default",
                    focusRing,
                  ].join(" ")}
                >
                  {/* spine node dot */}
                  <span
                    aria-hidden
                    className={[
                      "absolute top-5 h-2.5 w-2.5 rounded-full border-2",
                      s.branch ? "-left-[65px]" : "-left-[29px]",
                      selected ? "bg-espelette border-espelette" : `bg-paper ${sec.dotBorder}`,
                    ].join(" ")}
                  />
                  <div className="flex items-center gap-2">
                    <Chip label={sec.title} tone={sec.tone} className="shrink-0" />
                    <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-ink">
                      {s.icon}
                      <span className="truncate">{s.label}</span>
                    </span>
                  </div>
                  {s.summary && <div className="mt-1 break-words text-[12px] leading-snug text-ink/70">{s.summary}</div>}
                  {s.llm && llmBadge}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
