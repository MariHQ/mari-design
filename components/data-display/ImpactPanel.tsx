import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Chip } from "./Chip";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonChip } from "./Skeleton";
import { Button } from "../actions/Button";

/* ImpactPanel — the one impact-analysis rendering, shared by Facts and
   Decisions in the console (it was duplicated inline on both pages). A short
   summary plus a list of impacted documents, each tagged with a severity
   chip. Ported from components/ImpactPanel.tsx (+ .css) to Tailwind. */

export type ImpactDoc = { title: string; source: string; severity: string; reason: string };

const SEVERITY: Record<string, { tone: string; label: string }> = {
  "update-required": { tone: "blocked", label: "Update required" },
  review: { tone: "attention", label: "Review" },
  minor: { tone: "neutral", label: "Minor" },
};

export type ImpactPanelProps = {
  loading?: boolean;
  loadingText?: string;
  summary?: string;
  docs?: ImpactDoc[];
  onClose?: () => void;
  /** Extra actions under the doc list (e.g. Decisions' "Create N tasks"). */
  footer?: ReactNode;
  /** Bordered inset box — for hosts without their own strip chrome (Facts). */
  boxed?: boolean;
  className?: string;
};

export function ImpactPanel({
  loading = false,
  loadingText = "Mari is reading the graph — checking documents that depend on this claim…",
  summary,
  docs = [],
  onClose,
  footer,
  boxed = false,
  className = "",
}: ImpactPanelProps) {
  if (loading) {
    const loadWrap = [
      "text-[13px] leading-[1.45]",
      boxed && "rounded-[10px] border border-ink/12 bg-flysch/60 px-3.5 py-2.5",
      className,
    ].filter(Boolean).join(" ");
    return (
      <div className={loadWrap} aria-hidden="true">
        <SkeletonLine w={130} h={13} />
        <SkeletonText lines={2} className="mt-2" lastWidth="68%" />
        <div className="mt-2 flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 border-t border-ink/10 py-[7px] first:border-t-0">
              <SkeletonChip w={88} />
              <SkeletonLine w={110} h={11} />
              <SkeletonLine w={70} h={10} />
              <span className="ml-auto"><Skeleton width={140} height={10} rounded="rounded-full" /></span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const wrap = [
    "text-[13px] leading-[1.45]",
    boxed && "rounded-[10px] border border-ink/12 bg-flysch/60 px-3.5 py-2.5",
    className,
  ].filter(Boolean).join(" ");
  return (
    <div className={wrap}>
      <div className="flex items-center gap-2.5">
        <b className="font-display text-[13.5px] font-semibold text-ink">Impact analysis</b>
        {onClose && (
          <Button icon aria-label="Hide impact analysis" onClick={onClose} className="ml-auto w-7 h-7">
            <X size={14} />
          </Button>
        )}
      </div>
      {summary && <p className="mt-1.5 max-w-[640px] text-ink/70">{summary}</p>}
      {docs.length === 0 && !summary && <span className="font-term text-[11px] text-ink/55">No impacted documents found.</span>}
      {docs.length > 0 && (
        <div className="mt-2 flex flex-col">
          {docs.map((doc, i) => {
            const sev = SEVERITY[doc.severity] ?? SEVERITY.minor;
            return (
              <div key={i} className="flex items-baseline gap-2.5 border-t border-ink/10 py-[7px] first:border-t-0">
                <Chip label={sev.label} tone={sev.tone} caps className="self-center shrink-0" />
                <b className="font-display text-[13px] font-semibold text-ink whitespace-nowrap">{doc.title}</b>
                <span className="font-term text-[11.5px] text-ink/45 whitespace-nowrap">{doc.source}</span>
                <span className="ml-auto max-w-[46%] text-right text-[12px] leading-[1.4] text-ink/70">{doc.reason}</span>
              </div>
            );
          })}
        </div>
      )}
      {footer && <div className="mt-2.5 flex items-center gap-3">{footer}</div>}
    </div>
  );
}
