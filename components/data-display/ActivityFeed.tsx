import type { ReactNode } from "react";

export type ActivityItem = { id: string; actor?: string; action: string; time: string; icon?: ReactNode };

/* Chronological event log — grounded in the real product (LiveActivityFeed.tsx
   / AuditActivityFeed.tsx exist in mari/web/web/src/saas). A different
   layout from Table/DataTable: a connected timeline, not rows/columns. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="relative pl-6">
      <span className="absolute left-[9px] top-1 bottom-1 w-px bg-ink/10" aria-hidden="true" />
      {items.map((item) => (
        <li key={item.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-6 top-0.5 grid place-items-center w-[19px] h-[19px] rounded-full border border-ink/15 bg-paper text-ink/50" aria-hidden="true">
            {item.icon ?? <span className="w-[6px] h-[6px] rounded-full bg-ink/30" />}
          </span>
          <p className="text-[13px] text-ink/85">
            {item.actor && <span className="font-medium text-ink">{item.actor} </span>}
            {item.action}
          </p>
          <span className="font-term text-[11px] text-ink/40">{item.time}</span>
        </li>
      ))}
    </ol>
  );
}
