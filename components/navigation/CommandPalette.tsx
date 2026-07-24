import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import * as RD from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { Scrollable } from "../data-display/Scrollable";

export type CommandItem = { id: string; label: string; hint?: string; icon?: ReactNode; group?: string; onSelect: () => void };

/* ⌘K launcher — grounded in the real product (CommandPalette.tsx exists
   in mari/web/web/src/saas). Built on Radix Dialog + a hand-rolled listbox
   with arrow-key nav, since there's no Radix combobox primitive; no cmdk
   dependency needed for this scope. Mount once; toggle `open` from a
   global keydown listener in the app shell. */
export function CommandPalette({
  open, onOpenChange, items, placeholder = "Type a command or search…",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  useEffect(() => { if (open) { setQuery(""); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [query]);

  const select = (item: CommandItem) => { onOpenChange(false); item.onSelect(); };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const item = filtered[active]; if (item) select(item); }
  };

  let lastGroup: string | undefined;

  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-[80] bg-ink/30" />
        <RD.Content
          className="fixed z-[80] left-1/2 top-[18%] -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[560px] bg-paper rounded-md border border-ink/15 outline-none overflow-hidden"
          onKeyDown={onKeyDown}
        >
          <RD.Title className="sr-only">Command palette</RD.Title>
          <div className="flex items-center gap-2.5 px-4 h-12 border-b border-ink/10">
            <Search size={18} className="text-ink/65 shrink-0" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink/65 outline-none"
            />
            <span className="font-term text-[10px] text-ink/65 border border-ink/15 rounded-[3px] px-1.5 py-0.5">ESC</span>
          </div>
          <Scrollable axis="y" className="max-h-[320px]">
            <div role="listbox" className="p-1.5">
            {filtered.length === 0 && <div className="px-3 py-6 text-center text-[13px] text-ink/70">No matches</div>}
            {filtered.map((item, i) => {
              const showGroup = item.group !== undefined && item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {showGroup && <div className="px-2.5 pt-2.5 pb-1 font-term text-[10px] font-medium uppercase tracking-[0.08em] text-ink/65">{item.group}</div>}
                  <div
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(item)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[4px] text-[13px] text-ink/85 cursor-pointer ${i === active ? "bg-flysch text-ink" : ""}`}
                  >
                    {item.icon && <span className="shrink-0 text-ink/65">{item.icon}</span>}
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    {item.hint && <span className="font-term text-[11px] text-ink/65">{item.hint}</span>}
                  </div>
                </div>
              );
            })}
            </div>
          </Scrollable>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
