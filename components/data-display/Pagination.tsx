import { ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

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
  return (
    <div className="flex items-center justify-between font-term text-[11.5px] text-ink/60">
      {itemLabel && <span>{itemLabel}</span>}
      <div className="flex items-center gap-1 ml-auto">
        <button disabled={page === 0} onClick={() => onChange(Math.max(0, page - 1))} aria-label="Previous page" className={`grid place-items-center w-7 h-7 rounded-[4px] border border-ink/20 text-ink/70 disabled:opacity-40 hover:bg-flysch ${focusRing}`}><ChevronLeft size={14} /></button>
        <span className="px-2">{page + 1} / {pageCount}</span>
        <button disabled={page >= pageCount - 1} onClick={() => onChange(Math.min(pageCount - 1, page + 1))} aria-label="Next page" className={`grid place-items-center w-7 h-7 rounded-[4px] border border-ink/20 text-ink/70 disabled:opacity-40 hover:bg-flysch ${focusRing}`}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
