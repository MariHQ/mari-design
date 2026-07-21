import { Avatar } from "./Avatar";

/* AvatarGroup — overlapping avatars with an overflow "+N" bubble. Wraps the
   flat Avatar; each avatar gets a paper ring so the stack reads cleanly.
   Prop-driven: pass people (initials) and a `max` before the group collapses
   into a count. */

export type AvatarGroupProps = {
  people: { initials: string }[];
  /** Max avatars shown before an overflow bubble (default 4). */
  max?: number;
  className?: string;
};

export function AvatarGroup({ people, max = 4, className = "" }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={`flex items-center ${className}`.trim()}>
      {shown.map((p, i) => (
        <span key={i} className="rounded-full ring-2 ring-paper -ml-1.5 first:ml-0" title={p.initials}>
          <Avatar initials={p.initials} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="-ml-1.5 grid place-items-center w-[26px] h-[26px] rounded-full ring-2 ring-paper bg-ink/[0.08] border border-ink/15 font-term text-[10px] font-semibold text-ink/70"
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
