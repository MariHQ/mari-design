import { useState, Fragment, type ReactNode } from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import type { Column } from "./DataTable";

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

/* ── ExpandableTable: rows that expand to an inline detail region ────────
   A chevron in the leading cell toggles a full-width detail row rendered by
   `renderDetail(row)`. Multiple rows may be open unless `single` is set. */
export function ExpandableTable<T>({
  rows, columns, rowKey, renderDetail, single = false, defaultExpanded = [],
  minW = 720, empty = "No results", expandLabel = "Toggle details",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  renderDetail: (row: T) => ReactNode;
  /** Only one row open at a time. */
  single?: boolean;
  defaultExpanded?: string[];
  minW?: number;
  empty?: string;
  expandLabel?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultExpanded));

  const toggle = (key: string) => {
    setOpen((prev) => {
      if (single) return prev.has(key) ? new Set() : new Set([key]);
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const colSpan = columns.length + 1;

  return (
    <div className={`${card} mt-5 overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: minW }}>
          <thead>
            <tr>
              <th className="px-4 py-2.5 border-b border-ink/10 w-9" aria-hidden />
              {columns.map((c) => (
                <th key={c.key} className={`${thClass} px-4 py-2.5 border-b border-ink/10 ${c.align === "right" ? "text-right" : ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <div className="grid place-items-center py-16 text-center">
                    <Inbox size={24} className="text-ink/25" />
                    <p className="mt-2 text-[13px] text-ink/60">{empty}</p>
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => {
              const key = rowKey(row);
              const isOpen = open.has(key);
              return (
                <Fragment key={key}>
                  <tr
                    onClick={() => toggle(key)}
                    className={`border-b border-ink/10 cursor-pointer hover:bg-flysch/50 ${isOpen ? "bg-flysch/40" : ""}`}
                  >
                    <td className="px-4 py-3 w-9">
                      <button
                        type="button"
                        aria-label={expandLabel}
                        aria-expanded={isOpen}
                        onClick={(e) => { e.stopPropagation(); toggle(key); }}
                        className={`grid place-items-center w-6 h-6 rounded-[4px] text-ink/50 hover:bg-ink/[0.06] hover:text-ink ${focusRing}`}
                      >
                        <ChevronRight size={15} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                    </td>
                    {columns.map((c) => <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""} ${c.cell ?? ""}`}>{c.render(row)}</td>)}
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-ink/10 last:border-0">
                      <td colSpan={colSpan} className="px-4 py-3 bg-flysch/30">
                        <div className="pl-5">{renderDetail(row)}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
