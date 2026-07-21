import * as RP from "@radix-ui/react-progress";

export type ProgressTone = "ok" | "attention" | "blocked" | "info";

const FILL: Record<ProgressTone, string> = {
  ok: "bg-moss",
  attention: "bg-clay",
  blocked: "bg-espelette",
  info: "bg-biscay-2",
};

/* Determinate linear progress — distinct from Spinner (indeterminate) and
   Stepper (discrete steps). For an import/sync percentage. */
export function Progress({ value, label, tone = "info" }: { value: number; label?: string; tone?: ProgressTone }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12.5px] text-ink/70">{label}</span>
          <span className="font-term text-[11px] text-ink/50">{Math.round(v)}%</span>
        </div>
      )}
      <RP.Root value={v} className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.08]">
        <RP.Indicator className={`h-full ${FILL[tone]} transition-transform duration-300`} style={{ transform: `translateX(-${100 - v}%)` }} />
      </RP.Root>
    </div>
  );
}
