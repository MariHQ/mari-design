import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

export type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  backLink?: { href: string; label: string };
};

/* Header-only fragment, for screens that need more control over body layout
   than Page gives — Page owns the full-screen padding + header + children,
   PageHeader is just the header block on its own. Same typography as Page
   so the two are interchangeable at the header level. */
export function PageHeader({ title, eyebrow, description, icon, actions, backLink }: PageHeaderProps) {
  return (
    // flex-wrap + a min-width on the title block: a `shrink-0` actions slot used
    // to eat the entire row at phone widths, truncating titles to "D." and
    // wrapping the description one word per line. Actions now drop to their own
    // line instead of crushing the title.
    <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
      <div className="flex min-w-[15rem] flex-1 items-start gap-3">
        {icon && <span className="shrink-0 mt-0.5" aria-hidden="true">{icon}</span>}
        <div className="min-w-0">
          {backLink && (
            <a href={backLink.href} className={`inline-flex items-center gap-1 mb-1.5 text-[12.5px] font-medium text-ink/65 hover:text-ink rounded-[3px] ${focusRing}`}>
              <ArrowLeft size={13} />
              {backLink.label}
            </a>
          )}
          {eyebrow && (
            <div className="flex items-center gap-2 mb-1.5 font-term text-[10.5px] font-medium uppercase tracking-[0.18em] text-biscay-2">
              <span className="inline-block w-[7px] h-[7px] bg-biscay-2" aria-hidden />
              {eyebrow}
            </div>
          )}
          <h3 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink [overflow-wrap:anywhere]">{title}</h3>
          {description && <p className="mt-1 max-w-[680px] text-[13px] text-ink/70 [overflow-wrap:anywhere]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
