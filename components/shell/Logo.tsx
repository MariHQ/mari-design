import type { SVGProps } from "react";

/* Brandmark — a blueprint mark in currentColor, so it reads on the dark
   biscay sidebar (light stroke) or the light header (ink stroke) alike.
   A geometric cloud with two "data" lines: the source app's hand-woven
   CloudLogo, redrawn in the console's ruled/blueprint idiom. */
export function Brandmark({ size = 28, ...rest }: { size?: number } & Omit<SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {/* cloud outline */}
      <path d="M9.5 22.5 A5 5 0 0 1 9 12.6 A6.5 6.5 0 0 1 21.7 11.3 A4.6 4.6 0 0 1 23 22.5 Z" />
      {/* ruled lines inside the mark */}
      <path d="M11 15.5 H21.5" opacity={0.55} />
      <path d="M10 18.5 H22" opacity={0.4} />
    </svg>
  );
}

export type LogoProps = {
  /** Mark height in px. */
  size?: number;
  /** Wordmark text; pass `false` to render the mark only. */
  wordmark?: string | false;
  className?: string;
};

/* Full lockup — mark + wordmark. `color` inherits, so it works on any
   surface. Drop it in the HeaderBar brand slot or the Sidebar header. */
export function Logo({ size = 26, wordmark = "Mari", className = "" }: LogoProps) {
  return (
    <span className={["inline-flex items-center gap-2 text-current", className].filter(Boolean).join(" ")}>
      <Brandmark size={size} />
      {wordmark !== false && (
        <span className="font-display text-[17px] font-semibold tracking-[-0.01em]">{wordmark}</span>
      )}
    </span>
  );
}
