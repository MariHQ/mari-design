import type { HTMLAttributes, MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

/* Scrollable — the one scroll container (CONVENTIONS.md §20).
 *
 * A scrollable region must SHOW that it scrolls: macOS hides scrollbars until
 * the user is already scrolling, so a table cut off mid-column or a tab row
 * cut off mid-label reads as "that's all there is". This wrapper measures the
 * scroller and, on any edge with hidden content, overlays a paper fade with a
 * small chevron. The overlays are pointer-transparent and update live on
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

/* biscay = the dark sidebar rail; its chevron flips to white for contrast. */
const FADE_FROM = { paper: "from-paper", flysch: "from-flysch", biscay: "from-biscay" } as const;
const HINT_INK = { paper: "text-ink/45", flysch: "text-ink/45", biscay: "text-white/60" } as const;

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

  const overflow = axis === "x" ? "overflow-x-auto" : axis === "y" ? "max-h-full overflow-y-auto" : "max-h-full overflow-auto";
  const from = FADE_FROM[fade];
  const hint = `pointer-events-none absolute z-10 flex ${HINT_INK[fade]} transition-opacity duration-150`;

  return (
    <div className={`relative min-w-0 ${className}`.trim()} {...rest}>
      <div ref={setScroller} className={`${overflow} ${scrollerClassName}`.trim()}>{children}</div>
      <span aria-hidden className={`${hint} left-0 top-0 bottom-0 w-6 items-center justify-start bg-gradient-to-r ${from} ${edge.left ? "opacity-100" : "opacity-0"}`}>
        <ChevronLeft size={13} strokeWidth={2.4} />
      </span>
      <span aria-hidden className={`${hint} right-0 top-0 bottom-0 w-6 items-center justify-end bg-gradient-to-l ${from} ${edge.right ? "opacity-100" : "opacity-0"}`}>
        <ChevronRight size={13} strokeWidth={2.4} />
      </span>
      <span aria-hidden className={`${hint} top-0 left-0 right-0 h-6 items-start justify-center bg-gradient-to-b ${from} ${edge.up ? "opacity-100" : "opacity-0"}`}>
        <ChevronUp size={13} strokeWidth={2.4} />
      </span>
      <span aria-hidden className={`${hint} bottom-0 left-0 right-0 h-6 items-end justify-center bg-gradient-to-t ${from} ${edge.down ? "opacity-100" : "opacity-0"}`}>
        <ChevronDown size={13} strokeWidth={2.4} />
      </span>
    </div>
  );
}

export default Scrollable;
