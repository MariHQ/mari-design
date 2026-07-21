import { useState, type ReactNode } from "react";

/* App layout — composes the Sidebar, the HeaderBar, and a scrollable content
   region, mirroring the console shell's `grid: sidebar 1fr` + sticky topbar +
   scrolling main. AppShell owns the collapse ("railed") state and hands a
   `{ collapsed, toggle }` context to the sidebar/header render props, so the
   toggle can live in either one.

   Fills its parent (h-full): give it the viewport (`h-screen`) in a real app,
   or a bounded box in a gallery. */

export type ShellContext = { collapsed: boolean; toggle: () => void };

export type AppShellProps = {
  /** Sidebar render prop — receives the collapse context. */
  sidebar: (ctx: ShellContext) => ReactNode;
  /** Header render prop — receives the collapse context. */
  header: (ctx: ShellContext) => ReactNode;
  children: ReactNode;
  /** Controlled collapse state. */
  collapsed?: boolean;
  /** Uncontrolled initial collapse state. */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  /** Extra classes for the scrolling content region. */
  contentClassName?: string;
};

export function AppShell({
  sidebar, header, children,
  collapsed: collapsedProp, defaultCollapsed = false, onCollapsedChange,
  className = "", contentClassName = "",
}: AppShellProps) {
  const [internal, setInternal] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? internal;
  const toggle = () => {
    const next = !collapsed;
    if (collapsedProp === undefined) setInternal(next);
    onCollapsedChange?.(next);
  };
  const ctx: ShellContext = { collapsed, toggle };

  return (
    <div className={["flex h-full min-h-0 w-full overflow-hidden bg-paper text-ink", className].filter(Boolean).join(" ")}>
      <div className="shrink-0 border-r border-ink/10 transition-[width] duration-150 ease-out">
        {sidebar(ctx)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {header(ctx)}
        <main className={["min-h-0 flex-1 overflow-y-auto bg-flysch/40", contentClassName].filter(Boolean).join(" ")}>
          {children}
        </main>
      </div>
    </div>
  );
}
