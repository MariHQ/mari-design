import { type ReactNode, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "../layout/Card";
import { Chip, type ChipTone } from "./Chip";
import { EmptyState } from "./EmptyState";
import { Input } from "../forms/Input";
import { focusRing } from "../tokens/focusRing";

/* RulesPanel — a searchable rule catalog with severity. Ported from the
   console's library RulesPanel (the deterministic rule registry), decoupled
   from settings: rules are passed in and per-rule status changes are emitted
   as a callback. Filters (family + text) are managed locally. The
   active/zero/ignore status control only appears when `onStatusChange` is
   given. */

export type RuleSeverity = "error" | "warn" | "advisory";
export type RuleStatus = "active" | "zero" | "ignored";

export type RuleRow = {
  id: string;
  /** Grouping such as "Clarity" or "Inclusive"; used for the family filter. */
  family: string;
  severity: RuleSeverity;
  description: string;
  /** Optional pack / list label. */
  pack?: string;
  status?: RuleStatus;
};

const SEVERITY_TONE: Record<RuleSeverity, ChipTone> = {
  error: "blocked",
  warn: "attention",
  advisory: "neutral",
};

const STATUS_STEPS: { id: RuleStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "zero", label: "Zero" },
  { id: "ignored", label: "Ignore" },
];

export type RulesPanelProps = {
  rules: RuleRow[];
  onStatusChange?: (id: string, status: RuleStatus) => void;
  searchable?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  className?: string;
};

export function RulesPanel({
  rules, onStatusChange, searchable = true, title = "Rule catalog", hint, className,
}: RulesPanelProps) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | "All">("All");

  const families = useMemo(() => Array.from(new Set(rules.map((r) => r.family))), [rules]);

  const visible = useMemo(
    () =>
      rules.filter(
        (r) =>
          (family === "All" || r.family === family) &&
          `${r.id} ${r.description} ${r.family} ${r.pack ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [rules, family, query],
  );

  return (
    <Card variant="flush" title={title} hint={hint ?? `${rules.length} rules`} className={className}>
      <div className="px-4 pb-4 border-t border-ink/10 pt-3">
        {searchable && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <label className={`flex items-center gap-2 flex-1 min-w-[12rem] h-9 px-3 rounded-[4px] border border-ink/20 bg-paper text-ink/50 focus-within:border-biscay-2 focus-within:ring-1 focus-within:ring-biscay-2/40`}>
              <Search size={15} />
              <input
                className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-ink/40"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a rule or family"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Chip label="All" tone={family === "All" ? "info" : "neutral"} selected={family === "All"} onClick={() => setFamily("All")} />
          {families.map((f) => (
            <Chip key={f} label={f} tone={family === f ? "info" : "neutral"} selected={family === f} onClick={() => setFamily(f)} />
          ))}
        </div>

        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {visible.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <div className="flex-1 min-w-[14rem]">
                <code className="font-term text-[12px] font-medium text-ink">{r.id}</code>
                <div className="text-[12.5px] text-ink/60 mt-0.5">{r.description}</div>
              </div>
              <div className="w-28 shrink-0">
                <div className="text-[12.5px] font-medium text-ink/80">{r.family}</div>
                {r.pack && <div className="font-term text-[11px] text-ink/50">{r.pack}</div>}
              </div>
              <Chip label={r.severity} tone={SEVERITY_TONE[r.severity]} caps className="shrink-0" />
              {onStatusChange && (
                <div className="inline-flex shrink-0 rounded-[4px] border border-ink/20 overflow-hidden" role="group" aria-label={`${r.id} status`}>
                  {STATUS_STEPS.map((s, i) => {
                    const on = (r.status ?? "active") === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onStatusChange(r.id, s.id)}
                        className={[
                          "px-2.5 h-7 font-term text-[11.5px] transition-colors",
                          i > 0 && "border-l border-ink/20",
                          on ? "bg-biscay text-white font-medium" : "bg-paper text-ink/65 hover:text-ink hover:bg-ink/[0.04]",
                          focusRing,
                        ].filter(Boolean).join(" ")}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div className="py-3">
              <EmptyState icon={<Search size={20} />}>No rules match these filters.</EmptyState>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
