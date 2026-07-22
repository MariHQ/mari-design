import { useState, type ReactNode } from "react";
import { Clock, Plug } from "lucide-react";
import { EmptyState } from "../data-display/EmptyState";
import { ConnectorCard as ConnectorCardUI, type ConnectorHealth } from "../data-display/ConnectorCard";
import { Spinner } from "../data-display/Spinner";
import { SkeletonLine, SkeletonCircle, SkeletonChip, SkeletonButton } from "../data-display/Skeleton";
import { Button } from "../actions/Button";
import { SourceMark } from "../icons/marks";
import { Truncate } from "../data-display/Truncate";
import { fmtDateTime } from "../tokens/format";

/* SourcesConnectorCard — the Sources page "Connectors" grid: one pulse card per
   connected source. Composes the catalog <ConnectorCard> and reproduces the
   three-tier honesty model from pages/sources/ConnectorCard.tsx:

     • live      — real-time phase/counts (github + connector-framework sources)
     • legacy    — renders only what the server seeded; no fabricated last-sync
     • actionless — a live-kind source with no id yet → "sync status unavailable"

   Every sync line is rendered from the source's own state, never invented.
   Standalone: baked demo sources, local busy/running/paused state, no network. */

type Tier = "live" | "legacy" | "actionless";
type SyncState = "healthy" | "running" | "failed" | "paused";

const PHASE_LABEL: Record<string, string> = {
  listing: "Listing", fetching: "Fetching", chunking: "Chunking",
  embedding: "Embedding", indexing: "Indexing",
};

type Source = {
  id: string;
  provider: string;
  name: string;
  tier: Tier;
  state: SyncState;
  /** Live phase while running. */
  phase?: keyof typeof PHASE_LABEL;
  done?: number;
  total?: number;
  docCount?: number;
  chunkCount?: number;
  embeddedCount?: number;
  /** Legacy "N documents" count when live counts aren't available. */
  docsCount?: number;
  lastSyncAt?: string | null;
  lastError?: string;
  bars?: number[];
};

const DEMO: Source[] = [
  {
    id: "gh", provider: "github", name: "acme/handbook", tier: "live", state: "running",
    phase: "embedding", done: 340, total: 512,
    docCount: 1284, chunkCount: 8912, embeddedCount: 8340,
    lastSyncAt: "2026-07-21T14:12:00", bars: [3, 5, 4, 8, 6, 9, 7, 11],
  },
  {
    id: "slack", provider: "slack", name: "Slack · #engineering", tier: "live", state: "healthy",
    docCount: 4210, chunkCount: 15330, embeddedCount: 15330,
    lastSyncAt: "2026-07-21T09:41:00", bars: [6, 4, 7, 5, 8, 6, 9, 7],
  },
  {
    id: "notion", provider: "notion", name: "Notion · Product wiki", tier: "legacy", state: "healthy",
    docsCount: 620, lastSyncAt: null,
  },
  {
    id: "gdrive", provider: "gdrive", name: "Google Drive · Design", tier: "actionless", state: "healthy",
    docsCount: 88, lastSyncAt: null,
  },
  {
    id: "web", provider: "website", name: "docs.acme.com", tier: "legacy", state: "paused",
    docsCount: 143, lastSyncAt: "2026-07-19T18:02:00", bars: [4, 3, 5, 2, 4, 3, 4, 3],
  },
  {
    id: "conf", provider: "confluence", name: "Confluence · Ops", tier: "live", state: "failed",
    docCount: 512, chunkCount: 3100, embeddedCount: 2870,
    lastSyncAt: "2026-07-20T22:15:00",
    lastError: "GET /rest/api/content returned 401, the token expired.",
  },
];

const HEALTH: Record<SyncState, ConnectorHealth> = {
  healthy: "Healthy", running: "Syncing", failed: "Error", paused: "Paused",
};

function counts(s: Source): ReactNode {
  if (s.docCount != null) {
    return `${s.docCount.toLocaleString()} documents · ${(s.chunkCount ?? 0).toLocaleString()} chunks · ${(s.embeddedCount ?? 0).toLocaleString()} embedded`;
  }
  if (s.docsCount != null) return `${s.docsCount.toLocaleString()} documents`;
  return null;
}

export type SourcesConnectorCardProps = {
  /** Override the baked-in demo sources. */
  sources?: Source[];
  loading?: boolean;
  className?: string;
};

export function SourcesConnectorCard({ sources = DEMO, loading = false, className = "" }: SourcesConnectorCardProps) {
  const [items, setItems] = useState<Source[]>(sources);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-md border border-ink/12 bg-paper p-4">
            <div className="flex items-center gap-2.5">
              <SkeletonCircle size={26} />
              <SkeletonLine w="45%" h={12} />
              <span className="ml-auto"><SkeletonChip w={56} /></span>
            </div>
            <SkeletonLine w="82%" h={9} />
            <SkeletonLine w="55%" h={9} />
            <div className="flex gap-2 pt-1"><SkeletonButton w={76} /><SkeletonButton w={76} /></div>
          </div>
        ))}
      </div>
    );
  }

  const patch = (id: string, next: Partial<Source>) =>
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, ...next } : s)));

  const kick = (id: string, after: Partial<Source>) => {
    setBusy((b) => ({ ...b, [id]: true }));
    patch(id, { state: "running", phase: "fetching", done: 0, total: 200 });
    window.setTimeout(() => {
      setBusy((b) => ({ ...b, [id]: false }));
      patch(id, { state: "healthy", phase: undefined, lastSyncAt: new Date().toISOString(), ...after });
    }, 1400);
  };

  const syncLine = (s: Source, isBusy: boolean): ReactNode => {
    if (s.state === "paused") {
      return (
        <Button
          variant="link"
          className="text-[12.5px]"
          disabled={isBusy}
          onClick={() => kick(s.id, {})}
        >
          Paused. Resume syncing
        </Button>
      );
    }
    if (isBusy && s.state !== "running") return <><Spinner size="sm" /> Working…</>;
    if (s.tier === "actionless") {
      return s.lastSyncAt
        ? <>Last sync: {fmtDateTime(s.lastSyncAt)}</>
        : <span className="text-ink/65">Sync status unavailable</span>;
    }
    if (s.state === "running") {
      const tail = s.total && s.total > 0 ? ` · ${s.done ?? 0}/${s.total} items` : "…";
      return <><Spinner size="sm" /> {PHASE_LABEL[s.phase ?? "listing"]}{tail}</>;
    }
    if (s.state === "failed") {
      return (
        <Truncate lines={2} className="text-espelette" title={`Sync failed. ${s.lastError ?? "No details were reported."}`}>
          Sync failed. {s.lastError ?? "No details were reported."}
        </Truncate>
      );
    }
    if (s.tier === "legacy" && !s.lastSyncAt) return null; // never fabricate a last-sync
    return s.lastSyncAt ? <>Last sync: {fmtDateTime(s.lastSyncAt)}</> : <>Never synced</>;
  };

  if (items.length === 0) {
    return (
      <div className={`rounded-md border border-ink/12 bg-paper ${className}`.trim()}>
        <EmptyState icon={<Plug size={24} />} title="No sources connected">
          Add a source to start syncing documents into your knowledge library.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`.trim()}>
      {items.map((s) => {
        const isBusy = Boolean(busy[s.id]);
        const running = s.state === "running";
        const paused = s.state === "paused";
        const isConnectorKind = s.tier === "live" || s.tier === "actionless";
        return (
          <ConnectorCardUI
            key={s.id}
            name={s.name}
            mark={<SourceMark provider={s.provider} size={26} />}
            health={HEALTH[s.state]}
            counts={counts(s)}
            sync={syncLine(s, isBusy)}
            bars={s.bars}
            busy={isBusy}
            running={running}
            paused={paused}
            /* Every card carries the SAME action menu. Google Drive used to
               render no kebab at all because its tier has no sync id, which
               made one square in the grid look broken. It now offers the same
               menu; the actions it cannot honour are simply disabled. */
            canResync={isConnectorKind}
            onSyncNow={() => kick(s.id, {})}
            onFullResync={isConnectorKind ? () => kick(s.id, {}) : undefined}
            onPause={!paused ? () => patch(s.id, { state: "paused" }) : undefined}
            onResume={paused ? () => kick(s.id, {}) : undefined}
          />
        );
      })}
      {/* keep the Clock import referenced for the paused-tier legend below */}
      <p className="col-span-full mt-1 flex items-center gap-1.5 font-term text-[11px] text-ink/65">
        <Clock size={12} /> Live sources poll while a sync runs; legacy sources show only what the server reports.
      </p>
    </div>
  );
}
