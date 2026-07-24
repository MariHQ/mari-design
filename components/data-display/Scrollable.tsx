import type { HTMLAttributes, MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";

/* Scrollable — the one scroll container (CONVENTIONS.md §20).
 *
 * A scrollable region must SHOW that it scrolls: macOS hides scrollbars until
 * the user is already scrolling, so a table cut off mid-column or a tab row
 * cut off mid-label reads as "that's all there is". This wrapper renders an
 * always-visible, draggable scrollbar and, on any edge with hidden content, a
 * quiet gradient fade. The fades are pointer-transparent and update live on
 * scroll and on resize.
 *
 *   <Scrollable>…wide table…</Scrollable>
 *   <Scrollable axis="y" className="max-h-64">…long list…</Scrollable>
 *
 * `className` styles the wrapper (flex context, margins, borders, max
 * heights). `scrollerClassName` styles the scroll box itself (padding that
 * should scroll with the content). `fade` picks the overlay color to match
 * the surface behind the content: paper (default) or flysch for code boxes.
 */

type Axis = "x" | "y" | "both";

const EPS = 2;

export type ScrollableProps = HTMLAttributes<HTMLDivElement> & {
  axis?: Axis;
  /** Overlay gradient base, matching the scroller's background. */
  fade?: "paper" | "flysch" | "biscay";
  /** Classes for the inner scroll box (padding, gap, list layout). */
  scrollerClassName?: string;
  /** Access to the scroll box element (autoscroll-to-bottom, focus). */
  scrollerRef?: MutableRefObject<HTMLDivElement | null> | ((el: HTMLDivElement | null) => void);
};

/* Edge SHADOWS, not surface-colored fades: a paper fade over paper content is
   invisible, which is exactly where the indicator matters most (mobile
   toolbars cut off mid-label). An ink-tinted shadow reads on every surface;
   the dark rail gets a deeper one. `fade` names the surface behind the
   content and also picks the scrollbar thumb color. */
const SHADOW_FROM = { paper: "from-ink/[0.14]", flysch: "from-ink/[0.14]", biscay: "from-black/35" } as const;

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
  const [edge, setEdge] = useState({ left: false, right: false, up: false, down: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = {
        left: axis !== "y" && el.scrollLeft > EPS,
        right: axis !== "y" && el.scrollLeft + el.clientWidth < el.scrollWidth - EPS,
        up: axis !== "x" && el.scrollTop > EPS,
        down: axis !== "x" && el.scrollTop + el.clientHeight < el.scrollHeight - EPS,
      };
      setEdge((e) =>
        e.left === next.left && e.right === next.right && e.up === next.up && e.down === next.down ? e : next);
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", measure); ro.disconnect(); };
  }, [axis]);

  /* Vertical scrolling never uses max-h-full: a percentage max-height is
     ignored when the wrapper's own height is auto or max-h capped (dropdown
     lists), and the content spills unclipped. Instead the wrapper is a flex
     column and the scroller shrinks (min-h-0), which honors both definite
     heights and max-h caps. */
  const isY = axis !== "x";
  const overflow = axis === "x" ? "overflow-x-auto" : axis === "y" ? "min-h-0 overflow-y-auto" : "min-h-0 overflow-auto";
  const from = SHADOW_FROM[fade];
  const hint = "pointer-events-none absolute z-10 transition-opacity duration-150";

  return (
    <div className={`relative min-w-0 ${isY ? "flex flex-col" : ""} ${className}`.trim()} {...rest}>
      <div ref={setScroller} className={`${overflow} ${BAR[fade]} ${scrollerClassName}`.trim()}>{children}</div>
      <span aria-hidden className={`${hint} left-0 top-0 bottom-0 w-3 bg-gradient-to-r ${from} ${edge.left ? "opacity-100" : "opacity-0"}`} />
      <span aria-hidden className={`${hint} right-0 top-0 bottom-0 w-3 bg-gradient-to-l ${from} ${edge.right ? "opacity-100" : "opacity-0"}`} />
      <span aria-hidden className={`${hint} top-0 left-0 right-0 h-3 bg-gradient-to-b ${from} ${edge.up ? "opacity-100" : "opacity-0"}`} />
      <span aria-hidden className={`${hint} bottom-0 left-0 right-0 h-3 bg-gradient-to-t ${from} ${edge.down ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

export default Scrollable;
