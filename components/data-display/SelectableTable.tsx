import { useMemo, useState, type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";
import type { Column } from "./DataTable";

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

function Check({ checked, indeterminate = false, onChange, label }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void; label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate && !checked; }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`w-3.5 h-3.5 rounded-[3px] border-ink/30 text-biscay-2 accent-biscay-2 cursor-pointer ${focusRing}`}
    />
  );
}

/* ── SelectableTable: row checkboxes + a bulk-action bar on selection ────
   Selection is internal (uncontrolled); onSelectionChange mirrors it out.
   When one or more rows are selected the header row is replaced by a bulk
   bar rendered from `bulkActions(selectedRows)`. */
export function SelectableTable<T>({
  rows, columns, rowKey, onRowClick, bulkActions, onSelectionChange,
  minW = 720, empty = "No results", selectAllLabel = "Select all rows",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Rendered in the bar shown while rows are selected. */
  bulkActions?: (selected: T[]) => ReactNode;
  onSelectionChange?: (selected: T[]) => void;
  minW?: number;
  empty?: string;
  selectAllLabel?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const emit = (next: Set<string>) => {
    setSelected(next);
    onSelectionChange?.(rows.filter((r) => next.has(rowKey(r))));
  };

  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
  const someSelected = keys.some((k) => selected.has(k));
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));

  const toggleAll = () => emit(allSelected ? new Set() : new Set(keys));
  const toggleRow = (key: string) => {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    emit(next);
  };

  const colSpan = columns.length + 1;

  return (
    <div className={`${card} mt-5 overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: minW }}>
          <thead>
            {someSelected ? (
              <tr>
                <th className="px-4 py-2.5 border-b border-ink/10 w-9">
                  <Check checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label={selectAllLabel} />
                </th>
                <th colSpan={columns.length} className="px-4 py-2 border-b border-ink/10">
                  <div className="flex items-center gap-3">
                    <span className="font-term text-[12px] font-medium text-ink">{selectedRows.length} selected</span>
                    <div className="flex items-center gap-2 ml-auto">{bulkActions?.(selectedRows)}</div>
                  </div>
                </th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-2.5 border-b border-ink/10 w-9">
                  <Check checked={allSelected} onChange={toggleAll} label={selectAllLabel} />
                </th>
                {columns.map((c) => (
                  <th key={c.key} className={`${thClass} px-4 py-2.5 border-b border-ink/10 ${c.align === "right" ? "text-right" : ""}`}>{c.header}</th>
                ))}
              </tr>
            )}
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
              const isSel = selected.has(key);
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-ink/10 last:border-0 ${isSel ? "bg-biscay-2/[0.06]" : ""} ${onRowClick ? "cursor-pointer hover:bg-flysch/50 group" : ""}`}
                >
                  <td className="px-4 py-3 w-9">
                    <Check checked={isSel} onChange={() => toggleRow(key)} label={`Select row`} />
                  </td>
                  {columns.map((c) => <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""} ${c.cell ?? ""}`}>{c.render(row)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
