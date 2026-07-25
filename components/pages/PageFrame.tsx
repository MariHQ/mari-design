import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Home, BookOpen, CheckCircle2, Feather, Tag, Network, Shield, Workflow,
  Send, Sparkles, Settings, Menu as MenuIcon, Search, UserRound, KeyRound,
  ListChecks, ClipboardCheck,
} from "lucide-react";
import { AppShell } from "../shell/AppShell";
import { Sidebar, type NavSection } from "../shell/Sidebar";
import { HeaderBar } from "../shell/HeaderBar";
import { Logo, Brandmark } from "../shell/Logo";
import { Menu, MenuItem, MenuSeparator } from "../navigation/Menu";
import { NotificationBell } from "../navigation/NotificationBell";
import { GlobalSearch, type SearchResult, type SearchResultGroup, type SearchScope } from "../navigation/GlobalSearch";
import { Avatar } from "../data-display/Avatar";
import { focusRing } from "../tokens/focusRing";

/* ── Shared console frame ───────────────────────────────────────────────────
   Every page renders inside this: the real app shell (sidebar + topbar) on
   desktop, and a hamburger top-bar layout on mobile. Nav mirrors the console's
   NAV order (app-shell.md). Selection is static (this is a preview frame). */

/* ── Shared page layout grid (CONVENTIONS.md §11) ──────────────────────────
   One container width and one set of grid recipes for every console page, so
   the outer borders and internal plumb lines never move between pages.

   These are also where the console handles a SHRINKING window. Components stay
   desktop-first and fixed-width (§10); the page grid is the only thing that
   reflows. The numbers that matter: the console sidebar is a fixed 218px and
   the container adds 40-64px of padding, so the usable content column is
   roughly `viewport - 282`. A 320px rail therefore leaves

       1440 -> 838   1280 -> 658   1180 -> 558   1024 -> 402   900 -> 278

   for the main column. Below `xl` (1280) the rail stops being a rail and
   becomes a section stacked under the main column; below `lg` (1024) a
   three-up dashboard row stops being three-up. Mobile (the `mobile` prop) is
   already covered by the same classes, since 390px is below every breakpoint.

   Tailwind only sees class names it can find as literal strings, which is why
   these are spelled out per rail width instead of built from a variable. */

/** Main column + supporting rail. Keyed by the rail width (§11). */
export const SPLIT = {
  320: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]",
  360: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]",
  420: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]",
  460: "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_460px]",
} as const;

/** Dashboard grids (§11). Three-up down to two-up down to one-up. */
export const DASH3 = "grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3";
/** Two-up row (stat pairs, side-by-side panels) that collapses to one column. */
export const DASH2 = "grid grid-cols-1 gap-5 lg:grid-cols-2";

/** Column spans inside DASH3, clamped so a widget never spans more columns
    than the grid currently has (which would spawn an implicit column and push
    the document sideways). */
export const SPAN = {
  1: "col-span-1 min-w-0",
  2: "col-span-1 min-w-0 lg:col-span-2",
  3: "col-span-1 min-w-0 lg:col-span-2 xl:col-span-3",
} as const;

/** What a focus trap counts as focusable. Same list `layout/Drawer.tsx` uses,
    so the two modals in the console cannot disagree about where Tab may go. */
const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Invisible until focused, then the first thing Tab reaches (SH5). */
const SKIP_LINK = `sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-[4px] focus:border focus:border-ink/25 focus:bg-paper focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-ink ${focusRing}`;

export const NAV: NavSection[] = [
  { heading: "Workspace", items: [
    { id: "overview", label: "Overview", icon: <Home size={18} /> },
    /* Tasks was reachable only by finding the back-link on Overview, which
       made the console's own work queue the one page you had to already know
       about. It is a workspace destination like any other, so it is in the
       rail. */
    { id: "tasks", label: "Tasks", icon: <ListChecks size={18} /> },
    { id: "knowledge", label: "Knowledge", icon: <BookOpen size={18} /> },
    { id: "answers", label: "Answers", icon: <CheckCircle2 size={18} /> },
    { id: "decisions", label: "Decisions", icon: <Feather size={18} /> },
    { id: "library", label: "Library", icon: <Tag size={18} /> },
    { id: "lineage", label: "Lineage", icon: <Network size={18} /> },
    { id: "facts", label: "Facts", icon: <Shield size={18} /> },
    /* /audit was linked from nothing at all: no nav entry, no page body, no
       menu. A routed page with no entry point is a page that does not exist.
       It sits next to Facts because it is the same subject seen per run. */
    { id: "audit", label: "Repository audit", icon: <ClipboardCheck size={18} /> },
    { id: "flows", label: "Flows", icon: <Workflow size={18} /> },
    { id: "publish", label: "Publish", icon: <Send size={18} /> },
    { id: "insights", label: "Insights", icon: <Sparkles size={18} /> },
  ] },
  { divider: true, items: [
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ] },
];

/** Who is signed in. The frame renders this in the topbar, so it has to be
    the real session — it was a hardcoded "Dana Reyes / Owner", which meant a
    logged-in console greeted you by name in the body and by somebody else's
    name in the chrome. Demo data that is not called DEMO_ is still demo data. */
export type ShellUser = { name: string; initials: string; detail: string };

export type ShellNotification = {
  id: string; title: string; body: string; time: string; unread?: boolean;
};

/** Chrome the frame shows around every page. Optional so the canvas can render
    a page with no session behind it. */
export type ShellChrome = {
  user?: ShellUser;
  notifications?: ShellNotification[];
  onSignOut?: () => void;
  /** Navigate to a nav id ("knowledge", "settings", …). Sidebar has always
      supported `onNavigate`; the frame simply never passed one, so every item
      in the primary menu was a button that highlighted nothing and went
      nowhere. The app maps the id to its route. */
  onNavigate?: (id: string) => void;
  /** Follow a link out of a page body (a document, a source, a task). Same
      reason: pages emit intents, the app owns routing. */
  onOpen?: (href: string) => void;
  /** Run a global search. The frame owns the overlay, the ⌘K shortcut and the
      debounce; the app owns what "search" means and returns grouped results.
      Absent means the workspace has no search, and the trigger is hidden
      rather than opening a box that can never answer. */
  onSearch?: (query: string, scope: string | null) => Promise<SearchResultGroup[]>;
  /** Scopes offered in the overlay's filter row. Defaults to whichever scopes
      come back in the results. */
  searchScopes?: SearchScope[];
  /** Recent queries, shown before anything is typed. */
  recentSearches?: string[];
};

/** The search overlay behind the topbar trigger and ⌘K.
 *
 * The frame owns this rather than each page, because search is chrome: it is
 * reachable from all 20-odd pages and must behave identically on every one.
 *
 * `onSearch` is async, so this handles the two things every async search box
 * gets wrong. Keystrokes are debounced, so typing "onboarding" is one request
 * and not ten. And every response carries the sequence number of the request
 * that asked for it — without that, a slow query for "on" can land after a
 * fast one for "onboarding" and overwrite good results with stale ones. */
function useGlobalSearch(chrome?: ShellChrome) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const onSearch = chrome?.onSearch;

  useEffect(() => {
    if (!open || !onSearch) return;
    const q = query.trim();
    if (!q) { setGroups([]); setLoading(false); return; }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      Promise.resolve(onSearch(q, null))
        .then((r) => { if (mine === seq.current) { setGroups(r); setLoading(false); } })
        // A failed search shows as "no results" rather than tearing down the
        // page; the overlay has nowhere to put an error banner.
        .catch(() => { if (mine === seq.current) { setGroups([]); setLoading(false); } });
    }, 180);
    return () => clearTimeout(t);
  }, [open, query, onSearch]);

  // ⌘K / Ctrl-K from anywhere in the console. Bound only when search exists.
  useEffect(() => {
    if (!onSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch]);

  const select = useCallback((r: SearchResult) => {
    if (r.href) chrome?.onOpen?.(r.href);
  }, [chrome]);

  const node = onSearch ? (
    <GlobalSearch
      open={open}
      onOpenChange={setOpen}
      scopes={chrome?.searchScopes}
      onQuery={() => groups}
      value={query}
      onValueChange={setQuery}
      loading={loading}
      recentSearches={chrome?.recentSearches ?? []}
      onSelect={select}
    />
  ) : null;

  // No handler means no trigger: a search box that cannot search is worse
  // than no search box.
  return { node, onOpen: onSearch ? () => setOpen(true) : undefined };
}

/** Signed out, or not yet loaded: name the state, never invent a person. */
const NO_USER: ShellUser = { name: "Signed out", initials: "—", detail: "" };

function UserMenu({ onSignOut, onNavigate }: { onSignOut?: () => void; onNavigate?: (id: string) => void }) {
  return (
    <>
      {/* Your account, not the workspace. These were pointing at Settings →
          Workspace, which is an admin's page about a different subject. */}
      <MenuItem icon={<UserRound size={14} />} onSelect={() => onNavigate?.("preferences")}>Preferences</MenuItem>
      <MenuItem icon={<Settings size={14} />} onSelect={() => onNavigate?.("settings")}>Workspace settings</MenuItem>
      <MenuItem icon={<KeyRound size={14} />} onSelect={() => onNavigate?.("settings-api-keys")}>API keys</MenuItem>
      <MenuSeparator />
      <MenuItem danger onSelect={onSignOut}>Sign out</MenuItem>
    </>
  );
}

/** Which sidebar item is active for a given page id. Settings sub-pages and
    a few off-nav routes map onto the closest nav entry. */
export function navFor(pageId: string): string {
  if (pageId.startsWith("settings") || pageId === "lookbook") return "settings";
  // Tasks and Repository Audit have their own rail entries now, so they
  // highlight themselves rather than borrowing Overview's and Facts'.
  // Doc Review stays a DETAIL route: you arrive at it from a document, never
  // from the rail, so it highlights the page you came from.
  if (pageId === "doc-review") return "knowledge";
  if (pageId === "sources") return "settings";
  // Preferences is reached from the account menu, not the sidebar, and it is
  // about YOU rather than the workspace — so it deliberately highlights no nav
  // item instead of borrowing Settings', which is a different subject.
  if (pageId === "preferences") return "";
  return pageId;
}

/** The page a nav item opens. The inverse of `navFor`, which is many-to-one:
    five Settings pages, Sources and Lookbook all report the "settings" nav id,
    so "settings" is not itself a page id. Looking the nav id up directly in
    PAGES therefore found nothing and the Settings menu item did nothing at
    all. The library owns the nav structure, so it owns this mapping too. */
export function landingPageFor(navId: string): string {
  if (navId === "settings") return "settings-general";
  return navId;
}

/* Prerender uses a "static" frame that grows to full content height (so a
   full-page screenshot captures everything) instead of the app shell's
   viewport-clipped internal scroll. Toggled globally by the render route. */
let staticFrame = false;
export const setStaticFrame = (v: boolean) => { staticFrame = v; };

function MobileFrame({ active, title, children, grow = false, chrome }: { active: string; title?: string; children: ReactNode; grow?: boolean; chrome?: ShellChrome }) {
  const user = chrome?.user ?? NO_USER;
  const label = NAV.flatMap((s) => s.items).find((i) => i.id === active)?.label ?? title ?? "Mari";
  const search = useGlobalSearch(chrome);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className={`relative flex w-full flex-col bg-paper text-ink ${grow ? "min-h-screen" : "h-screen min-h-0 overflow-hidden"}`}>
      <a href="#main-content" className={SKIP_LINK}>Skip to main content</a>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ink/12 bg-paper px-4">
        <button
          aria-label="Menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(true)}
          className={`grid h-9 w-9 place-items-center rounded-[6px] text-ink/70 hover:bg-flysch ${focusRing}`}
        >
          <MenuIcon size={18} />
        </button>
        <span className="text-biscay"><Brandmark size={22} /></span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
        <div className="flex shrink-0 items-center gap-1">
          {search.onOpen && (
            <button aria-label="Search" onClick={search.onOpen} className={`grid h-9 w-9 place-items-center rounded-[6px] text-ink/70 hover:bg-flysch ${focusRing}`}><Search size={17} /></button>
          )}
          {/* The real bell, not a bell-shaped picture of one: on mobile this
              was a plain <button> with no handler while desktop had the
              working NotificationBell two files away. */}
          <NotificationBell items={chrome?.notifications ?? []} />
          <Menu trigger={(
            <button aria-label={`Account: ${user.name}`} className={`ml-1 grid place-items-center rounded-full ${focusRing}`}>
              <Avatar initials={user.initials} />
            </button>
          )} align="end">
            <UserMenu onSignOut={chrome?.onSignOut} onNavigate={chrome?.onNavigate} />
          </Menu>
        </div>
      </header>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} active={active} chrome={chrome} />
      {search.node}
      <main id="main-content" tabIndex={-1} aria-label="Main content" className={`outline-none ${grow ? "flex-1" : "min-h-0 flex-1 overflow-y-auto"}`}>{children}</main>
    </div>
  );
}

/** The nav behind the mobile hamburger.
 *
 * Mobile rendered the same NAV as desktop everywhere except that there was no
 * way to reach it: the hamburger had no handler, so on a phone the console had
 * exactly one page. This is the same Sidebar the desktop frame uses, in a
 * slide-over, so the two can never list different destinations. */
function MobileNav({ open, onClose, active, chrome }: { open: boolean; onClose: () => void; active: string; chrome?: ShellChrome }) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* ACC-10 / SH2: this sheet covers the page and takes it over, but had none
     of the behaviour that makes that safe — no dialog role, no focus move, no
     trap (Tab walked straight out behind the scrim into a page the user could
     still operate but could not see), no restore on close, no scroll lock.
     `layout/Drawer.tsx` already does all of this; this is the same contract,
     kept here because the sheet hosts a Sidebar rather than Drawer's chrome. */
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    // The page behind a modal must not scroll under the finger.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (els.length === 0) { e.preventDefault(); return; }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && activeEl === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] font-display">
      {/* The scrim's dismiss was a <div onClick>: a target no keyboard could
          reach and no screen reader could announce. It is a real button now,
          named, and hidden from the reading order only because Escape and the
          nav itself are the paths that matter there. */}
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        className="absolute left-0 top-0 h-full w-[264px] max-w-[85vw] overflow-y-auto outline-none"
      >
        <Sidebar
          sections={NAV}
          activeId={active}
          // Close on selection: leaving the sheet open over the page it just
          // navigated to looks like the tap did nothing.
          onNavigate={(id) => { onClose(); chrome?.onNavigate?.(id); }}
          className="min-h-full"
          brand={<span className="text-white"><Logo /></span>}
        />
      </div>
    </div>
  );
}

/** The sidebar's "Need help?" card. It opens the assistant, which in this
    console is the Answers page — the same destination the nav offers, so it
    can never point somewhere that does not exist. */
function HelpCard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  return (
    <button
      onClick={() => onNavigate?.("answers")}
      className={`w-full rounded-[6px] bg-white/10 px-3 py-2 text-left text-[12.5px] text-white/80 hover:bg-white/15 ${focusRing}`}
    >
      <b className="block font-medium text-white">Need help?</b>
      Ask Mari anything ↗
    </button>
  );
}

function DesktopStatic({ active, children, chrome }: { active: string; children: ReactNode; chrome?: ShellChrome }) {
  const user = chrome?.user ?? NO_USER;
  const search = useGlobalSearch(chrome);
  return (
    <div className="relative flex min-h-screen w-full bg-paper text-ink">
      <a href="#main-content" className={SKIP_LINK}>Skip to main content</a>
      <div className="shrink-0 self-stretch border-r border-ink/10">
        <Sidebar
          sections={NAV}
          activeId={active}
          onNavigate={chrome?.onNavigate}
          className="min-h-screen"
          brand={<span className="text-white"><Logo /></span>}
          footer={<HelpCard onNavigate={chrome?.onNavigate} />}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBar
          searchPlaceholder="Search knowledge, people, facts…"
          searchShortcut="⌘K"
          onSearch={search.onOpen}
          actions={<NotificationBell items={chrome?.notifications ?? []} />}
          user={user}
          userMenu={<UserMenu onSignOut={chrome?.onSignOut} onNavigate={chrome?.onNavigate} />}
        />
        {search.node}
        <main id="main-content" tabIndex={-1} aria-label="Main content" className="flex-1 bg-flysch/40 outline-none">{children}</main>
      </div>
    </div>
  );
}

/** The live desktop frame.
 *
 * Split out of PageFrame so that EXACTLY ONE of the three frames owns the
 * search hook. PageFrame used to call `useGlobalSearch` itself and then hand
 * off to MobileFrame / DesktopStatic, which each call it too: on mobile and in
 * static render that bound two ⌘K listeners, so the shortcut toggled an
 * invisible overlay's state in lockstep with the visible one and the two could
 * disagree about whether search was open. PageFrame is now pure dispatch and
 * holds no state of its own. */
function DesktopFrame({ active, chrome, children }: { active: string; chrome?: ShellChrome; children: ReactNode }) {
  const user = chrome?.user ?? NO_USER;
  const search = useGlobalSearch(chrome);
  return (
    <AppShell
      /* The shell claims the VIEWPORT. AppShell is `h-full`, which resolves
         against whatever contains it — and in a host that has not set a height
         on html/body/#root, that is the document. On a long document the rail
         then stretched to the full 17,559px of scroll height instead of the
         704px of window: the sidebar ran off the bottom, its height changed
         with every page, and the internal scroll regions never engaged because
         nothing was ever bounded. Asking for the viewport here makes the frame
         correct on its own rather than dependent on the host's stylesheet. */
      className="h-screen"
      defaultCollapsed={false}
      sidebar={({ collapsed }) => (
        <Sidebar
          sections={NAV}
          activeId={active}
          onNavigate={chrome?.onNavigate}
          collapsed={collapsed}
          brand={collapsed ? <span className="text-white"><Brandmark size={26} /></span> : <span className="text-white"><Logo /></span>}
          footer={!collapsed && <HelpCard onNavigate={chrome?.onNavigate} />}
        />
      )}
      header={({ toggle }) => (
        <HeaderBar
          onToggleSidebar={toggle}
          searchPlaceholder="Search knowledge, people, facts…"
          searchShortcut="⌘K"
          onSearch={search.onOpen}
          actions={<NotificationBell items={chrome?.notifications ?? []} />}
          user={user}
          userMenu={<UserMenu onSignOut={chrome?.onSignOut} onNavigate={chrome?.onNavigate} />}
        />
      )}
    >
      {search.node}
      {children}
    </AppShell>
  );
}

export function PageFrame({
  active, title, mobile = false, chrome, children,
}: {
  active: string;
  title?: string;
  mobile?: boolean;
  /** Session + notifications for the topbar. */
  chrome?: ShellChrome;
  children: ReactNode;
}) {
  if (mobile) return <MobileFrame active={active} title={title} grow={staticFrame} chrome={chrome}>{children}</MobileFrame>;
  if (staticFrame) return <DesktopStatic active={active} chrome={chrome}>{children}</DesktopStatic>;
  return <DesktopFrame active={active} chrome={chrome}>{children}</DesktopFrame>;
}
