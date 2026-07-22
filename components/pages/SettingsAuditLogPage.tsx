import { Fragment, useState } from "react";
import { ScrollText, RefreshCw, Search, ChevronDown, X } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Tabs, type TabOption } from "../navigation/Tabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { Avatar } from "../data-display/Avatar";
import { Pagination } from "../data-display/Pagination";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { fmtDateTime } from "../tokens/format";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { SettingsAuditLog, type AuditEvent } from "../features/SettingsAuditLog";
import {
  LONG_NAME, LONG_SOURCE, LONG_PARAGRAPH, LONG_URL, LONG_WORD, UNBREAKABLE,
  MIXED_SCRIPT, HUGE_NUMBER_STR, MANY_TAGS, MANY_INITIALS, repeat,
} from "./stress";

/* Settings → Audit log (pages/settings-audit-log.md). Read-only record of the
   last 50 workspace changes with a client-side filter and manual refresh. The
   default / empty variants render the SettingsAuditLog feature; the filtered,
   expanded, and paginated variants render inline so an applied filter, an open
   detail row, and the pager can all be captured. Under the shared settings tab
   strip. */

const STATES = [
  { id: "default", label: "Event log" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No events yet" },
  { id: "filtered-actor", label: "Filtered by actor" },
  { id: "filtered-action", label: "Filtered by action" },
  { id: "filtered-date", label: "Filtered by date" },
  { id: "no-match", label: "Filter — no matches" },
  { id: "expanded", label: "Expanded entry" },
  { id: "many", label: "Many events (paginated)" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

type SettingsTab =
  | "general" | "members" | "models" | "sources" | "api-keys" | "audit" | "design";

const SETTINGS_TABS: TabOption<SettingsTab>[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "models", label: "Models" },
  { id: "sources", label: "Sources" },
  { id: "api-keys", label: "API keys" },
  { id: "audit", label: "Audit log" },
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
      className="mb-5"
    />
  );
}

const EVENTS: AuditEvent[] = [
  { id: 1, actor: "Maya Chen", verb: "invited member", target: "sam@team.com", at: "2025-07-20T15:42:00" },
  { id: 2, actor: "Devon Park", verb: "revoked API key", target: "Old bot (rotated)", at: "2025-07-20T11:08:00" },
  { id: 3, actor: "Priya Nair", verb: "changed role", target: "devon@team.com → manager", at: "2025-07-19T18:20:00" },
  { id: 4, actor: "Maya Chen", verb: "deployed site", target: "docs.acme.com v14", at: "2025-07-19T09:55:00" },
  { id: 5, actor: "System", verb: "synced source", target: "GitHub · acme/handbook", at: "2025-07-18T22:03:00" },
  { id: 6, actor: "Devon Park", verb: "updated setting", target: "llm → anthropic:claude-3.5", at: "2025-07-18T14:17:00" },
  { id: 7, actor: "Priya Nair", verb: "created MCP server", target: "support-kb", at: "2025-07-17T10:44:00" },
  { id: 8, actor: "Maya Chen", verb: "verified fact", target: "SLA response time", at: "2025-07-16T16:30:00" },
];

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";
const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

type AuditVariant = "filtered-actor" | "filtered-action" | "filtered-date" | "no-match" | "expanded" | "many";

function AuditInline({ variant }: { variant: AuditVariant }) {
  const filter =
    variant === "filtered-actor" ? { label: "actor: Maya Chen", rows: EVENTS.filter((e) => e.actor === "Maya Chen") }
    : variant === "filtered-action" ? { label: "action: changed role", rows: EVENTS.filter((e) => e.verb.includes("role")) }
    : variant === "filtered-date" ? { label: "date: 2025-07-20", rows: EVENTS.filter((e) => e.at.startsWith("2025-07-20")) }
    : variant === "no-match" ? { label: "actor: nobody", rows: [] as AuditEvent[] }
    : null;

  const rows = filter ? filter.rows : EVENTS;
  const total = variant === "many" ? 214 : EVENTS.length;
  const expandedId = variant === "expanded" ? 3 : -1;

  return (
    <Card
      variant="flush"
      title="Events"
      hint={`${rows.length} of ${total} events${variant === "many" ? "" : " (last 50)"}`}
      actions={
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] border border-ink/20 bg-paper">
          <Search size={13} className="text-ink/50" />
          <input readOnly value={filter ? filter.label.split(": ")[1] ?? "" : ""} placeholder="Filter events…" className="w-[150px] bg-transparent text-[12.5px] text-ink placeholder:text-ink/45 outline-none" />
        </div>
      }
    >
      {filter && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ink/10">
          <span className="text-[11.5px] text-ink/50">Filter:</span>
          <span className="inline-flex items-center gap-1"><Chip label={filter.label} tone="info" caps /><X size={12} className="text-ink/40" /></span>
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title="No matches">No events match that filter.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
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
                    <td className="px-4 py-3"><ChevronDown size={14} className={`text-ink/40 ${e.id === expandedId ? "rotate-180" : ""}`} /></td>
                  </tr>
                  {e.id === expandedId && (
                    <tr className="border-b border-ink/10 bg-flysch/30">
                      <td colSpan={5} className="px-4 py-3">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-term text-[12px] sm:grid-cols-4">
                          {[["Event ID", `evt_${e.id}f8a20c`], ["Actor IP", "203.0.113.24"], ["Before", "role=user"], ["After", "role=manager"], ["Source", "web · console"], ["Request", "req_9c1e…"]].map(([k, v]) => (
                            <div key={k}><dt className="text-ink/45">{k}</dt><dd className="text-ink/80">{v}</dd></div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {variant === "many" && (
        <div className="px-4 py-3 border-t border-ink/10">
          <Pagination page={0} pageCount={27} onChange={() => {}} itemLabel="Showing 1–8 of 214" />
        </div>
      )}
    </Card>
  );
}

const INLINE: AuditVariant[] = ["filtered-actor", "filtered-action", "filtered-date", "no-match", "expanded", "many"];

function StressAudit({ extreme }: { extreme: boolean }) {
  const events: AuditEvent[] = extreme
    ? repeat((i) => ({
        id: i + 1,
        actor: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3],
        verb: UNBREAKABLE,
        target: `${LONG_WORD} → ${MIXED_SCRIPT} ${HUGE_NUMBER_STR}`,
        at: "2025-07-20T15:42:00",
      }), 6)
    : repeat((i) => ({
        id: i + 1,
        actor: LONG_NAME,
        verb: "updated a very long-named workspace setting and reconciled it across regions",
        target: `${LONG_SOURCE} → ${LONG_URL}`,
        at: "2025-07-20T15:42:00",
      }), 6);
  return (
    <div className="flex flex-col gap-5">
      <SettingsAuditLog events={events} total={extreme ? 987654321 : 214} />
      <Card title={extreme ? UNBREAKABLE : "Everyone who touched the workspace this quarter"} hint={extreme ? MIXED_SCRIPT : LONG_PARAGRAPH}>
        <div className="flex items-center gap-3">
          <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={5} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink/60">{extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} events recorded across all sources`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(extreme ? [UNBREAKABLE, LONG_WORD, ...MANY_TAGS] : MANY_TAGS).map((t, i) => <Chip key={i} label={t} tone="info" caps />)}
        </div>
      </Card>
    </div>
  );
}

function Body({ state }: { state: string }) {
  if (state === "overflow" || state === "stress") return <StressAudit extreme={state === "stress"} />;
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<ScrollText size={22} />} title="API offline">
          The audit log is temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-5">
        <EmptyState icon={<ScrollText size={22} />} title="No events yet">
          Workspace changes will show up here as they happen.
        </EmptyState>
      </div>
    );
  }
  if ((INLINE as string[]).includes(state)) {
    return <AuditInline variant={state as AuditVariant} />;
  }
  return <SettingsAuditLog />;
}

function SettingsAuditLogPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <PageHeader
            eyebrow="Settings"
            title="Audit log"
            description="Every workspace change — actor, action, target, and time."
            actions={<Button variant="default" icon><RefreshCw size={15} /> Refresh</Button>}
          />
          <div className="mt-5" />
          <SettingsTabs active="audit" />
          <Body state={state} />
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "settings-audit-log",
  title: "Settings · Audit log",
  route: "/settings/audit",
  component: SettingsAuditLogPage,
  states: STATES.map((s) => ({ ...s })),
};
