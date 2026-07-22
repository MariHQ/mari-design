import type { CSSProperties, ReactNode } from "react";

/* Loading placeholder that mirrors the shape of content about to appear — a
   skeleton screen, not a spinner. A soft grey block with a shimmer sweep; the
   sweep is frozen (off-screen) when animations are disabled, so it degrades to
   a clean flat placeholder. `Skeleton` is the primitive bar; the composed
   pieces below (SkeletonText, SkeletonCard, SkeletonTable, …) build realistic
   layouts. See also Skeletons.tsx / SkeletonPage for full-page loading. */

export function Skeleton({
  className = "", width, height, rounded = "rounded-[5px]", tone = "bg-ink/[0.06]", shimmer = true,
}: {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  rounded?: string;
  tone?: string;
  shimmer?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden ${rounded} ${tone} ${className}`.trim()}
      style={{ width, height }}
    >
      {shimmer && (
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer" />
      )}
    </span>
  );
}

/* ── Primitive shapes ─────────────────────────────────────────────────────── */

export function SkeletonLine({ w = "100%", h = 12, className = "" }: { w?: CSSProperties["width"]; h?: number; className?: string }) {
  return <Skeleton width={w} height={h} rounded="rounded-full" className={className} />;
}

export function SkeletonText({ lines = 3, className = "", lastWidth = "60%" }: { lines?: number; className?: string; lastWidth?: string }) {
  return (
    <div className={`space-y-2 ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? lastWidth : "100%"} h={11} />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 32, className = "" }: { size?: number; className?: string }) {
  return <Skeleton width={size} height={size} rounded="rounded-full" className={className} />;
}

export function SkeletonChip({ w = 64, className = "" }: { w?: number; className?: string }) {
  return <Skeleton width={w} height={20} rounded="rounded-[3px]" className={className} />;
}

export function SkeletonButton({ w = 84, className = "" }: { w?: number; className?: string }) {
  return <Skeleton width={w} height={34} rounded="rounded-[4px]" className={className} />;
}

/* ── Composed blocks ──────────────────────────────────────────────────────── */

/** A titled card skeleton: header row (icon + title + action), body text, and
    an optional footer chip row. Matches the console Card silhouette. */
export function SkeletonCard({ lines = 3, media = false, footer = false, className = "" }: { lines?: number; media?: boolean; footer?: boolean; className?: string }) {
  return (
    <div className={`rounded-md border border-ink/12 bg-paper p-4 ${className}`.trim()} aria-hidden="true">
      <div className="mb-3 flex items-center gap-2.5">
        <SkeletonCircle size={26} />
        <SkeletonLine w="42%" h={12} />
        <span className="ml-auto"><SkeletonChip w={52} /></span>
      </div>
      {media && <Skeleton height={120} className="mb-3" />}
      <SkeletonText lines={lines} />
      {footer && (
        <div className="mt-3 flex gap-2">
          <SkeletonChip w={60} /><SkeletonChip w={44} />
        </div>
      )}
    </div>
  );
}

/** A big-number stat tile skeleton. */
export function SkeletonStat({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-md border border-ink/12 bg-paper p-4 ${className}`.trim()} aria-hidden="true">
      <div className="flex items-start justify-between">
        <Skeleton width={72} height={30} />
        <SkeletonCircle size={30} />
      </div>
      <SkeletonLine w="55%" h={10} className="mt-3" />
      <SkeletonLine w="38%" h={9} className="mt-2" />
    </div>
  );
}

/** A single list row: avatar + two text lines + trailing meta. */
export function SkeletonListRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`.trim()} aria-hidden="true">
      <SkeletonCircle size={30} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonLine w="45%" h={11} />
        <SkeletonLine w="72%" h={9} />
      </div>
      <SkeletonChip w={56} />
    </div>
  );
}

export function SkeletonList({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`divide-y divide-ink/[0.08] rounded-md border border-ink/12 bg-paper px-4 ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => <SkeletonListRow key={i} />)}
    </div>
  );
}

/** A table skeleton with a header row and body rows. */
export function SkeletonTable({ rows = 6, cols = 4, className = "" }: { rows?: number; cols?: number; className?: string }) {
  const widths = ["40%", "70%", "55%", "60%", "50%", "65%"];
  return (
    <div className={`overflow-hidden rounded-md border border-ink/12 bg-paper ${className}`.trim()} aria-hidden="true">
      <div className="flex gap-4 border-b border-ink/10 bg-flysch/50 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, c) => <SkeletonLine key={c} w={70} h={9} />)}
      </div>
      <div className="divide-y divide-ink/[0.08]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex-1"><SkeletonLine w={widths[(r + c) % widths.length]} h={11} /></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Wrap real content or a skeleton depending on `loading`. */
export function SkeletonSwitch({ loading, skeleton, children }: { loading: boolean; skeleton: ReactNode; children: ReactNode }) {
  return <>{loading ? skeleton : children}</>;
}
