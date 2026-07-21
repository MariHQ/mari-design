import { ChevronRight } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px]">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-ink/30" aria-hidden="true" />}
            {item.href && !last ? (
              <a href={item.href} className={`text-ink/55 hover:text-ink rounded-[3px] ${focusRing}`}>{item.label}</a>
            ) : (
              <span aria-current={last ? "page" : undefined} className={last ? "text-ink font-medium" : "text-ink/55"}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
