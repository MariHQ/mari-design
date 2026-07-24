import { ChevronRight } from "lucide-react";
import { Link } from "./Link";
import { Scrollable } from "../data-display/Scrollable";
import { focusRing } from "../tokens/focusRing";

export type Crumb = { label: string; href?: string };

/* Crumbs never shrink below their own truncation cap: on a narrow screen a
   long trail used to crush every label to one letter. The row scrolls
   instead (CONVENTIONS.md §20). */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <Scrollable scrollerClassName="flex items-center gap-1.5 text-[12.5px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <span key={i} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <ChevronRight size={16} className="text-ink/65" aria-hidden="true" />}
              {item.href && !last ? (
                <Link href={item.href} className="max-w-[16rem] truncate rounded-[3px] text-ink/70 hover:text-ink">{item.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={`max-w-[16rem] truncate ${last ? "font-medium text-ink" : "text-ink/70"}`}>{item.label}</span>
              )}
            </span>
          );
        })}
      </Scrollable>
    </nav>
  );
}
