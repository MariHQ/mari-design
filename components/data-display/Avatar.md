# Avatar

**Type:** Data display
**Source:** [`Avatar.tsx`](./Avatar.tsx) (this repo)

Initials disc, tinted from four canonical brand colors (biscay, biscay-2, moss, clay). Tint derives deterministically from `name` when not given, so the same person is always the same color across the app.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | Used for initials (first letter of up to 2 words) and the default tint. Also becomes the `title` attribute. |
| `initials` | `string` | no | Override the derived initials. |
| `tint` | `1 \| 2 \| 3 \| 4` | no | Override the derived tint. |
| `size` | `"sm" \| "md"` | no | Default `"md"`. |

## Usage

```tsx
import { Avatar } from "@mari-design/components";
// or directly: from "./Avatar"

<Avatar name="Priya Nair" />
<Avatar name="Priya Nair" size="sm" />
```

## Notes

- **Never tints espelette.** Espelette is the single hot accent per canvas (BRAND-STYLE-GUIDE.md) — a list of avatars is exactly the repeated-decorative-use case that rule exists to prevent, so the four tints deliberately skip it.
