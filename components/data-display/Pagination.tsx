import { useMemo, useState, type ReactNode } from "react";
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

/* ── Volume controls ──────────────────────────────────────────────────────
   Real tables carry hundreds of rows, not the dozen a fixture ships with.
   Rendering all of them grows a card to ten thousand pixels and buries the
   thing the reader came for. Every list in the console therefore either
   paginates or scrolls inside a bounded box, and always says how many rows
   there really are (CONVENTIONS.md §13, §20).

   `usePaged` is the one pager brain: it clamps the page whenever the row set
   shrinks under it (filtering used to strand the reader on an empty page 9). */

export function usePaged<T>(rows: T[], pageSize = 25) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => (rows.length > pageSize ? rows.slice(cur * pageSize, cur * pageSize + pageSize) : rows),
    [rows, cur, pageSize],
  );
  return {
    page: cur,
    setPage,
    pageCount,
    pageRows,
    paged: rows.length > pageSize,
    from: rows.length === 0 ? 0 : cur * pageSize + 1,
    to: Math.min((cur + 1) * pageSize, rows.length),
    total: rows.length,
  };
}

/** Result-count strip. Renders ABOVE the list it describes (CONVENTIONS §13). */
export function ResultCount({
  from, to, total, noun = "rows", note, actions, className = "",
}: {
  from: number;
  to: number;
  total: number;
  /** Plural noun for the counted thing: "members", "events", "findings". */
  noun?: string;
  /** Extra clause appended after the count. */
  note?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const all = from <= 1 && to >= total;
  return (
    <div className={`flex items-center gap-3 border-b border-ink/10 bg-flysch/40 px-4 py-2 font-term text-[11.5px] text-ink/65 ${className}`.trim()}>
      <span className="min-w-0 truncate">
        {total === 0
          ? `No ${noun}`
          : all
            ? `${total.toLocaleString("en-US")} ${noun}`
            : `Showing ${from.toLocaleString("en-US")} to ${to.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${noun}`}
        {note ? ` · ${note}` : ""}
      </span>
      {actions && <span className="ml-auto flex shrink-0 items-center gap-2">{actions}</span>}
    </div>
  );
}

/** The pager rail that closes a paginated card: page N of M, prev, next. */
export function PagerBar({
  page, pageCount, onChange, className = "",
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const total = Math.max(1, pageCount);
  const cur = Math.min(Math.max(0, page), total - 1);
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-ink/10 px-4 py-2.5 font-term text-[11.5px] text-ink/65 ${className}`.trim()}>
      <span className="min-w-0 truncate">Page {cur + 1} of {total}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button disabled={cur === 0} onClick={() => onChange(Math.max(0, cur - 1))} aria-label="Previous page" className={pagerBtn}><ChevronLeft size={14} /></button>
        <button disabled={cur >= total - 1} onClick={() => onChange(Math.min(total - 1, cur + 1))} aria-label="Next page" className={pagerBtn}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
