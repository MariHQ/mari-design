import type { HTMLAttributes, ReactNode } from "react";
import { card } from "../tokens/card";

type CardVariant = "default" | "plain" | "flush";

const PAD: Record<CardVariant, string> = {
  default: "p-4",
  plain: "p-5",
  flush: "p-0",
};

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  variant?: CardVariant;
  title?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
};

export function Card({ variant = "default", title, eyebrow, icon, actions, hint, className = "", children, ...rest }: CardProps) {
  const headed = Boolean(title || eyebrow || icon || actions || hint);
  return (
    <section className={`${card} ${className}`.trim()} {...rest}>
      {headed && (
        // flex-wrap + a min-width on the title block: at narrow widths the hint
        // and actions drop to their own line instead of crushing the title into
        // an ellipsis and overlapping the eyebrow.
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-4 pb-3">
          {icon}
          <div className="min-w-[9rem] flex-1">
            {eyebrow && <span className="block font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-biscay-2 mb-0.5">{eyebrow}</span>}
            {title && <h3 className="text-[15px] font-semibold leading-snug text-ink break-words">{title}</h3>}
          </div>
          {hint && <span className="min-w-0 max-w-full self-center font-term text-[11px] text-ink/65 [overflow-wrap:anywhere]">{hint}</span>}
          {actions && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </header>
      )}
      <div className={`${headed ? (variant === "flush" ? "" : `${PAD[variant]} pt-0`) : PAD[variant]} min-w-0 break-words`}>{children}</div>
    </section>
  );
}
