import * as RG from "@radix-ui/react-radio-group";
import { focusRing } from "../tokens/focusRing";

export type RadioOption = { value: string; label: string; hint?: string };

export function RadioGroup({
  value, onValueChange, options, ariaLabel, disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <RG.Root value={value} onValueChange={onValueChange} aria-label={ariaLabel} disabled={disabled} className="flex flex-col gap-2.5">
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-start gap-2.5 text-[13px] text-ink/85 cursor-pointer">
          <RG.Item
            value={opt.value}
            className={`mt-0.5 grid place-items-center w-[16px] h-[16px] shrink-0 rounded-full border border-ink/25 bg-paper data-[state=checked]:border-biscay disabled:opacity-50 disabled:pointer-events-none ${focusRing}`}
          >
            <RG.Indicator className="w-[8px] h-[8px] rounded-full bg-biscay" />
          </RG.Item>
          <span>
            {opt.label}
            {opt.hint && <span className="block text-[12px] text-ink/50 mt-0.5">{opt.hint}</span>}
          </span>
        </label>
      ))}
    </RG.Root>
  );
}
