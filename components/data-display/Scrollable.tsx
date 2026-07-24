import type { HTMLAttributes, MutableRefObject } from "react";
import { useRef } from "react";

/* Scrollable — the one scroll container (CONVENTIONS.md §20).
 *
 * A scrollable region must SHOW that it scrolls, explicitly: an
 * always-visible, draggable scrollbar whenever content overflows. No gradient
 * fades, no edge shadows, no arrows — the scrollbar IS the indicator.
 * macOS overlay scrollbars hide until the user is already scrolling, so the
 * webkit styling below opts Chrome/Safari into a classic bar.
 *
 *   <Scrollable>…wide table…</Scrollable>
 *   <Scrollable axis="y" className="max-h-64">…long list…</Scrollable>
 *
 * `className` styles the wrapper (flex context, margins, borders, max
 * heights). `scrollerClassName` styles the scroll box itself (padding that
 * should scroll with the content). `fade` names the surface behind the
 * content and picks the scrollbar thumb color (white on the dark rail).
 */

type Axis = "x" | "y" | "both";

export type ScrollableProps = HTMLAttributes<HTMLDivElement> & {
  axis?: Axis;
  /** The surface behind the content; picks the scrollbar thumb color. */
  fade?: "paper" | "flysch" | "biscay";
  /** Classes for the inner scroll box (padding, gap, list layout). */
  scrollerClassName?: string;
  /** Access to the scroll box element (autoscroll-to-bottom, focus). */
  scrollerRef?: MutableRefObject<HTMLDivElement | null> | ((el: HTMLDivElement | null) => void);
};

/* The scrollbar is visible and draggable whenever there is overflow, on both
   axes. Styling ::-webkit-scrollbar opts Chrome/Safari out of the macOS
   overlay scrollbar that hides until the user is already scrolling. Do NOT
   also set scrollbar-width/scrollbar-color: Chrome 121+ ignores the webkit
   pseudo styling when either is present, and the standard thin bar stays an
   auto-hiding overlay. `auto` overflow still means no bar when nothing
   overflows. */
const BAR_SHARED =
  "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 " +
  "[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full " +
  "[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding";
const BAR = {
  paper: `${BAR_SHARED} [&::-webkit-scrollbar-thumb]:bg-ink/35 [&::-webkit-scrollbar-thumb:hover]:bg-ink/55`,
  flysch: `${BAR_SHARED} [&::-webkit-scrollbar-thumb]:bg-ink/35 [&::-webkit-scrollbar-thumb:hover]:bg-ink/55`,
  biscay: `${BAR_SHARED} [&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-thumb:hover]:bg-white/60`,
} as const;

export function Scrollable({
  axis = "x", fade = "paper", className = "", scrollerClassName = "", scrollerRef, children, ...rest
}: ScrollableProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const setScroller = (el: HTMLDivElement | null) => {
    ref.current = el;
    if (typeof scrollerRef === "function") scrollerRef(el);
    else if (scrollerRef) scrollerRef.current = el;
  };

  /* Vertical scrolling never uses max-h-full: a percentage max-height is
     ignored when the wrapper's own height is auto or max-h capped (dropdown
     lists), and the content spills unclipped. Instead the wrapper is a flex
     column and the scroller shrinks (min-h-0), which honors both definite
     heights and max-h caps. */
  const isY = axis !== "x";
  const overflow = axis === "x" ? "overflow-x-auto" : axis === "y" ? "min-h-0 overflow-y-auto" : "min-h-0 overflow-auto";

  return (
    <div className={`relative min-w-0 ${isY ? "flex flex-col" : ""} ${className}`.trim()} {...rest}>
      <div ref={setScroller} className={`${overflow} ${BAR[fade]} ${scrollerClassName}`.trim()}>{children}</div>
    </div>
  );
}

export default Scrollable;
