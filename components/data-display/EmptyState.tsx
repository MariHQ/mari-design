import type { ReactNode } from "react";

/* The one empty state — centered icon, bold title, muted message, optional
   action. Use inside a Card/Table/DataTable body, not as a full-page state. */
export function EmptyState({
  icon, title, action, children,
}: {
  icon?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6">
      {icon && <span className="text-ink/25 mb-1" aria-hidden="true">{icon}</span>}
      {title && <b className="text-[14px] font-semibold text-ink">{title}</b>}
      <span className="text-[13px] text-ink/55 max-w-[360px]">{children}</span>
      {action && <span className="mt-2">{action}</span>}
    </div>
  );
}
