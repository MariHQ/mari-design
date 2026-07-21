/* Mari console component library — one file per component, organized by
 * type. This is a standalone reference implementation (not wired into any
 * app's build) — copy what you need into your project. Source of truth
 * for each component's behavior is mari-cc/console; if that diverges from
 * here, this repo is stale until re-synced. */

export { card } from "./tokens/card";
export { focusRing } from "./tokens/focusRing";
export { btn, btnPrimary, btnDanger } from "./actions/buttons";
export { Page } from "./layout/Page";
export { Drawer } from "./layout/Drawer";
export { Field } from "./forms/Field";
export { Badge } from "./data-display/Badge";
export { Table } from "./data-display/Table";
export { DataTable, type Column } from "./data-display/DataTable";
