import { Fragment, useState, type ReactNode } from "react";
import { ScrollText, RefreshCw, Search, ChevronDown, X } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { Scrollable } from "../data-display/Scrollable";
import { PropertyList } from "../data-display/PropertyList";
import { Avatar } from "../data-display/Avatar";
import { Pagination } from "../data-display/Pagination";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { fmtDateTime } from "../tokens/format";
import { SettingsAuditLog, type AuditEvent } from "../features/SettingsAuditLog";
import type { PropertyItem } from "../data-display/PropertyList";

/* Settings → Audit log (pages/settings-audit-log.md). Read-only record of the
   last 50 workspace changes with a client-side filter and manual refresh. The
   default / empty variants render the SettingsAuditLog feature; the filtered,
   expanded, and paginated variants render inline so an applied filter, an open
   detail row, and the pager can all be captured. Under the shared settings tab
   strip.

   Pure presenter: the events, the applied filter, the expanded row and the
   rail summary all arrive in `data`. "No events yet" is derived from the log
   being empty. */

const STATES = [
  { id: "default", label: "Event log" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No events yet" },
  { id: "filtered-actor", label: "Filtered by actor" },
  { id: "filtered-action", label: "Filtered by action" },
  { id: "filtered-date", label: "Filtered by date" },
  { id: "no-match", label: "Filter: no matches" },
  { id: "expanded", label: "Expanded entry" },
  { id: "many", label: "Many events (paginated)" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** A filter the user has applied to the log. `matches` is what the server
    returned for it, so an empty array genuinely means "no matches". */
export type AuditFilter = { label: string; matches: AuditEvent[] };

/** Extra detail the log shows when a row is expanded. */
export type AuditDetail = { label: string; value: string };

/** Everything Settings → Audit log renders. */
export type SettingsAuditLogData = {
  events: AuditEvent[];
  /** Events in the window, which may exceed the page of `events` shown. */
  total: number;
  /** The applied filter, or `null` for the unfiltered log. */
  filter: AuditFilter | null;
  /** The row whose detail panel is open. */
  expandedId: number | null;
  /** Detail rows for the expanded event. */
  detail: AuditDetail[];
  /** Pager: `null` when the whole window fits on one page. */
  pager: { page: number; pageCount: number; label: string } | null;
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
};

type SettingsTab =
  | "general" | "members" | "models" | "sources" | "api-keys" | "audit" | "design";

const SETTINGS_TABS: TabOption<SettingsTab>[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "models", label: "Models" },
  { id: "sources", label: "Sources" },
  { id: "api-keys", label: "API keys" },
  { id: "audit", label: "Access log" },
  { id: "design", label: "Design & brand" },
];

function SettingsTabs({ active }: { active: SettingsTab }) {
  const [value, setValue] = useState<SettingsTab>(active);
  return (
    <Tabs
      ariaLabel="Workspace settings"
      variant="underline"
      options={SETTINGS_TABS}
      value={value}
      onChange={setValue}
    />
  );
}

/* ── §11 page grid ─────────────────────────────────────────────────────────
   Shared verbatim with the other four Settings pages: one container width, one
   main/rail split, one form-field grid. */
const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";

function SettingsBody({ mobile, rail, children }: { mobile: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";
const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function AuditInline({ data }: { data: SettingsAuditLogData }) {
  const { filter, expandedId, detail, pager } = data;
  const rows = filter ? filter.matches : data.events;

  return (
    <Card
      variant="flush"
      title="Events"
      hint={`${rows.length} of ${data.total} events${pager ? "" : " (last 50)"}`}
      actions={
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] border border-ink/20 bg-paper">
          <Search size={13} className="text-ink/65" />
          <input readOnly value={filter ? filter.label.split(": ")[1] ?? "" : ""} placeholder="Filter events…" className="w-[150px] bg-transparent text-[12.5px] text-ink placeholder:text-ink/65 outline-none" />
        </div>
      }
    >
      {filter && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink/10">
          <span className="text-[11.5px] text-ink/65">Filter:</span>
          <span className="inline-flex items-center gap-1"><Chip label={filter.label} tone="info" caps /><X size={12} className="text-ink/65" /></span>
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title="No matches">No events match that filter.</EmptyState>
      ) : (
        <Scrollable>
          <table className="w-full text-left border-collapse" style={{ minWidth: 700 }}>
            <thead><tr>{["Actor", "Action", "Target", "When", ""].map((h, i) => <th key={i} className={`${thClass} px-4 py-2.5 border-y border-ink/10`} style={i === 3 ? { width: 160 } : i === 4 ? { width: 40 } : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((e) => (
                <Fragment key={e.id}>
                  <tr className={`border-b border-ink/10 last:border-0 ${e.id === expandedId ? "bg-flysch/60" : ""}`}>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2.5"><Avatar initials={initialsOf(e.actor)} /><span className="text-[13px] font-medium text-ink">{e.actor}</span></span></td>
                    <td className="px-4 py-3 text-[13px] text-ink/60">{e.verb}</td>
                    <td className="px-4 py-3 text-[13px] text-ink/85">{e.target}</td>
                    <td className="px-4 py-3 font-term text-[12px] text-ink/60 whitespace-nowrap">{fmtDateTime(e.at)}</td>
                    <td className="px-4 py-3"><ChevronDown size={14} className={`text-ink/65 ${e.id === expandedId ? "rotate-180" : ""}`} /></td>
                  </tr>
                  {e.id === expandedId && (
                    <tr className="border-b border-ink/10 bg-flysch/30">
                      <td colSpan={5} className="px-4 py-3">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-term text-[12px] sm:grid-cols-4">
                          {detail.map((d) => (
                            <div key={d.label}><dt className="text-ink/65">{d.label}</dt><dd className="text-ink/80">{d.value}</dd></div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Scrollable>
      )}
      {pager && (
        <div className="px-4 py-3 border-t border-ink/10">
          <Pagination page={pager.page} pageCount={pager.pageCount} onChange={() => {}} itemLabel={pager.label} />
        </div>
      )}
    </Card>
  );
}

/* Supporting rail (§11, 320px) — matches the other four Settings rails. */
function AuditRail({ summary }: { summary: PropertyItem[] }) {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList items={summary} />
      </Card>
      <Card title="Reading the log">
        <p className="text-[12.5px] leading-relaxed text-ink/70">
          Entries are immutable. Filter by actor, action, or date, then expand a
          row for the before and after values, the request ID, and the source IP.
        </p>
      </Card>
    </>
  );
}

/** No workspace activity recorded at all. Derived from the data. */
function isEmpty(d: SettingsAuditLogData): boolean {
  return d.events.length === 0 && d.filter === null;
}

function Body({ data, error }: { data: SettingsAuditLogData; error: string | null }) {
  if (error) {
    return <EmptyState icon={<ScrollText size={22} />} title="API offline">{error}</EmptyState>;
  }
  if (isEmpty(data)) {
    return (
      <EmptyState icon={<ScrollText size={22} />} title="No events yet">
        Workspace changes will show up here as they happen.
      </EmptyState>
    );
  }
  /* An applied filter, an open detail row, or a pager all need the inline
     table; the plain log is the feature's own. */
  if (data.filter || data.expandedId !== null || data.pager) {
    return <AuditInline data={data} />;
  }
  return <SettingsAuditLog embedded events={data.events} total={data.total} />;
}

function SettingsAuditLogPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<SettingsAuditLogData>) {
  return (
    <PageFrame chrome={chrome} active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="Access log"
            description="Every workspace change: actor, action, target, and time."
            actions={<Button variant="default"><RefreshCw size={15} /> Refresh</Button>}
          />
          <div className="mt-5"><SettingsTabs active="audit" /></div>
          <SettingsBody mobile={mobile} rail={<AuditRail summary={data.summary} />}>
            <Body data={data} error={error} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsAuditLogData> = {
  id: "settings-audit-log",
  title: "Settings · Access log",
  route: "/settings/audit",
  component: SettingsAuditLogPage,
  states: STATES.map((s) => ({ ...s })),
};
