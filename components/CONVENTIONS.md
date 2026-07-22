# Mari design system — layout & content conventions

Binding rules for every component and page. Derived from `updates.md`.
When a component conflicts with a rule below, the rule wins.

## 1. Card / panel content order

Any card, drawer, panel, or inspector that is **not** a table lays its content
out top-to-bottom in exactly this order (skip what does not apply, never
reorder):

1. Header (title of the card)
2. Header summary (one line of supporting text)
3. Search bar, if the card has one
4. Title of the doc/content
5. Summary of the doc/content
6. Source badge
7. Status badge — source + status sit **on the left**; date and
   author/approver go **right-aligned on the same line** (or left-aligned on
   the same plumb line — pick one and keep it consistent inside a card)
8. References / Endpoints
9. Members / Connections
10. Owners
11. Buttons
12. Biggest action last

Use `<CardBody>` / `<CardMeta>` from `layout/CardShell.tsx` so the ordering and
spacing are literally the same object everywhere.

## 2. Actions

- **Confirm / next-step / primary actions go at the BOTTOM LEFT** of whatever
  they sit on. Not right, not centered.
- The affirmative action is `<Button variant="primary">` (biscay blue). A
  destructive one is `variant="danger"`; an explicit yes/approve on a
  confirmation is `variant="success"`.
- Secondary actions sit to the **right** of the primary on the same line
  (e.g. "Create review task" left, "Open document" right).
- Destructive actions (delete, remove, revoke) must go through
  `<ConfirmButton>` — never fire on first click.
- Every button must actually do something visible. If a control has no
  behaviour yet, wire it to local state that changes the UI (expand a table,
  open a drawer, toast) rather than leaving it inert.
- If a table has an action button, it goes in the **top right** of the table.

## 3. Tables

- Every column header is rendered by `<SortHeader>` (`data-display/sortable.tsx`)
  and shows a sort affordance. No bare `<th>` text.
- Column spacing is uniform: `px-4 py-2.5` on headers, `px-4 py-3` on cells.
  Use the shared `thClass` / `tdClass` exports.
- Numeric / middle "server"-type fields are centered (`align="center"`).
- **Status column placement**: first column by default. If a row has a
  clickable action, status is second-to-last. If there is no clickable item,
  status is last. Inside a small node/modal/popup or a timeline, status is last.
- Tables always have visible column headers, even inside panels and cards.
- Filter/select labels use **sentence case**: "All sources", "All statuses",
  "All regions" — never "All Region" or "All Sources".
- The sort control is the standard sort icon (`ArrowUpDown`); do not use an
  "A-Z" glyph.

## 4. Chips & badges

- All chips render **ALL CAPS** (`Chip` defaults `caps` to true). This includes
  `StatusChip`, `SeverityChip`, `Pill`, `TagChip`, `GradeChip`, and any bespoke
  chip inside a page or feature.
- Never hand-roll a chip with `<span className="rounded-full …">`. Import from
  `data-display/Chip.tsx`. Tag-like chips use `TagChip`, which must look
  identical to the chips in `TagPicker`.
- Selected/interactive chips highlight on **all four sides**
  (`border-biscay-2 ring-1 ring-biscay-2`), never just some edges.
- `verified` is **green**.
- Severity/state colors must never be the *only* signal — pair color with a
  dot, an icon, or a label (color-blind accessibility).

## 5. Typography & content

- **No em dashes (—) or en dashes (–) in user-visible copy.** Use a comma, a
  colon, a period, or the word "to" for ranges. (Code comments may keep them.)
- Dates always carry a year: `Jul 16, 2026`. Use `fmtDate` / `fmtDateTime`
  from `tokens/format.ts` — never format dates inline.
- Sentence case for labels and filter options; ALL CAPS only for chips and
  mono column headers.
- Server/region names come from `tokens/regions.ts` — one canonical spelling
  everywhere (`US West (us-west-2)` in prose/labels, `us-west-2` as a code).

## 6. Accessibility

- Disabled controls use `disabled:opacity-100` plus the explicit disabled
  palette in `actions/buttons.ts` — a darker, clearly-legible grey, not a
  washed-out 45% ghost.
- Body/secondary text is no lighter than `text-ink/70`. Meta/label text no
  lighter than `text-ink/65`.
- Icons default to 18px at stroke 1.9 (`IconBase`) so they read at a glance.
- Charts and status indicators need a non-color channel (pattern, icon, label).
- Status markers must not look like radio buttons — a circle means "choose me".
  Use a square/checkmark/bar marker for state.

## 7. Forms

- Any member/owner/assignee picker is a **searchable** combobox
  (`forms/Combobox.tsx` with `search`), never a plain select.
- Owner, priority, and due date sit on one line, in that order.
- Dropdown options are Capitalized where they name a role or status.

## 8. Errors

- All error/warning copy comes from `feedback/errors.ts`. Render with
  `<ErrorMessage id="…" />` or `<Alert>`. No bespoke error strings.

## 9. Skeletons

Existing skeleton/loading work must be preserved. If a component has a
`loading` prop it keeps it.

## 10. Responsiveness

Components are **desktop-first, fixed-width**. Do not introduce
`flex-col … lg:flex-row` stacking or `w-full … lg:w-[Npx]` widths on desktop
components — that made drawers render mobile-style in the desktop canvas. Pages
handle mobile via the `mobile` prop on the page component, not via component
breakpoints.
