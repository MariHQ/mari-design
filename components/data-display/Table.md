# Table

**Type:** Data display
**Source:** [`Table.tsx`](./Table.tsx) (this repo)

A static table shell — header row, hairline dividers, optional title/count/footer chrome. No sorting, search, or pagination. For an interactive table, use [`DataTable`](./DataTable.md) instead.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | `string` | no | — | Rendered above the table with an optional count chip. |
| `count` | `number` | no | — | Shown as a small mono chip next to `title` (only if `title` is also set). |
| `head` | `string[]` | yes | — | Column header labels, plain strings — no per-column config (no sort/align). |
| `footer` | `ReactNode` | no | — | Rendered below the table, e.g. pagination or a summary row. |
| `minW` | `number` | no | `700` | Minimum table width in px before horizontal scroll kicks in. |
| `children` | `ReactNode` | yes | — | `<tr>` rows — you write the `<tbody>` content yourself. |

## Usage

```tsx
import { Table } from "@mari-design/components";
// or directly: from "./Table"

<Table title="Word lists" count={lists.length} head={["Name", "Entries", "Updated"]}>
  {lists.map((l) => (
    <tr key={l.id}>
      <td>{l.name}</td>
      <td>{l.entries.length}</td>
      <td>{l.updatedAt}</td>
    </tr>
  ))}
</Table>
```

## When to reach for `DataTable` instead

Use plain `Table` for short, static lists (under ~10 rows, no need to search/sort/filter). The moment a screen needs any of search, per-column sort, faceted filtering, pagination, row click, or an empty state — stop hand-rolling those inside `Table`'s `children` and switch to `DataTable`, which already has all of that built in.
