# Console components

One file per component, organized by type, documenting the primitives that ship in `mari-cc/console/src/saas/components/ui/`. Each doc matches its source file exactly — see `mari-cc` for the implementation, this repo for the spec.

Written to the same brand system as `../BRAND-STYLE-GUIDE.md` — read that first for the underlying tokens (colors, type, spacing, shape language) these components consume.

## Index by type

| Type | Component | Source |
|---|---|---|
| Layout | [Page](./layout/Page.md) | `ui/Page.tsx` |
| Layout | [Drawer](./layout/Drawer.md) | `ui/Drawer.tsx` |
| Forms | [Field](./forms/Field.md) | `ui/Field.tsx` |
| Actions | [Buttons](./actions/Buttons.md) (`btn`, `btnPrimary`, `btnDanger`) | `ui/buttons.ts` |
| Data display | [Badge](./data-display/Badge.md) | `ui/Badge.tsx` |
| Data display | [Table](./data-display/Table.md) | `ui/Table.tsx` |
| Data display | [DataTable](./data-display/DataTable.md) | `ui/DataTable.tsx` |
| Tokens | [Shared tokens](./tokens/shared-tokens.md) (`card`, `focusRing`) | `ui/card.ts`, `ui/focusRing.ts` |

## Conventions every component follows

- **Tailwind utility classes**, not CSS modules or styled-components — every component reads brand tokens directly as Tailwind classes (`bg-paper`, `text-ink/60`, `border-ink/15`).
- **App/console shape rules** (see BRAND-STYLE-GUIDE.md §3): 4–6px radius, no shadows, hairline `ink/15` borders for separation. This is the console, not the marketing site — don't reach for the brand-mode hard block shadow here.
- **`focusRing`** is applied to every interactive element without exception — this is a keyboard-accessibility floor, not optional polish.
- **JetBrains Mono (`font-term`)** for chrome: table headers, badges, counts, uppercase labels. Never for body text.
