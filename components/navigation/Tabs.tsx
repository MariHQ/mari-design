import type { ReactNode } from "react";
import * as RTabs from "@radix-ui/react-tabs";
import { focusRing } from "../tokens/focusRing";

export type TabOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
  icon?: ReactNode;
};

export type TabsVariant = "seg" | "underline";

export type TabsProps<T extends string> = {
  ariaLabel: string;
  options: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: TabsVariant;
  className?: string;
};

/* Tabs: a thin, restyled wrapper over Radix's Tabs primitive — keyboard
   nav and ARIA wiring come from Radix, everything visual is Brutalist
   Blueprint console-mode (hairline borders, no shadows). `activationMode`
   is manual: arrow keys move focus, selection only follows an explicit
   Enter/Space/click, matching how the console's real tab rows behave. */
export function Tabs<T extends string>({ ariaLabel, options, value, onChange, variant = "seg", className = "" }: TabsProps<T>) {
  return (
    <RTabs.Root value={value} onValueChange={(v) => onChange(v as T)} activationMode="manual">
      <RTabs.List
        aria-label={ariaLabel}
        className={
          variant === "seg"
            ? `inline-flex items-center gap-1 p-1 rounded-md border border-ink/15 bg-flysch ${className}`
            : `flex items-center gap-5 border-b border-ink/15 ${className}`
        }
      >
        {options.map((opt) => (
          <RTabs.Trigger
            key={opt.id}
            value={opt.id}
            className={
              variant === "seg"
                ? `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[13px] font-medium text-ink/60 hover:text-ink transition-colors data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:border data-[state=active]:border-ink/15 ${focusRing}`
                : `inline-flex items-center gap-1.5 pb-2 text-[13px] font-medium text-ink/55 border-b-2 border-transparent hover:text-ink transition-colors data-[state=active]:text-ink data-[state=active]:border-biscay-2 ${focusRing}`
            }
          >
            {opt.icon}
            {opt.label}
            {opt.count != null && (
              <span className="font-term text-[10.5px] font-medium text-ink/55 bg-ink/[0.05] rounded-[3px] px-1.5 py-0.5">
                {opt.count}
              </span>
            )}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
    </RTabs.Root>
  );
}
