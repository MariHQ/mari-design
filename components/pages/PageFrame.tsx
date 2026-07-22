import type { ReactNode } from "react";
import {
  Home, BookOpen, CheckCircle2, Feather, Tag, Network, Shield, Workflow,
  Send, Sparkles, Settings, Menu as MenuIcon, Search, Bell,
} from "lucide-react";
import { AppShell } from "../shell/AppShell";
import { Sidebar, type NavSection } from "../shell/Sidebar";
import { HeaderBar } from "../shell/HeaderBar";
import { Logo, Brandmark } from "../shell/Logo";
import { Menu, MenuItem, MenuSeparator } from "../navigation/Menu";
import { NotificationBell } from "../navigation/NotificationBell";
import { Avatar } from "../data-display/Avatar";

/* ── Shared console frame ───────────────────────────────────────────────────
   Every page renders inside this: the real app shell (sidebar + topbar) on
   desktop, and a hamburger top-bar layout on mobile. Nav mirrors the console's
   NAV order (app-shell.md). Selection is static (this is a preview frame). */

export const NAV: NavSection[] = [
  { heading: "Workspace", items: [
    { id: "overview", label: "Overview", icon: <Home size={18} /> },
    { id: "knowledge", label: "Knowledge", icon: <BookOpen size={18} /> },
    { id: "answers", label: "Answers", icon: <CheckCircle2 size={18} /> },
    { id: "decisions", label: "Decisions", icon: <Feather size={18} /> },
    { id: "library", label: "Library", icon: <Tag size={18} /> },
    { id: "lineage", label: "Lineage", icon: <Network size={18} /> },
    { id: "facts", label: "Facts", icon: <Shield size={18} /> },
    { id: "flows", label: "Flows", icon: <Workflow size={18} /> },
    { id: "publish", label: "Publish", icon: <Send size={18} /> },
    { id: "insights", label: "Insights", icon: <Sparkles size={18} /> },
  ] },
  { heading: "Admin", items: [
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ] },
];

const NOTIS = [
  { id: "n1", title: "Fact-check passed", body: "pricing.md · 12 claims", time: "2m ago", unread: true },
  { id: "n2", title: "Review requested", body: "onboarding-guide", time: "1h ago" },
];

const USER = { name: "Dana Reyes", initials: "DR", detail: "Owner" };

function HeaderActions() {
  return (
    <>
      <NotificationBell items={NOTIS} />
    </>
  );
}

function UserMenu() {
  return (
    <>
      <MenuItem icon={<Settings size={14} />}>Preferences</MenuItem>
      <MenuItem>API keys</MenuItem>
      <MenuSeparator />
      <MenuItem danger>Sign out</MenuItem>
    </>
  );
}

/** Which sidebar item is active for a given page id. Settings sub-pages and
    a few off-nav routes map onto the closest nav entry. */
export function navFor(pageId: string): string {
  if (pageId.startsWith("settings") || pageId === "lookbook") return "settings";
  if (pageId === "audit") return "facts";
  if (pageId === "tasks") return "overview";
  if (pageId === "doc-review") return "knowledge";
  if (pageId === "sources") return "settings";
  return pageId;
}

/* Prerender uses a "static" frame that grows to full content height (so a
   full-page screenshot captures everything) instead of the app shell's
   viewport-clipped internal scroll. Toggled globally by the render route. */
let staticFrame = false;
export const setStaticFrame = (v: boolean) => { staticFrame = v; };

function MobileFrame({ active, title, children, grow = false }: { active: string; title?: string; children: ReactNode; grow?: boolean }) {
  const label = NAV.flatMap((s) => s.items).find((i) => i.id === active)?.label ?? title ?? "Mari";
  return (
    <div className={`flex w-full flex-col bg-paper text-ink ${grow ? "min-h-screen" : "h-full min-h-0 overflow-hidden"}`}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink/12 bg-paper px-4">
        <button aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-[6px] text-ink/70 hover:bg-flysch">
          <MenuIcon size={18} />
        </button>
        <span className="text-biscay"><Brandmark size={22} /></span>
        <span className="text-[15px] font-semibold">{label}</span>
        <div className="ml-auto flex items-center gap-1">
          <button aria-label="Search" className="grid h-9 w-9 place-items-center rounded-[6px] text-ink/70 hover:bg-flysch"><Search size={17} /></button>
          <button aria-label="Notifications" className="grid h-9 w-9 place-items-center rounded-[6px] text-ink/70 hover:bg-flysch"><Bell size={17} /></button>
          <span className="ml-1"><Avatar initials={USER.initials} /></span>
        </div>
      </header>
      <main className={grow ? "flex-1" : "min-h-0 flex-1 overflow-y-auto"}>{children}</main>
    </div>
  );
}

function DesktopStatic({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-paper text-ink">
      <div className="shrink-0 self-stretch border-r border-ink/10">
        <Sidebar
          sections={NAV}
          activeId={active}
          className="min-h-screen"
          brand={<span className="text-white"><Logo /></span>}
          footer={(
            <button className="w-full rounded-[6px] bg-white/10 px-3 py-2 text-left text-[12.5px] text-white/80 hover:bg-white/15">
              <b className="block font-medium text-white">Need help?</b>
              Ask Mari anything ↗
            </button>
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          searchPlaceholder="Search knowledge, people, facts…"
          searchShortcut="⌘K"
          actions={<HeaderActions />}
          user={USER}
          userMenu={<UserMenu />}
        />
        <main className="flex-1 bg-flysch/40">{children}</main>
      </div>
    </div>
  );
}

export function PageFrame({
  active, title, mobile = false, children,
}: {
  active: string;
  title?: string;
  mobile?: boolean;
  children: ReactNode;
}) {
  if (mobile) return <MobileFrame active={active} title={title} grow={staticFrame}>{children}</MobileFrame>;
  if (staticFrame) return <DesktopStatic active={active}>{children}</DesktopStatic>;
  return (
    <AppShell
      defaultCollapsed={false}
      sidebar={({ collapsed }) => (
        <Sidebar
          sections={NAV}
          activeId={active}
          collapsed={collapsed}
          brand={collapsed ? <span className="text-white"><Brandmark size={26} /></span> : <span className="text-white"><Logo /></span>}
          footer={!collapsed && (
            <button className="w-full rounded-[6px] bg-white/10 px-3 py-2 text-left text-[12.5px] text-white/80 hover:bg-white/15">
              <b className="block font-medium text-white">Need help?</b>
              Ask Mari anything ↗
            </button>
          )}
        />
      )}
      header={({ toggle }) => (
        <HeaderBar
          onToggleSidebar={toggle}
          searchPlaceholder="Search knowledge, people, facts…"
          searchShortcut="⌘K"
          actions={<HeaderActions />}
          user={USER}
          userMenu={<UserMenu />}
        />
      )}
    >
      {children}
    </AppShell>
  );
}
