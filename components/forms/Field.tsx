import type { ReactNode } from "react";
import { SectionLabel } from "./SectionLabel";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2.5 border-b border-ink/10 last:border-0">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-[13px] text-ink/90">{children}</div>
    </div>
  );
}
