import { useState } from "react";
import { SectionLabel } from "../forms/SectionLabel";
import { SyncPanel, SyncStatusLine, type SyncSource } from "../feedback/SyncPanel";
import { SourceMark, GithubMark } from "../icons/marks";

/* WelcomeSyncPanel — the Welcome wizard's live sync read-out for just-connected
   sources. Composes the catalog <SyncPanel> (full phase/progress/counts panel)
   and <SyncStatusLine> (the compact Finish-summary one-liner). Every number is
   from the server sync registry in production; baked here across the four
   terminal states (syncing / queued / synced / failed). Standalone, with a
   working Retry on the failed row. */

const DEMO: SyncSource[] = [
  {
    id: "gh", name: "GitHub · acme/handbook", mark: <GithubMark size={24} />,
    state: "syncing", phase: "Embedding", done: 340, total: 512, chunkCount: 8912, embeddedCount: 5780,
  },
  {
    id: "slack", name: "Slack · #engineering", mark: <SourceMark provider="slack" size={24} />,
    state: "done", docCount: 210, chunkCount: 1980, embeddedCount: 1980, lastSyncAt: "2026-07-21T13:20:00",
  },
  {
    id: "notion", name: "Notion · Product wiki", mark: <SourceMark provider="notion" size={24} />,
    state: "queued",
  },
  {
    id: "conf", name: "Confluence · Ops", mark: <SourceMark provider="confluence" size={24} />,
    state: "error", error: "GET /rest/api/content returned 401 — token expired.",
  },
];

export type WelcomeSyncPanelProps = {
  sources?: SyncSource[];
  className?: string;
};

export function WelcomeSyncPanel({ sources = DEMO, className = "" }: WelcomeSyncPanelProps) {
  const [items, setItems] = useState<SyncSource[]>(sources);

  const retry = (id: string) => {
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, state: "syncing", phase: "Fetching", done: 0, total: 200, error: undefined } : s)));
    window.setTimeout(() => {
      setItems((xs) => xs.map((s) => (s.id === id ? {
        ...s, state: "done", phase: undefined,
        docCount: 200, chunkCount: 1200, embeddedCount: 1200, lastSyncAt: new Date().toISOString(),
      } : s)));
    }, 1500);
  };

  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <SectionLabel>Initial sync</SectionLabel>
        <SyncStatusLine sources={items} />
      </div>
      <SyncPanel sources={items} onRetry={retry} />
    </div>
  );
}
