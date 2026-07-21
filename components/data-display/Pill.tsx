import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck, Bell, Check, FileCheck, Ban } from "lucide-react";
import { Chip, type ChipTone } from "./Chip";

/* Pill — an icon-leading verification/status pill. Distinct from Badge (no
   icon) and StatusChip (dot indicator): each kind carries a semantic glyph,
   which is what makes a "Verified" or "Fact check" state read at a glance.
   Ported from the console's components/shared.tsx Pill. Prop-driven: pass a
   known `kind` (or any string) and optionally override the `label`. */

export type PillKind =
  | "canonical" | "verified" | "approval" | "factcheck"
  | "needs-review" | "stale" | "deprecated" | "draft";

const PILL: Record<PillKind, { tone: ChipTone; label: string; icon: ReactNode }> = {
  canonical: { tone: "ok", label: "Canonical", icon: <CheckCircle2 size={12} /> },
  verified: { tone: "info", label: "Verified", icon: <ShieldCheck size={12} /> },
  approval: { tone: "ok", label: "Approval", icon: <Check size={12} strokeWidth={2.6} /> },
  factcheck: { tone: "info", label: "Fact check", icon: <FileCheck size={12} /> },
  "needs-review": { tone: "attention", label: "Needs review", icon: <Bell size={12} /> },
  stale: { tone: "attention", label: "Stale", icon: <Bell size={12} /> },
  deprecated: { tone: "blocked", label: "Deprecated", icon: <Ban size={12} /> },
  draft: { tone: "neutral", label: "Draft", icon: <Check size={12} /> },
};

export type PillProps = {
  kind: string;
  /** Override the derived label. */
  text?: ReactNode;
  /** Override the derived tone. */
  tone?: string;
  className?: string;
};

export function Pill({ kind, text, tone, className }: PillProps) {
  const preset = PILL[kind as PillKind];
  return (
    <Chip
      label={text ?? preset?.label ?? kind}
      tone={tone ?? preset?.tone ?? "neutral"}
      icon={preset?.icon ?? <Check size={12} />}
      className={className}
    />
  );
}
