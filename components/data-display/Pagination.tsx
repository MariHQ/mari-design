import { ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

/* A disabled pager arrow keeps its (darker) outline and greys out the inside,
   so the control still reads as a control instead of dissolving into the page.
   CONVENTIONS §6. */
export const pagerBtn =
  `grid place-items-center w-7 h-7 rounded-[4px] border border-ink/30 bg-paper text-ink/75 hover:bg-flysch hover:border-ink/45 transition-colors ` +
  `disabled:opacity-100 disabled:cursor-not-allowed disabled:border-ink/40 disabled:bg-ink/[0.07] disabled:text-ink/35 disabled:hover:bg-ink/[0.07] ${focusRing}`;

/* Standalone pager — DataTable has one of these built in; use this one for
   paginating anything that isn't a table (a card grid, a feed). */
export function Pagination({
  page, pageCount, onChange, itemLabel,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  itemLabel?: string;
}) {
  // Clamp: an out-of-range `page` used to render nonsense like "10 / 9".
  const total = Math.max(1, pageCount);
  const cur = Math.min(Math.max(0, page), total - 1);
  return (
    <div className="flex items-center justify-between gap-3 font-term text-[11.5px] text-ink/65">
      {itemLabel && <span className="min-w-0 break-words">{itemLabel}</span>}
      <div className="flex shrink-0 items-center gap-1 ml-auto">
        <button disabled={cur === 0} onClick={() => onChange(Math.max(0, cur - 1))} aria-label="Previous page" className={pagerBtn}><ChevronLeft size={14} /></button>
        <span className="px-2 whitespace-nowrap">{cur + 1} / {total}</span>
        <button disabled={cur >= total - 1} onClick={() => onChange(Math.min(total - 1, cur + 1))} aria-label="Next page" className={pagerBtn}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
