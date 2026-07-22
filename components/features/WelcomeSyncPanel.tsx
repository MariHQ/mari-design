import { useState } from "react";
import { Pause, Play, RefreshCw, X } from "lucide-react";
import { SectionLabel } from "../forms/SectionLabel";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Chip } from "../data-display/Chip";
import { Progress } from "../data-display/Progress";
import { EmptyState } from "../data-display/EmptyState";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { SyncStatusLine, type SyncSource } from "../feedback/SyncPanel";
import { Skeleton, SkeletonLine, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { SourceMark, GithubMark } from "../icons/marks";
import { fmtAgo } from "../tokens/format";

/* WelcomeSyncPanel — the Welcome wizard's live sync read-out for just-connected
   sources.

   Two things this fixes against the old panel:

   1. It is a table, so it gets real column headers, a sort affordance on every
      column, and the shared header/cell padding (CONVENTIONS.md §3). The old
      stacked rows had no headings at all, so nothing lined up down the panel.
   2. A running sync can be stopped. Every live row carries Pause / Resume and
      a confirmed Cancel; a read-out you cannot halt is a trap.

   Every number comes from the server sync registry in production; baked here
   across the four terminal states (syncing / queued / synced / failed). */

type Row = SyncSource & { paused?: boolean; cancelled?: boolean };

const DEMO: Row[] = [
  {
    id: "gh", name: "GitHub · acme/handbook", mark: <GithubMark size={20} />,
    state: "syncing", phase: "Embedding", done: 340, total: 512, chunkCount: 8912, embeddedCount: 5780,
  },
  {
    id: "slack", name: "Slack · #engineering", mark: <SourceMark provider="slack" size={20} />,
    state: "done", docCount: 210, chunkCount: 1980, embeddedCount: 1980, lastSyncAt: "2026-07-21T13:20:00",
  },
  {
    id: "notion", name: "Notion · Product wiki", mark: <SourceMark provider="notion" size={20} />,
    state: "queued",
  },
  {
    id: "conf", name: "Confluence · Ops", mark: <SourceMark provider="confluence" size={20} />,
    state: "error", error: "GET /rest/api/content returned 401, the token expired.",
  },
];

const STATE_LABEL: Record<string, { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "neutral" },
  syncing: { label: "Syncing", tone: "info" },
  done: { label: "Synced", tone: "ok" },
  error: { label: "Failed", tone: "blocked" },
};

function pct(s: Row): number {
  if (typeof s.progress === "number") return Math.max(0, Math.min(100, s.progress));
  if (s.total && s.total > 0) return Math.min(100, Math.round(((s.done ?? 0) / s.total) * 100));
  return 0;
}

function stateOf(s: Row): { label: string; tone: string } {
  if (s.cancelled) return { label: "Cancelled", tone: "neutral" };
  if (s.paused) return { label: "Paused", tone: "attention" };
  return STATE_LABEL[s.state] ?? STATE_LABEL.queued;
}

function counts(s: Row): string {
  const parts = [
    s.docCount != null && `${s.docCount.toLocaleString()} docs`,
    s.chunkCount != null && `${s.chunkCount.toLocaleString()} chunks`,
    s.embeddedCount != null && `${s.embeddedCount.toLocaleString()} embedded`,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : "Not counted yet";
}

export type WelcomeSyncPanelProps = {
  sources?: Row[];
  loading?: boolean;
  className?: string;
};

export function WelcomeSyncPanel({ sources = DEMO, loading = false, className = "" }: WelcomeSyncPanelProps) {
  const [items, setItems] = useState<Row[]>(sources);

  const { sort, onSort, sorted } = useSort(items, {
    source: (s) => s.name,
    progress: (s) => pct(s),
    counts: (s) => s.docCount ?? 0,
    updated: (s) => String(s.lastSyncAt ?? ""),
    status: (s) => stateOf(s).label,
  });

  const patch = (id: string, next: Partial<Row>) =>
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const retry = (id: string) => {
    patch(id, { state: "syncing", phase: "Fetching", done: 0, total: 200, error: undefined, paused: false, cancelled: false });
    window.setTimeout(() => {
      patch(id, {
        state: "done", phase: undefined,
        docCount: 200, chunkCount: 1200, embeddedCount: 1200, lastSyncAt: new Date().toISOString(),
      });
    }, 1500);
  };

  if (loading) {
    return (
      <div className={`grid gap-2 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-center justify-between">
          <SkeletonLine w={90} h={10} />
          <SkeletonLine w={130} h={10} />
        </div>
        <div className="divide-y divide-ink/[0.08] overflow-hidden rounded-md border border-ink/12 bg-paper">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <SkeletonCircle size={30} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonLine w="45%" h={11} />
                <Skeleton height={6} rounded="rounded-full" />
              </div>
              <SkeletonChip w={64} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <SectionLabel>Initial sync</SectionLabel>
        <SyncStatusLine sources={items} />
      </div>

      <div className="overflow-x-auto rounded-md border border-ink/12 bg-paper">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "28%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} />
            <col style={{ width: "12%" }} /><col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Source" sortKey="source" sort={sort} onSort={onSort} />
              <SortHeader label="Progress" sortKey="progress" sort={sort} onSort={onSort} align="center" />
              <SortHeader label="Counts" sortKey="counts" sort={sort} onSort={onSort} align="center" />
              <SortHeader label="Updated" sortKey="updated" sort={sort} onSort={onSort} align="center" />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="Nothing is syncing">Connect a source and its first sync shows up here.</EmptyState>
                </td>
              </tr>
            ) : sorted.map((s) => {
              const st = stateOf(s);
              const live = s.state === "syncing" || s.state === "queued";
              const stoppable = live && !s.cancelled;
              return (
                <tr key={s.id} className="border-t border-ink/10 align-top">
                  <td className={tdPad}>
                    <span className="flex items-start gap-2">
                      {s.mark && <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center">{s.mark}</span>}
                      <span className="min-w-0 break-all text-[13px] font-medium text-ink">{s.name}</span>
                    </span>
                    {s.state === "error" && (
                      <span className="mt-1 block break-all text-[12px] text-espelette">{s.error || "The server reported an error without details."}</span>
                    )}
                  </td>
                  <td className={`${tdPad} text-center`}>
                    {live ? (
                      <>
                        <Progress value={pct(s)} tone={s.paused ? "attention" : "info"} />
                        <span className="mt-1 block font-term text-[11px] text-ink/65">
                          {s.total ? `${(s.done ?? 0).toLocaleString()}/${s.total.toLocaleString()} items` : "Listing items"}
                        </span>
                      </>
                    ) : (
                      <span className="font-term text-[11px] text-ink/65">{s.state === "done" ? "Complete" : "Not started"}</span>
                    )}
                  </td>
                  <td className={`${tdPad} text-center font-term text-[11.5px] text-ink/70`}>{counts(s)}</td>
                  <td className={`${tdPad} text-center font-term text-[11.5px] text-ink/65`}>
                    {s.lastSyncAt ? fmtAgo(s.lastSyncAt) : "Never"}
                  </td>
                  <td className={tdPad}>
                    <Chip label={st.label} tone={st.tone} dot />
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {stoppable && (s.paused
                        ? <Button compact onClick={() => patch(s.id, { paused: false })}><Play size={12} /> Resume</Button>
                        : <Button compact onClick={() => patch(s.id, { paused: true })}><Pause size={12} /> Pause</Button>)}
                      {stoppable && (
                        <ConfirmButton compact confirmLabel="Cancel?" onConfirm={() => patch(s.id, { cancelled: true, paused: false, state: "queued" })}>
                          <X size={12} /> Cancel
                        </ConfirmButton>
                      )}
                      {(s.state === "error" || s.cancelled) && (
                        <Button compact onClick={() => retry(s.id)}><RefreshCw size={12} /> Retry sync</Button>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
