import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { focusRing } from "../tokens/focusRing";
import { btnDisabled } from "./buttons";

type ButtonVariant = "default" | "primary" | "success" | "danger" | "link";

// `min-h` (not a fixed `h`) plus `break-words`: a long label wraps inside the
// button instead of spilling out the top and bottom of a 36px box.
const BASE = `inline-flex items-center justify-center gap-1.5 rounded-[4px] font-medium transition-colors max-w-full overflow-hidden [overflow-wrap:anywhere] ${btnDisabled} ${focusRing}`;

const SIZE = {
  normal: "min-h-9 py-1.5 px-3.5 text-[13px]",
  compact: "min-h-7 py-1 px-2.5 text-[12.5px]",
  icon: "w-9 h-9 shrink-0 p-0",
};

const VARIANT: Record<ButtonVariant, string> = {
  default: "border border-ink/25 bg-paper text-ink/85 hover:border-ink/45 hover:text-ink active:bg-ink/[0.05]",
  primary: "bg-biscay text-white font-semibold hover:bg-biscay-2 active:bg-[#16334d]",
  success: "bg-moss text-white font-semibold hover:bg-[#235939] active:bg-[#1d4a30]",
  danger: "border border-espelette/50 bg-paper text-espelette hover:bg-espelette/[0.08] hover:border-espelette active:bg-espelette/[0.14]",
  link: "h-auto px-0 text-biscay-2 hover:text-ink hover:underline underline-offset-[3px] bg-transparent",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  compact?: boolean;
  icon?: boolean;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", compact = false, icon = false, block = false, className = "", type = "button", ...rest },
  ref,
) {
  const size = variant === "link" ? "" : icon ? SIZE.icon : compact ? SIZE.compact : SIZE.normal;
  const classes = [BASE, size, VARIANT[variant], block && "w-full", className].filter(Boolean).join(" ");
  return <button ref={ref} type={type} className={classes} {...rest} />;
});
