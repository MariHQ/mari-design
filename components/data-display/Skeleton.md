# Skeleton

**Type:** Data display
**Source:** [`Skeleton.tsx`](./Skeleton.tsx) (this repo)

A loading-placeholder block — distinct from `Spinner` (indeterminate, contextless) for content that's about to appear in its own place (a table row, a card, a stat before its number loads).

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `width` | `CSSProperties["width"]` | no | |
| `height` | `CSSProperties["height"]` | no | |
| `className` | `string` | no | E.g. `rounded-full` to override the default `rounded-[4px]`. |

## Usage

```tsx
import { Skeleton } from "@mari-design/components";
// or directly: from "./Skeleton"

<div className="flex flex-col gap-2">
  <Skeleton height={14} width="60%" />
  <Skeleton height={14} width="40%" />
</div>
<Skeleton className="rounded-full" width={26} height={26} />
```
