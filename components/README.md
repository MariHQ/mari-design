# Console components

The Mari console component library — real, typechecked TypeScript/React source, one file per component, organized by type. This is the canonical copy; it originated as `mari-cc/console/src/saas/components/console-ui.tsx` (a monolithic file) and lives here now as the source of truth for the design system, independent of any one app's build.

Written to the same brand system as `../BRAND-STYLE-GUIDE.md` — read that first for the underlying tokens (colors, type, spacing, shape language) these components consume.

**Standalone reference, not a published/linked package.** Nothing currently imports this at build time — copy the file(s) you need into your app. `package.json` + `tsconfig.json` here exist only so the library typechecks on its own (`npm install && npx tsc -p tsconfig.json`), proving the code is real and correct, not just documentation.

## Index by type

| Type | Component | Source | Doc |
|---|---|---|---|
| Layout | [`Page.tsx`](./layout/Page.tsx) | Full-screen wrapper (kicker/title/subtitle/actions + body) | [Page.md](./layout/Page.md) |
| Layout | [`PageHeader.tsx`](./layout/PageHeader.tsx) | Header-only fragment, with back-link | [PageHeader.md](./layout/PageHeader.md) |
| Layout | [`Drawer.tsx`](./layout/Drawer.tsx) | Right-side slide-over, focus-trapped | [Drawer.md](./layout/Drawer.md) |
| Layout | [`Card.tsx`](./layout/Card.tsx) | Generic bordered content container | [Card.md](./layout/Card.md) |
| Forms | [`Field.tsx`](./forms/Field.tsx) | Labeled read-only key/value row | [Field.md](./forms/Field.md) |
| Forms | [`FormField.tsx`](./forms/FormField.tsx) | Labeled editable-form row | [FormField.md](./forms/FormField.md) |
| Forms | [`SectionLabel.tsx`](./forms/SectionLabel.tsx) | The uppercase mono label, standalone | [SectionLabel.md](./forms/SectionLabel.md) |
| Forms | [`Input.tsx`](./forms/Input.tsx), [`Select.tsx`](./forms/Select.tsx), [`Textarea.tsx`](./forms/Textarea.tsx) | Styled native form controls | [Input.md](./forms/Input.md) |
| Forms | [`Switch.tsx`](./forms/Switch.tsx) | Toggle (Radix-based) | [Switch.md](./forms/Switch.md) |
| Actions | [`buttons.ts`](./actions/buttons.ts) | `btn` / `btnPrimary` / `btnDanger` class strings | [Buttons.md](./actions/Buttons.md) |
| Actions | [`Button.tsx`](./actions/Button.tsx) | Full button component, 5 variants | [Button.md](./actions/Button.md) |
| Actions | [`ConfirmButton.tsx`](./actions/ConfirmButton.tsx) | Two-step destructive confirm | [ConfirmButton.md](./actions/ConfirmButton.md) |
| Data display | [`Badge.tsx`](./data-display/Badge.tsx) | 5-tone status pill | [Badge.md](./data-display/Badge.md) |
| Data display | [`Chip.tsx`](./data-display/Chip.tsx) | Interactive chip + Status/Severity/Count wrappers | [Chip.md](./data-display/Chip.md) |
| Data display | [`Table.tsx`](./data-display/Table.tsx) | Static table shell | [Table.md](./data-display/Table.md) |
| Data display | [`DataTable.tsx`](./data-display/DataTable.tsx) | Search/sort/filter/paginate table | [DataTable.md](./data-display/DataTable.md) |
| Data display | [`EmptyState.tsx`](./data-display/EmptyState.tsx) | Centered empty-panel state | [EmptyState.md](./data-display/EmptyState.md) |
| Data display | [`Spinner.tsx`](./data-display/Spinner.tsx) | Loading indicator, two sizes | [Spinner.md](./data-display/Spinner.md) |
| Data display | [`Stepper.tsx`](./data-display/Stepper.tsx) | Numbered step progress | [Stepper.md](./data-display/Stepper.md) |
| Data display | [`Stat.tsx`](./data-display/Stat.tsx) | Big-number stat card | [Stat.md](./data-display/Stat.md) |
| Data display | [`IconRing.tsx`](./data-display/IconRing.tsx) | Circle around an icon | [IconRing.md](./data-display/IconRing.md) |
| Data display | [`Avatar.tsx`](./data-display/Avatar.tsx) | Initials disc, deterministic tint | [Avatar.md](./data-display/Avatar.md) |
| Data display | [`Swatch.tsx`](./data-display/Swatch.tsx) | Color chip | [Swatch.md](./data-display/Swatch.md) |
| Data display | [`Sparkline.tsx`](./data-display/Sparkline.tsx) | Inline SVG trend line | [Sparkline.md](./data-display/Sparkline.md) |
| Navigation | [`Tabs.tsx`](./navigation/Tabs.tsx) | Accessible tab switcher (Radix-based) | [Tabs.md](./navigation/Tabs.md) |
| Navigation | [`Menu.tsx`](./navigation/Menu.tsx) | Dropdown menu + items (Radix-based) | [Menu.md](./navigation/Menu.md) |
| Navigation | [`Popover.tsx`](./navigation/Popover.tsx) | Click-open content panel (Radix-based) | [Popover.md](./navigation/Popover.md) |
| Navigation | [`Tooltip.tsx`](./navigation/Tooltip.tsx) | Hover/focus hint (Radix-based) | [Tooltip.md](./navigation/Tooltip.md) |
| Feedback | [`Toast.tsx`](./feedback/Toast.tsx) | Global transient notifications (Radix-based) | [Toast.md](./feedback/Toast.md) |
| Tokens | [`card.ts`](./tokens/card.ts), [`focusRing.ts`](./tokens/focusRing.ts), [`format.ts`](./tokens/format.ts) | Shared style-string tokens + date formatting | [shared-tokens.md](./tokens/shared-tokens.md) |

`index.ts` re-exports everything as one barrel — this is now feature-complete against the `cloud.mari.guru` reference implementation's design-system surface (`mari/mari/web/src/components/ui`).

## Conventions every component follows

- **Tailwind utility classes**, not CSS modules or styled-components — every component reads brand tokens directly as Tailwind classes (`bg-paper`, `text-ink/60`, `border-ink/15`). Your consuming app needs the same Tailwind config as `mari-cc/console` (the `ink`/`paper`/`biscay`/`flysch`/`espelette`/`moss`/`clay` color tokens, `font-display`/`font-term` families) for these to render correctly — see `../BRAND-STYLE-GUIDE.md` §1–2 for the exact values.
- **App/console shape rules** (BRAND-STYLE-GUIDE.md §3): 4–6px radius, no shadows, hairline `ink/15` borders for separation. This is console-mode styling, not marketing/brand-mode — don't reach for the hard block shadow here.
- **`focusRing`** is applied to every interactive element without exception — a keyboard-accessibility floor, not optional polish.
- **JetBrains Mono (`font-term`)** for chrome: table headers, badges, counts, uppercase labels. Never for body text.
- **No `clsx`** — conditional classes are composed as plain template literals / `filter(Boolean).join(" ")`, matching the rest of the library. `Tabs`, `Menu`, `Popover`, `Tooltip`, `Switch`, `Toaster` are the exceptions on the *dependency* side (each needs its matching `@radix-ui/react-*` package for real keyboard/ARIA behavior), not the styling side — their classes are still plain strings. All five Radix packages are already present in both `mari-cc/console` and `mari/web`'s dependency trees.

## Keeping this in sync

If `mari-cc/console` changes these components, this library goes stale until someone ports the change back here (and vice versa — this is the canonical copy now, so **new component work should start here**, not in an app repo).
