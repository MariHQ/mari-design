# Shared tokens

**Type:** Tokens (not components — building blocks the components above are made of)
**Source:** `mari-cc/console/src/saas/components/ui/card.ts`, `ui/focusRing.ts`

## `card`

```ts
export const card = "bg-paper rounded-md border border-ink/15";
```

The base container treatment: paper background, `rounded-md` (the app/console 4–6px radius, not the marketing 0px), hairline `ink/15` border. `Table` and `DataTable` both build on this directly (`` `${card} mt-5 overflow-hidden` ``).

**Use this for any new container component** rather than hand-writing `bg-paper rounded-md border border-ink/15` inline — if the app-mode container treatment ever changes, it should change in one place.

## `focusRing`

```ts
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biscay-2/70 focus-visible:ring-offset-1";
```

The one keyboard-focus treatment for the whole console. Applied to: `buttons.ts`'s three variants, `DataTable`'s sort headers and pagination buttons, `Drawer`'s close button.

**Every interactive element that isn't already using `btn`/`btnPrimary`/`btnDanger` needs this appended to its className.** This is not optional visual polish — it's the only way keyboard users can see where they are. If you're building a new interactive component and it doesn't have a visible focus state, that's a bug, not a style choice.
