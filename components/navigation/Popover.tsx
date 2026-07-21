import type { ReactNode } from "react";
import * as RPop from "@radix-ui/react-popover";
import { card } from "../tokens/card";

export type PopoverProps = {
  trigger: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  children: ReactNode;
};

/* Click-open card popover (Radix). For hover hints use Tooltip; for
   action lists use Menu. */
export function Popover({ trigger, align = "end", side = "bottom", className = "", children }: PopoverProps) {
  return (
    <RPop.Root>
      <RPop.Trigger asChild>{trigger}</RPop.Trigger>
      <RPop.Portal>
        <RPop.Content className={`${card} p-4 z-50 ${className}`.trim()} align={align} side={side} sideOffset={7}>
          {children}
        </RPop.Content>
      </RPop.Portal>
    </RPop.Root>
  );
}
