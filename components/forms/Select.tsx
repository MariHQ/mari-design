import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`h-9 px-3 rounded-[4px] border border-ink/20 bg-paper text-[13px] text-ink/80 outline-none focus:border-biscay-2 focus:ring-1 focus:ring-biscay-2/40 disabled:opacity-50 disabled:pointer-events-none ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
});
