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
   Pure presenter: sources arrive as a required prop; busy/running/paused is
   local state, and nothing hits the network. */

/* Exported: an adapter mapping an API response onto `Source` needs to name
   these, and reaching them through `Source["tier"]` is a workaround for them
   being private, not a preference. */
export type Tier = "live" | "legacy" | "actionless";
export type SyncState = "healthy" | "running" | "failed" | "paused";

const PHASE_LABEL: Record<string, string> = {
  listing: "Listing", fetching: "Fetching", chunking: "Chunking",
  embedding: "Embedding", indexing: "Indexing",
};

export type Source = {
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
  sources: Source[];
  loading?: boolean;
  className?: string;
};

export function SourcesConnectorCard({ sources, loading = false, className = "" }: SourcesConnectorCardProps) {
  const [items, setItems] = useState<Source[]>(sources);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className={`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 ${className}`.trim()} aria-hidden="true">
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

  /* Auto-fill, not a fixed column count (CONVENTIONS.md §11). `lg:grid-cols-3`
     held three columns no matter how narrow the page column got, which
     squeezed each card to 124px and pushed its name and health chip out
     through the border. Auto-fill drops to two columns, then one, and never
     renders a card under 260px. */
  return (
    <div className={`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 ${className}`.trim()}>
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
