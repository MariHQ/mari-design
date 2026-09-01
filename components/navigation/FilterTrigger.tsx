import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

/* The console's one filter-control idiom (2026-09-01): an accent-striped
 * "Label: value" pill. It grew up in the lineage toolbar; it is shared now so
 * Facts, Workflows and Lineage read as the same filter menu at a glance —
 * the stripe and the label:value shape are what tell the user "this narrows
 * what you see" before they read a word.
 *
 * A dropdown filter wraps FilterTrigger in a <Menu>. A filter that carries
 * its own inputs (a date range, an inline search) puts them in FilterField:
 * the same pill, minus the button behavior and the chevron.
 */
export const FilterTrigger = forwardRef<
  HTMLButtonElement,
  { accent: string; label: string; value: string } & ButtonHTMLAttributes<HTMLButtonElement>
>(function FilterTrigger({ accent, label, value, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`inline-flex h-8 items-center gap-2 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-2.5 text-[13px] text-ink/85 transition-colors hover:border-ink/45 active:bg-ink/[0.05] data-[state=open]:border-ink/45 data-[state=open]:bg-flysch ${focusRing} ${className}`.trim()}
    >
      <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: accent }} aria-hidden />
      <span className="pl-0.5 shrink-0 text-ink/70">{label}:</span>
      <span className="max-w-[96px] truncate font-medium" style={{ color: accent }} title={value}>{value}</span>
      <ChevronDown size={13} className="text-ink/65" />
    </button>
  );
});

export function FilterField({ accent, label, children, className = "" }: {
  accent: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-ink/20 bg-paper pl-0 pr-2 text-[13px] text-ink/85 focus-within:border-ink/45 ${className}`.trim()}>
      <span className="h-full w-[4px] shrink-0 rounded-l-[3px]" style={{ backgroundColor: accent }} aria-hidden />
      <span className="pl-0.5 shrink-0 text-ink/70">{label}:</span>
      {children}
    </div>
  );
}
