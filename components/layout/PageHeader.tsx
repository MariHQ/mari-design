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
    <header className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="shrink-0 mt-0.5" aria-hidden="true">{icon}</span>}
        <div className="min-w-0">
          {backLink && (
            <a href={backLink.href} className={`inline-flex items-center gap-1 mb-1.5 text-[12.5px] font-medium text-ink/55 hover:text-ink rounded-[3px] ${focusRing}`}>
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
          <h3 className="text-[22px] font-bold tracking-[-0.015em] text-ink truncate">{title}</h3>
          {description && <p className="text-[13px] text-ink/60 mt-1 max-w-[680px]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
