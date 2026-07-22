import { useState } from "react";
import { Feather, Pencil, CheckCircle2 } from "lucide-react";
import { Button } from "../actions/Button";
import { EmptyState } from "../data-display/EmptyState";
import { focusRing } from "../tokens/focusRing";

/* WelcomeGuideStep — the Welcome wizard's Step 2 style-guide picker: a
   radio-card list of built-in guide packs (mirroring the Library's GUIDES
   catalog) plus a "Start from scratch" option. Presentational — it emits
   onPick(id); the parent persists to the `onboarding` setting and the shared
   localStorage("mari.styleguide"). The pack ids are load-bearing and must match
   the Library's. Local RadioCardGroup is built here. Standalone. */

export const SCRATCH_ID = "scratch";

export type GuidePack = { id: string; name: string; description: string; rules?: number };

export const GUIDE_PACKS: GuidePack[] = [
  { id: "plain", name: "Plain language", description: "Short words, active voice, no jargon.", rules: 42 },
  { id: "microsoft", name: "Microsoft", description: "Microsoft Writing Style Guide conventions.", rules: 38 },
  { id: "google", name: "Google developer", description: "Google's developer documentation style.", rules: 35 },
  { id: "ap", name: "AP style", description: "Associated Press news style.", rules: 31 },
  { id: "chicago", name: "Chicago", description: "The Chicago Manual of Style.", rules: 29 },
];

export function guideName(id: string | null): string | null {
  if (id == null) return null;
  if (id === SCRATCH_ID) return "Start from scratch";
  return GUIDE_PACKS.find((p) => p.id === id)?.name ?? id;
}

export type WelcomeGuideStepProps = {
  guide?: string | null;
  saving?: boolean;
  onPick?: (id: string) => void;
  packs?: GuidePack[];
  className?: string;
};

export function WelcomeGuideStep({
  guide, saving = false, onPick, packs = GUIDE_PACKS, className = "",
}: WelcomeGuideStepProps) {
  const [selected, setSelected] = useState<string | null>(guide ?? "plain");
  const pick = (id: string) => { setSelected(id); onPick?.(id); };

  if (packs.length === 0) {
    return (
      <EmptyState icon={<Feather size={26} />} title="No style guides yet" action={<Button compact>Open Library → Style guides</Button>}>
        Add a style guide in the Library to use it as your project default.
      </EmptyState>
    );
  }

  const row = (id: string, name: string, description: string, icon: React.ReactNode, rules?: number) => {
    const active = selected === id;
    return (
      <label
        key={id}
        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${focusRing} ${
          saving ? "opacity-60 pointer-events-none" : ""
        } ${active ? "border-biscay-2 ring-1 ring-biscay-2/40 bg-biscay/[0.04]" : "border-ink/15 hover:border-ink/35"}`}
      >
        <input type="radio" name="wc-guide" className="accent-biscay shrink-0" disabled={saving} checked={active} onChange={() => pick(id)} />
        <span className="grid place-items-center w-8 h-8 rounded-full border border-ink/15 text-ink/55 shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <b className="text-[13.5px] font-semibold text-ink">{name}</b>
          <span className="block text-[12px] text-ink/60">{description}</span>
        </span>
        {rules != null && <span className="font-term text-[11px] text-ink/45 shrink-0">{rules} rules</span>}
        {active && <CheckCircle2 size={16} className="text-moss shrink-0" />}
      </label>
    );
  };

  return (
    <div className={`grid gap-2 ${className}`.trim()} role="radiogroup" aria-label="Style guide">
      {packs.map((p) => row(p.id, p.name, p.description, <Feather size={16} />, p.rules))}
      <div className="mt-1 pt-2 border-t border-ink/10">
        {row(SCRATCH_ID, "Start from scratch", "Build your own rules as you go.", <Pencil size={16} />)}
      </div>
    </div>
  );
}
