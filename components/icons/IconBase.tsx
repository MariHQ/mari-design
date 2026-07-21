// Shared base for the bespoke line-art icon set.
// 24x24 viewBox, 1.6px round-cap strokes, painted with `currentColor` so every
// icon inherits the surrounding text color. Sized by the `size` prop.

import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Square edge length in px. Default 16. */
  size?: number;
  /** Stroke weight in user units. Default 1.6. */
  strokeWidth?: number;
}

export function IconBase({
  size = 16,
  strokeWidth = 1.6,
  className,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}
