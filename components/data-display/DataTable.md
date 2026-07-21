# DataTable

**Type:** Data display
**Source:** `mari-cc/console/src/saas/components/ui/DataTable.tsx`

The interactive table: search, per-column sort, one facet filter, pagination, row click, and an empty state — all built in. Generic over the row type `T`.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | `string` | no | — | Header title + optional count chip. |
| `count` | `number` | no | — | Count chip next to `title`. |
| `rows` | `T[]` | yes | — | The full unfiltered dataset — `DataTable` owns search/sort/filter/paginate internally. |
| `columns` | `Column<T>[]` | yes | — | See `Column` shape below. |
| `rowKey` | `(row: T) => string` | yes | — | Stable React key per row. |
| `search` | `(row: T) => string` | no | — | If set, shows a search box; searches the string this returns (case-insensitive substring match). |
| `searchPlaceholder` | `string` | no | `"Search…"` | |
| `facet` | `{ label: string; get: (row: T) => string }` | no | — | If set, shows a single `<select>` filter. Options are derived automatically from `get`'s distinct values across `rows`. |
| `onRowClick` | `(row: T) => void` | no | — | If set, rows become clickable (cursor pointer, hover highlight). |
| `pageSize` | `number` | no | `8` | Rows per page. |
| `minW` | `number` | no | `720` | Minimum table width before horizontal scroll. |
| `empty` | `string` | no | `"No results"` | Shown when `rows` is empty. (A different message — "No matches. Try clearing filters." — shows automatically when a search/facet is active but returns zero rows; you don't need to handle that case yourself.) |

### `Column<T>`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | `string` | yes | Unique per column. |
| `header` | `string` | yes | Column header text. |
| `sortable` | `boolean` | no | Shows sort chevrons and enables click-to-sort on the header. |
| `sort` | `(row: T) => string \| number` | no | Required if `sortable` is `true` — the value to sort by. |
| `render` | `(row: T) => ReactNode` | yes | Cell content. |
| `align` | `"right"` | no | Right-aligns header + cell (numbers, counts). |
| `cell` | `string` | no | Extra className appended to the `<td>`. |

## Usage

```tsx
import { DataTable, type Column } from "../ui";

type Row = { id: string; name: string; hits: number; source: string };

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortable: true, sort: (r) => r.name, render: (r) => r.name },
  { key: "hits", header: "Hits", sortable: true, sort: (r) => r.hits, align: "right", render: (r) => r.hits.toLocaleString() },
  { key: "source", header: "Source", render: (r) => <Badge label={r.source} tone="neutral" /> },
];

<DataTable
  title="Rules"
  count={rows.length}
  rows={rows}
  columns={columns}
  rowKey={(r) => r.id}
  search={(r) => r.name}
  facet={{ label: "sources", get: (r) => r.source }}
  onRowClick={(r) => openDrawer(r.id)}
/>
```

## Notes

- All filtering/sorting/pagination state is internal (`useState` inside the component) — you don't lift it up. If a screen needs to sync table state to the URL (deep-linkable sort/filter), that's not supported today; don't fake it by duplicating `DataTable`'s internals.
- Only **one** facet filter is supported. If a screen needs two independent filters, that's a real gap — raise it rather than bolting a second `<select>` onto the header row outside the component's control.
