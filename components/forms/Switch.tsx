import type { ReactNode } from "react";
import * as RS from "@radix-ui/react-switch";
import { focusRing } from "../tokens/focusRing";

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Switch({ checked, onCheckedChange, label, disabled = false, "aria-label": ariaLabel }: SwitchProps) {
  const control = (
    <RS.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`relative inline-flex w-9 h-5 shrink-0 rounded-full border border-ink/20 bg-ink/10 data-[state=checked]:bg-biscay data-[state=checked]:border-biscay transition-colors disabled:opacity-50 disabled:pointer-events-none ${focusRing}`}
    >
      <RS.Thumb className="block w-3.5 h-3.5 my-[3px] ml-[3px] rounded-full bg-paper transition-transform data-[state=checked]:translate-x-[15px]" />
    </RS.Root>
  );
  if (!label) return control;
  return (
    <label className="inline-flex items-center gap-2.5 text-[13px] text-ink/85 cursor-pointer">
      {control}
      <span>{label}</span>
    </label>
  );
}
