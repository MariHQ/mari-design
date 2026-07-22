import { ChevronRight } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight size={16} className="text-ink/65" aria-hidden="true" />}
            {item.href && !last ? (
              <a href={item.href} className={`min-w-0 max-w-[16rem] truncate rounded-[3px] text-ink/70 hover:text-ink ${focusRing}`}>{item.label}</a>
            ) : (
              <span aria-current={last ? "page" : undefined} className={`min-w-0 max-w-[16rem] truncate ${last ? "font-medium text-ink" : "text-ink/70"}`}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
