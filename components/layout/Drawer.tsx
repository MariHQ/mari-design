import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Scrollable } from "../data-display/Scrollable";
import { focusRing } from "../tokens/focusRing";

/* ── Drawer: right-side detail panel ───────────────────────────────────────
   variant="overlay" (default) — modal slide-over: fixed, backdrop, focus-trapped.
   variant="inline"            — docked side panel that lives in the layout flow:
                                 no backdrop, no focus trap, no page cover. Use it
                                 as a master–detail pane that sits beside content
                                 instead of over it. */

type DrawerVariant = "overlay" | "inline";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  variant?: DrawerVariant;
  /** Hide the close button (handy for an always-docked inline pane). */
  closable?: boolean;
  className?: string;
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function DrawerBody({
  title, subtitle, icon, footer, children, onClose, closable, modal, panelRef, className,
}: {
  title: string; subtitle?: string; icon?: ReactNode; footer?: ReactNode; children: ReactNode;
  onClose: () => void; closable: boolean; modal: boolean;
  panelRef?: React.Ref<HTMLElement>; className: string;
}) {
  return (
    <aside
      ref={panelRef}
      role={modal ? "dialog" : "complementary"}
      aria-modal={modal || undefined}
      aria-label={title}
      tabIndex={modal ? -1 : undefined}
      className={className}
    >
      <header className="shrink-0 h-14 px-5 flex items-center gap-3 border-b border-ink/10">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink truncate">{title}</div>
          {subtitle && <div className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/65 truncate">{subtitle}</div>}
        </div>
        {closable && (
          <button onClick={onClose} className={`grid place-items-center w-8 h-8 rounded-[4px] text-ink/60 hover:bg-flysch hover:text-ink ${focusRing}`} aria-label="Close"><X size={16} /></button>
        )}
      </header>
      <Scrollable axis="y" className="flex-1 min-h-0" scrollerClassName="p-5">{children}</Scrollable>
      {footer && <footer className="shrink-0 p-4 border-t border-ink/10 flex gap-2">{footer}</footer>}
    </aside>
  );
}

export function Drawer({
  open, onClose, title, subtitle, icon, footer, children,
  variant = "overlay", closable = true, className = "",
}: DrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (variant !== "overlay" || !open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, variant]);

  if (!open) return null;

  if (variant === "inline") {
    return (
      <DrawerBody
        title={title} subtitle={subtitle} icon={icon} footer={footer}
        onClose={onClose} closable={closable} modal={false}
        className={`w-full max-w-[460px] max-h-full bg-paper border border-ink/15 rounded-md flex flex-col text-ink overflow-hidden ${className}`.trim()}
      >
        {children}
      </DrawerBody>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] font-display">
      <div className="absolute inset-0 bg-ink/30 drawer-overlay" onClick={onClose} />
      <DrawerBody
        title={title} subtitle={subtitle} icon={icon} footer={footer}
        onClose={onClose} closable={closable} modal
        panelRef={panelRef}
        className={`absolute right-0 top-0 h-full w-full max-w-[460px] bg-paper border-l border-ink/15 shadow-2xl flex flex-col text-ink drawer-panel outline-none ${className}`.trim()}
      >
        {children}
      </DrawerBody>
    </div>
  );
}
