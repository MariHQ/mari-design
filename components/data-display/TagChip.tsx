import { Chip } from "./Chip";
import { SkeletonChip } from "./Skeleton";

/* TagChip — a knowledge-tag preset over <Chip>: each tag maps to a label, a
   tone (from our 5-tone scale) and a status dot. Selectable and removable.
   Ported from components/TagChip.tsx; the console's extra palette colors
   (terra/violet) collapse onto our semantic tones. */

export type TagKind =
  | "canonical" | "draft" | "stale" | "deprecated"
  | "internal" | "customer-facing" | "needs-review" | "verified";

export const TAG_OPTIONS: TagKind[] = [
  "canonical", "draft", "stale", "deprecated", "internal", "customer-facing", "needs-review",
];

const TAG_TONE: Record<string, string> = {
  canonical: "ok",
  draft: "neutral",
  stale: "attention",
  deprecated: "blocked",
  internal: "neutral",
  "customer-facing": "info",
  "needs-review": "attention",
  verified: "info",
};

const TAG_LABEL: Record<string, string> = {
  canonical: "Canonical",
  draft: "Draft",
  stale: "Stale",
  deprecated: "Deprecated",
  internal: "Internal",
  "customer-facing": "Customer-facing",
  "needs-review": "Needs review",
  verified: "Verified",
};

export type TagChipProps = {
  tag: string;
  /** Override the derived label. */
  label?: string;
  /** Override the derived tone. */
  tone?: string;
  removable?: boolean;
  onRemove?: () => void;
  selected?: boolean;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
};

export function TagChip({
  tag, label, tone, removable = false, onRemove, selected = false, onClick, loading = false, className,
}: TagChipProps) {
  if (loading) return <SkeletonChip className={className} />;
  return (
    <Chip
      label={label ?? TAG_LABEL[tag] ?? tag}
      tone={tone ?? TAG_TONE[tag] ?? "neutral"}
      dot
      selected={selected}
      onClick={onClick}
      onRemove={removable ? onRemove : undefined}
      removeLabel={`Remove ${label ?? TAG_LABEL[tag] ?? tag}`}
      className={className}
    />
  );
}
