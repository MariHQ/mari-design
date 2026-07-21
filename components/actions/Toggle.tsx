import type { ReactNode } from "react";
import * as RT from "@radix-ui/react-toggle";
import * as RTG from "@radix-ui/react-toggle-group";
import { focusRing } from "../tokens/focusRing";

const TOGGLE_CLASS = `inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] text-[12.5px] font-medium text-ink/60 border border-transparent hover:bg-flysch data-[state=on]:bg-biscay data-[state=on]:text-white transition-colors ${focusRing}`;

/** A single press-button with on/off state — e.g. "Show archived" next to a filter bar. */
export function Toggle({ pressed, onPressedChange, children, "aria-label": ariaLabel }: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <RT.Root pressed={pressed} onPressedChange={onPressedChange} aria-label={ariaLabel} className={TOGGLE_CLASS}>
      {children}
    </RT.Root>
  );
}

export type ToggleGroupOption = { value: string; label: ReactNode; "aria-label"?: string };

const GROUP_ITEM_CLASS = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] text-[12.5px] font-medium text-ink/60 hover:text-ink data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:border data-[state=on]:border-ink/15 ${focusRing}`;
const GROUP_ROOT_CLASS = "inline-flex items-center gap-1 p-1 rounded-md border border-ink/15 bg-flysch";

/* A group of mutually-visible toggle buttons — visually similar to Tabs'
   "seg" variant, but semantically a filter/view toggle, not navigation
   between separate content panels. Use Tabs when switching content;
   ToggleGroup when narrowing/filtering what's already shown. */
export type ToggleGroupProps =
  | { type: "single"; value: string; onValueChange: (value: string) => void; options: ToggleGroupOption[]; ariaLabel: string }
  | { type: "multiple"; value: string[]; onValueChange: (value: string[]) => void; options: ToggleGroupOption[]; ariaLabel: string };

export function ToggleGroup(props: ToggleGroupProps) {
  const { options, ariaLabel } = props;
  const items = options.map((opt) => (
    <RTG.Item key={opt.value} value={opt.value} aria-label={opt["aria-label"]} className={GROUP_ITEM_CLASS}>
      {opt.label}
    </RTG.Item>
  ));
  if (props.type === "multiple") {
    return (
      <RTG.Root type="multiple" value={props.value} onValueChange={props.onValueChange} aria-label={ariaLabel} className={GROUP_ROOT_CLASS}>
        {items}
      </RTG.Root>
    );
  }
  return (
    <RTG.Root type="single" value={props.value} onValueChange={props.onValueChange} aria-label={ariaLabel} className={GROUP_ROOT_CLASS}>
      {items}
    </RTG.Root>
  );
}
