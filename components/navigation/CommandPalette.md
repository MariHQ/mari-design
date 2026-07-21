# CommandPalette

**Type:** Navigation
**Source:** [`CommandPalette.tsx`](./CommandPalette.tsx) (this repo) — grounded in the real product (`CommandPalette.tsx` exists in `mari/web/web/src/saas/components`)

A `⌘K` searchable action launcher. Built on `@radix-ui/react-dialog` plus a hand-rolled listbox with arrow-key navigation — there's no Radix combobox/command primitive, and this scope didn't need pulling in `cmdk`.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `open` | `boolean` | yes | Controlled — toggle from a global `⌘K`/`Ctrl+K` keydown listener in the app shell. |
| `onOpenChange` | `(open: boolean) => void` | yes | |
| `items` | `CommandItem[]` | yes | `{ id, label, hint?, icon?, group?, onSelect }`. Items with the same `group` (in list order) render under one heading. |
| `placeholder` | `string` | no | Default `"Type a command or search…"`. |

## Usage

```tsx
import { CommandPalette } from "@mari-design/components";
// or directly: from "./CommandPalette"

const [open, setOpen] = useState(false);
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen((o) => !o); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);

<CommandPalette
  open={open}
  onOpenChange={setOpen}
  items={[
    { id: "new-source", label: "Connect a source", group: "Actions", onSelect: () => navigate("/sources/new") },
    { id: "go-lineage", label: "Go to Lineage", group: "Navigate", hint: "G L", onSelect: () => navigate("/lineage") },
  ]}
/>
```

## Notes

- Filtering is a plain case-insensitive substring match on `label` — no fuzzy scoring. If the command list grows large enough that this feels imprecise, that's a sign to add real fuzzy matching, not to reach for a different component.
- Keyboard nav is Up/Down to move, Enter to select, Escape to close (from Radix Dialog). No Tab-cycling inside the list — it's a single-column listbox, not a form.
