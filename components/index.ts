/* Mari console component library — one file per component, organized by
 * type. This is a standalone reference implementation (not wired into any
 * app's build) — copy what you need into your project. Source of truth
 * for each component's behavior is mari-cc/console; if that diverges from
 * here, this repo is stale until re-synced. */

export { card } from "./tokens/card";
export { focusRing } from "./tokens/focusRing";
export { fmtDate, fmtDateTime, fmtAgo, type DateInput } from "./tokens/format";

export { btn, btnPrimary, btnDanger } from "./actions/buttons";
export { Button, type ButtonProps } from "./actions/Button";
export { ConfirmButton, type ConfirmButtonProps } from "./actions/ConfirmButton";

export { Page } from "./layout/Page";
export { PageHeader, type PageHeaderProps } from "./layout/PageHeader";
export { Drawer } from "./layout/Drawer";
export { Card, type CardProps } from "./layout/Card";

export { Field } from "./forms/Field";
export { SectionLabel } from "./forms/SectionLabel";
export { FormField } from "./forms/FormField";
export { Input } from "./forms/Input";
export { Select } from "./forms/Select";
export { Textarea, type TextareaProps } from "./forms/Textarea";
export { Switch, type SwitchProps } from "./forms/Switch";

export { Badge, resolveTone, resolveToneKey } from "./data-display/Badge";
export { Table } from "./data-display/Table";
export { DataTable, type Column } from "./data-display/DataTable";
export { Chip, StatusChip, SeverityChip, CountChip, type ChipProps, type ChipTone, type ChipStatus, type ChipSeverity } from "./data-display/Chip";
export { EmptyState } from "./data-display/EmptyState";
export { Spinner } from "./data-display/Spinner";
export { Stepper } from "./data-display/Stepper";
export { Stat, type StatTone } from "./data-display/Stat";
export { IconRing, type IconRingTone } from "./data-display/IconRing";
export { Avatar } from "./data-display/Avatar";
export { Swatch } from "./data-display/Swatch";
export { Sparkline } from "./data-display/Sparkline";

export { Tabs, type TabsProps, type TabOption, type TabsVariant } from "./navigation/Tabs";
export { Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuLabel, MenuSeparator, type MenuProps } from "./navigation/Menu";
export { Popover, type PopoverProps } from "./navigation/Popover";
export { Tooltip } from "./navigation/Tooltip";

export { Toaster, useToast, type ToastTone } from "./feedback/Toast";
