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
   Enter/Space/click, matching how the console's real tab rows behave.

   A tab row too wide for its container scrolls INSIDE the row (labels never
   wrap); the page itself never scrolls sideways (CONVENTIONS.md §10). */
export function Tabs<T extends string>({ ariaLabel, options, value, onChange, variant = "seg", className = "" }: TabsProps<T>) {
  return (
    <RTabs.Root value={value} onValueChange={(v) => onChange(v as T)} activationMode="manual">
      <RTabs.List
        aria-label={ariaLabel}
        className={
          variant === "seg"
            ? `inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-ink/15 bg-flysch p-1 ${className}`
            : `flex max-w-full items-center gap-5 overflow-x-auto border-b border-ink/15 ${className}`
        }
      >
        {options.map((opt) => (
          <RTabs.Trigger
            key={opt.id}
            value={opt.id}
            className={
              variant === "seg"
                ? `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] px-3 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:text-ink data-[state=active]:border data-[state=active]:border-ink/15 data-[state=active]:bg-paper data-[state=active]:text-ink ${focusRing}`
                : `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent pb-2 text-[13px] font-medium text-ink/70 transition-colors hover:text-ink data-[state=active]:border-biscay-2 data-[state=active]:text-ink ${focusRing}`
            }
          >
            {opt.icon}
            {opt.label}
            {opt.count != null && (
              <span className="font-term text-[10.5px] font-medium text-ink/70 bg-ink/[0.06] rounded-[3px] px-1.5 py-0.5">
                {opt.count}
              </span>
            )}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
    </RTabs.Root>
  );
}
