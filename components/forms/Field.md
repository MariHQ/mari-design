# Field

**Type:** Forms
**Source:** `mari-cc/console/src/saas/components/ui/Field.tsx`

A labeled row for read-only key/value display inside a `Drawer` or detail panel — not a form input wrapper (despite the name, this console has no dedicated input-field component yet; see the gap noted below).

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `label` | `string` | yes | Uppercase mono label above the value (`font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/55`). |
| `children` | `ReactNode` | yes | The value — text, a `Badge`, a link, anything. |

## Usage

```tsx
import { Field } from "../ui";

<Field label="Owner">{doc.owner}</Field>
<Field label="Status"><Badge label={doc.status} tone="ok" /></Field>
```

## Notes

- Each `Field` gets a hairline bottom border (`border-b border-ink/10`) except the last child in its container (`last:border-0`) — stack them directly, no manual `<hr>` or spacer divs between.
- **Gap:** there is no dedicated text-input/select component in this library yet. Raw `<input>`/`<select>` elements in the console currently style themselves inline (see `DataTable`'s search box and facet `<select>` for the pattern to copy: `h-8 px-2.5 rounded-[4px] border border-ink/20 bg-paper ... focus-within:border-biscay-2`). If you're building a form-heavy screen, extract that pattern into a proper `Input`/`Select` component here before duplicating it a third time.
