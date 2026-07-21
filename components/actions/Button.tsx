import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import { focusRing } from "../tokens/focusRing";

type ButtonVariant = "default" | "primary" | "success" | "danger" | "link";

const BASE = `inline-flex items-center justify-center gap-1.5 rounded-[4px] font-medium transition-colors disabled:opacity-45 disabled:pointer-events-none ${focusRing}`;

const SIZE = {
  normal: "h-9 px-3.5 text-[13px]",
  compact: "h-7 px-2.5 text-[12.5px]",
  icon: "w-9 h-9 p-0",
};

const VARIANT: Record<ButtonVariant, string> = {
  default: "border border-ink/20 bg-paper text-ink/80 hover:border-ink/45 hover:text-ink",
  primary: "bg-biscay text-white font-semibold hover:bg-biscay-2",
  success: "bg-moss text-white font-semibold hover:bg-[#235939]",
  danger: "border border-espelette/40 bg-paper text-espelette hover:bg-espelette/[0.06] hover:border-espelette",
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
