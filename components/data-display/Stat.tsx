import type { MouseEventHandler, ReactNode } from "react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import { Skeleton, SkeletonCircle, SkeletonLine } from "./Skeleton";

export type StatTone = "ok" | "attention" | "blocked" | "info" | "neutral";

const SUB_TONE: Record<StatTone, string> = {
  ok: "text-moss",
  attention: "text-clay",
  blocked: "text-espelette",
  info: "text-biscay-2",
  neutral: "text-ink/65",
};

/* The one stat card — big display number + label + sub note. Pass onClick
   for the click-to-filter affordance (stat strips above a DataTable). */
export function Stat({
  value, label, sub, tone = "neutral", icon, onClick, loading = false, className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  /** Colors the sub note. */
  tone?: StatTone;
  /** Optional top-right icon. */
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Show a content-shaped skeleton instead of the value. */
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={`${card} flex flex-1 basis-[200px] min-w-[200px] overflow-hidden [overflow-wrap:anywhere] items-start justify-between gap-3 p-3 ${className}`.trim()} aria-hidden="true">
        <span className="flex flex-col gap-2">
          <Skeleton width={72} height={26} />
          <SkeletonLine w={90} h={10} />
          <SkeletonLine w={60} h={9} />
        </span>
        <SkeletonCircle size={26} />
      </div>
    );
  }
  const body = (
    <>
      <span className="flex flex-col gap-0.5">
        <span className="text-[24px] font-bold tracking-[-0.02em] text-ink leading-none">{value}</span>
        <span className="text-[12.5px] text-ink/65">{label}</span>
        {sub && <span className={`font-term text-[11.5px] mt-0.5 ${SUB_TONE[tone]}`}>{sub}</span>}
      </span>
      {icon && <span className="text-ink/30" aria-hidden="true">{icon}</span>}
    </>
  );
  // p-3, not p-4: stat tiles run compact so dashboards clear the fold
  // (CONVENTIONS.md §17).
  const shared = `${card} flex flex-1 basis-[200px] min-w-[200px] overflow-hidden [overflow-wrap:anywhere] items-start justify-between gap-3 p-3 text-left ${className}`.trim();
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${shared} hover:border-ink/30 transition-colors ${focusRing}`}>
        {body}
      </button>
    );
  }
  return <div className={shared}>{body}</div>;
}
