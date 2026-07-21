# Console components

The Mari console component library — real, typechecked TypeScript/React source, one file per component, organized by type. This is the canonical copy; it originated as `mari-cc/console/src/saas/components/console-ui.tsx` (a monolithic file) and lives here now as the source of truth for the design system, independent of any one app's build.

Written to the same brand system as `../BRAND-STYLE-GUIDE.md` — read that first for the underlying tokens (colors, type, spacing, shape language) these components consume.

**Standalone reference, not a published/linked package.** Nothing currently imports this at build time — copy the file(s) you need into your app. `package.json` + `tsconfig.json` here exist only so the library typechecks on its own (`npm install && npx tsc -p tsconfig.json`), proving the code is real and correct, not just documentation.

## Index by type

| Type | Component | Source | Doc |
|---|---|---|---|
| Layout | [`Page.tsx`](./layout/Page.tsx) | Screen header (kicker/title/subtitle/actions) | [Page.md](./layout/Page.md) |
| Layout | [`Drawer.tsx`](./layout/Drawer.tsx) | Right-side slide-over, focus-trapped | [Drawer.md](./layout/Drawer.md) |
| Layout | [`Card.tsx`](./layout/Card.tsx) | Generic bordered content container | [Card.md](./layout/Card.md) |
| Forms | [`Field.tsx`](./forms/Field.tsx) | Labeled read-only key/value row | [Field.md](./forms/Field.md) |
| Actions | [`buttons.ts`](./actions/buttons.ts) | `btn` / `btnPrimary` / `btnDanger` class strings | [Buttons.md](./actions/Buttons.md) |
| Actions | [`Button.tsx`](./actions/Button.tsx) | Full button component, 5 variants | [Button.md](./actions/Button.md) |
| Data display | [`Badge.tsx`](./data-display/Badge.tsx) | 5-tone status pill | [Badge.md](./data-display/Badge.md) |
| Data display | [`Chip.tsx`](./data-display/Chip.tsx) | Interactive chip + Status/Severity/Count wrappers | [Chip.md](./data-display/Chip.md) |
| Data display | [`Table.tsx`](./data-display/Table.tsx) | Static table shell | [Table.md](./data-display/Table.md) |
| Data display | [`DataTable.tsx`](./data-display/DataTable.tsx) | Search/sort/filter/paginate table | [DataTable.md](./data-display/DataTable.md) |
| Navigation | [`Tabs.tsx`](./navigation/Tabs.tsx) | Accessible tab switcher (Radix-based) | [Tabs.md](./navigation/Tabs.md) |
| Tokens | [`card.ts`](./tokens/card.ts), [`focusRing.ts`](./tokens/focusRing.ts) | Shared style-string tokens | [shared-tokens.md](./tokens/shared-tokens.md) |

`index.ts` re-exports everything as one barrel.

## Conventions every component follows

- **Tailwind utility classes**, not CSS modules or styled-components — every component reads brand tokens directly as Tailwind classes (`bg-paper`, `text-ink/60`, `border-ink/15`). Your consuming app needs the same Tailwind config as `mari-cc/console` (the `ink`/`paper`/`biscay`/`flysch`/`espelette`/`moss`/`clay` color tokens, `font-display`/`font-term` families) for these to render correctly — see `../BRAND-STYLE-GUIDE.md` §1–2 for the exact values.
- **App/console shape rules** (BRAND-STYLE-GUIDE.md §3): 4–6px radius, no shadows, hairline `ink/15` borders for separation. This is console-mode styling, not marketing/brand-mode — don't reach for the hard block shadow here.
- **`focusRing`** is applied to every interactive element without exception — a keyboard-accessibility floor, not optional polish.
- **JetBrains Mono (`font-term`)** for chrome: table headers, badges, counts, uppercase labels. Never for body text.
- **No `clsx`** — conditional classes are composed as plain template literals / `filter(Boolean).join(" ")`, matching the rest of the library. `Tabs` is the one exception on the *dependency* side (needs `@radix-ui/react-tabs` for real keyboard/ARIA behavior), not the styling side — its classes are still plain strings.

## Keeping this in sync

If `mari-cc/console` changes these components, this library goes stale until someone ports the change back here (and vice versa — this is the canonical copy now, so **new component work should start here**, not in an app repo).
