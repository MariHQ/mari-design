import type { ReactNode } from "react";
import { card } from "../tokens/card";
import { SkeletonLine } from "./Skeleton";

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

const bodyWidths = ["40%", "70%", "55%", "60%", "50%", "65%"];

export function Table({ title, count, head, footer, minW = 700, loading = false, children }: { title?: string; count?: number; head: string[]; footer?: ReactNode; minW?: number; loading?: boolean; children: ReactNode }) {
  return (
    <div className={`${card} mt-5 overflow-hidden`}>
      {title && (
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <h4 className="text-[15px] font-semibold text-ink">{title}</h4>
          {count != null && <span className="font-term text-[11px] font-medium text-ink/60 bg-flysch border border-ink/10 rounded-[3px] px-1.5 py-0.5">{count}</span>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ minWidth: minW }}>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} className={`${thClass} px-4 py-2.5 border-y border-ink/10`}>
                  {loading ? <SkeletonLine w={Math.min(90, 32 + h.length * 6)} h={9} /> : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, r) => (
                  <tr key={r} className="border-b border-ink/10 last:border-0">
                    {head.map((h, c) => (
                      <td key={h} className="px-4 py-3">
                        <SkeletonLine w={bodyWidths[(r + c) % bodyWidths.length]} h={11} />
                      </td>
                    ))}
                  </tr>
                ))
              : children}
          </tbody>
        </table>
      </div>
      {!loading && footer}
    </div>
  );
}
