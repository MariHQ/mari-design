import type { MouseEventHandler, ReactNode } from "react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

export type StatTone = "ok" | "attention" | "blocked" | "info" | "neutral";

const SUB_TONE: Record<StatTone, string> = {
  ok: "text-moss",
  attention: "text-clay",
  blocked: "text-espelette",
  info: "text-biscay-2",
  neutral: "text-ink/55",
};

/* The one stat card — big display number + label + sub note. Pass onClick
   for the click-to-filter affordance (stat strips above a DataTable). */
export function Stat({
  value, label, sub, tone = "neutral", icon, onClick, className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  /** Colors the sub note. */
  tone?: StatTone;
  /** Optional top-right icon. */
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  const body = (
    <>
      <span className="flex flex-col gap-0.5">
        <span className="text-[24px] font-bold tracking-[-0.02em] text-ink leading-none">{value}</span>
        <span className="text-[12.5px] text-ink/60">{label}</span>
        {sub && <span className={`font-term text-[11.5px] mt-0.5 ${SUB_TONE[tone]}`}>{sub}</span>}
      </span>
      {icon && <span className="text-ink/30" aria-hidden="true">{icon}</span>}
    </>
  );
  const shared = `${card} flex items-start justify-between gap-3 p-4 text-left ${className}`.trim();
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${shared} hover:border-ink/30 transition-colors ${focusRing}`}>
        {body}
      </button>
    );
  }
  return <div className={shared}>{body}</div>;
}
