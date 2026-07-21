import type { ReactNode } from "react";
import { ChevronDown, PanelLeft, Search } from "lucide-react";
import { Menu } from "../navigation/Menu";
import { Avatar } from "../data-display/Avatar";
import { focusRing } from "../tokens/focusRing";

/* Top app bar, ported from the console shell's topbar: an optional brand slot
   and sidebar toggle (left), a global-search trigger (the source's ⌘K
   affordance), right-side action slots (notifications, help, …), and a
   user/account menu built from Avatar + Menu. Everything is slot/prop-driven —
   the bar hardcodes no app behavior. */

/** Standalone search-trigger button — the topbar's ⌘K affordance. */
export function SearchTrigger({
  placeholder = "Search…", shortcut = "⌘K", onClick, className = "",
}: {
  placeholder?: string;
  shortcut?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-9 w-full items-center gap-2.5 rounded-[6px] border border-ink/15 bg-paper px-3 text-left text-[13px] text-ink/45 hover:border-ink/30 hover:text-ink/60",
        focusRing,
        className,
      ].filter(Boolean).join(" ")}
    >
      <Search size={15} className="shrink-0 text-ink/40" />
      <span className="min-w-0 flex-1 truncate">{placeholder}</span>
      {shortcut && <kbd className="shrink-0 font-term text-[11px] text-ink/40">{shortcut}</kbd>}
    </button>
  );
}

export type HeaderUser = { name: string; initials: string; detail?: string };

export type HeaderBarProps = {
  /** Brand/logo slot (left). Typically shown when the sidebar is collapsed or absent. */
  brand?: ReactNode;
  /** Sidebar collapse toggle — renders a hamburger when provided. */
  onToggleSidebar?: () => void;
  /** Custom search slot. Falls back to a default <SearchTrigger> when omitted. */
  search?: ReactNode;
  searchPlaceholder?: string;
  searchShortcut?: string;
  onSearch?: () => void;
  /** Right-side action slots (e.g. a NotificationBell, a help button). */
  actions?: ReactNode;
  /** Account identity — renders Avatar + name + chevron. */
  user?: HeaderUser;
  /** Account-menu contents (MenuItem/MenuSeparator). Renders a dropdown when set. */
  userMenu?: ReactNode;
  /** Plain account-button click, used when `userMenu` is omitted. */
  onUserClick?: () => void;
  className?: string;
};

// A plain host <button> element (not a component) so Radix `asChild` can
// clone it and forward its ref without a function-component ref warning.
function userButton(user: HeaderUser, onClick?: () => void) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 text-[13px] text-ink hover:bg-flysch ${focusRing}`}
      aria-label={`Account: ${user.name}`}
    >
      <Avatar initials={user.initials} />
      <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
        <span className="truncate font-medium">{user.name}</span>
        {user.detail && <span className="truncate font-term text-[10.5px] text-ink/45">{user.detail}</span>}
      </span>
      <ChevronDown size={15} className="text-ink/40" />
    </button>
  );
}

export function HeaderBar({
  brand, onToggleSidebar, search, searchPlaceholder, searchShortcut, onSearch,
  actions, user, userMenu, onUserClick, className = "",
}: HeaderBarProps) {
  return (
    <header
      className={[
        "flex h-14 shrink-0 items-center gap-3 border-b border-ink/10 bg-paper px-4",
        className,
      ].filter(Boolean).join(" ")}
    >
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[6px] text-ink/55 hover:bg-flysch hover:text-ink ${focusRing}`}
        >
          <PanelLeft size={17} />
        </button>
      )}

      {brand && <div className="shrink-0">{brand}</div>}

      <div className="min-w-0 flex-1">
        <div className="max-w-[460px]">
          {search ?? <SearchTrigger placeholder={searchPlaceholder} shortcut={searchShortcut} onClick={onSearch} />}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}

      {user && (
        <>
          {(actions || onToggleSidebar) && <div className="mx-1 h-7 w-px shrink-0 bg-ink/10" aria-hidden="true" />}
          {userMenu ? (
            <Menu trigger={userButton(user)} align="end">{userMenu}</Menu>
          ) : (
            userButton(user, onUserClick)
          )}
        </>
      )}
    </header>
  );
}
