import { useMemo, useState } from "react";
import { RefreshCw, Search, ScrollText } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Avatar } from "../data-display/Avatar";
import { EmptyState } from "../data-display/EmptyState";
import { Skeleton, SkeletonLine, SkeletonTable } from "../data-display/Skeleton";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Scrollable } from "../data-display/Scrollable";
import { fmtDateTime } from "../tokens/format";

/* Settings — Access log ───────────────────────────────────────────────────
   A read-only chronological record of every workspace change — actor, action
   verb, target, and time — for the last 50 events, with a client-side text
   filter and manual refresh. Source: web/src/pages/settings/AuditLog.tsx.
   Standalone with baked demo events; Refresh just reshuffles the "now". */

export type AuditEvent = { id: number; actor: string; verb: string; target: string; at: string };

const DEMO_EVENTS: AuditEvent[] = [
  { id: 1, actor: "Maya Chen", verb: "invited member", target: "sam@team.com", at: "2025-07-20T15:42:00" },
  { id: 2, actor: "Devon Park", verb: "revoked API key", target: "Old bot (rotated)", at: "2025-07-20T11:08:00" },
  { id: 3, actor: "Priya Nair", verb: "changed role", target: "devon@team.com to Manager", at: "2025-07-19T18:20:00" },
  { id: 4, actor: "Maya Chen", verb: "deployed site", target: "docs.acme.com v14", at: "2025-07-19T09:55:00" },
  { id: 5, actor: "System", verb: "synced source", target: "GitHub · acme/handbook", at: "2025-07-18T22:03:00" },
  { id: 6, actor: "Devon Park", verb: "updated setting", target: "llm set to anthropic:claude-3.5", at: "2025-07-18T14:17:00" },
  { id: 7, actor: "Priya Nair", verb: "created MCP server", target: "support-kb", at: "2025-07-17T10:44:00" },
  { id: 8, actor: "Maya Chen", verb: "verified fact", target: "SLA response time", at: "2025-07-16T16:30:00" },
];

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export type SettingsAuditLogProps = {
  /** Hide the internal PageHeader when the host page already renders one. */
  embedded?: boolean; events?: AuditEvent[]; total?: number; loading?: boolean; className?: string };

export function SettingsAuditLog({ events = DEMO_EVENTS, total = DEMO_EVENTS.length, loading = false, embedded = false, className = "" }: SettingsAuditLogProps) {
  const [filter, setFilter] = useState("");
  const [nonce, setNonce] = useState(0);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => `${e.actor} ${e.verb} ${e.target} ${e.at}`.toLowerCase().includes(q));
  }, [events, filter]);

  const { sort, onSort, sorted } = useSort(shown, {
    actor: (e) => e.actor,
    action: (e) => e.verb,
    target: (e) => e.target,
    when: (e) => e.at,
  });

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5"><Skeleton width={150} height={20} /><SkeletonLine w={320} h={11} /></div>
          <Skeleton width={190} height={32} rounded="rounded-[4px]" />
        </div>
        <SkeletonTable rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      {!embedded && <PageHeader
        title="Access log"
        description="Every change in the workspace, who made it, and when"
        actions={<Button onClick={() => setNonce((n) => n + 1)}><RefreshCw size={14} /> Refresh{nonce > 0 ? ` (${nonce})` : ""}</Button>}
      />}

      <Card variant="flush" title="Events" hint={`${shown.length} of ${total} events (last 50)`} actions={
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] border border-ink/20 bg-paper focus-within:border-biscay-2 focus-within:ring-1 focus-within:ring-biscay-2/40">
          <Search size={13} className="text-ink/65" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter events…" className="w-[150px] bg-transparent text-[12.5px] text-ink placeholder:text-ink/65 outline-none" />
        </div>
      }>
        {shown.length === 0 ? (
          <EmptyState icon={<ScrollText size={24} />} title={events.length === 0 ? "No events yet" : "No matches"}>
            {events.length === 0 ? "Workspace activity will appear here." : "No events match that filter."}
          </EmptyState>
        ) : (
          <Scrollable>
            <table className="w-full text-left border-collapse" style={{ minWidth: 760 }}>
              <colgroup>
                <col style={{ width: "24%" }} /><col style={{ width: "20%" }} /><col style={{ width: "36%" }} /><col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <SortHeader label="Actor" sortKey="actor" sort={sort} onSort={onSort} />
                  <SortHeader label="Action" sortKey="action" sort={sort} onSort={onSort} />
                  <SortHeader label="Target" sortKey="target" sort={sort} onSort={onSort} />
                  <SortHeader label="When" sortKey="when" sort={sort} onSort={onSort} align="center" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id} className="border-b border-ink/10 last:border-0 align-top">
                    <td className={tdPad}>
                      <span className="flex items-start gap-2.5">
                        <Avatar initials={initialsOf(e.actor)} />
                        <span className="min-w-0 break-words text-[13px] font-medium text-ink">{e.actor}</span>
                      </span>
                    </td>
                    <td className={`${tdPad} text-[13px] text-ink/70`}>{e.verb}</td>
                    <td className={`${tdPad} break-all text-[13px] text-ink/85`}>{e.target}</td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{fmtDateTime(e.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scrollable>
        )}
      </Card>
    </div>
  );
}
