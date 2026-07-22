import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Workflow, Send, ShieldCheck, Clipboard, RefreshCw, GitFork, Pencil } from "lucide-react";
import { Card } from "../layout/Card";
import { ActivityFeed, type ActivityItem } from "../data-display/ActivityFeed";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { fmtDateTime } from "../tokens/format";

/* Overview — Live activity feed ───────────────────────────────────────────
   A live, auto-refreshing feed of workspace work — runs, edits, deploys,
   facts, syncs, links, tasks. Slack chatter filtered out, capped at 8 rows,
   polled every 10s (simulated here by re-stamping times). Maps each item onto
   the catalog <ActivityFeed>; local <PulseDot> header indicator.
   Source: web/src/pages/Overview.tsx (feedQ, polling effect, .card.live). */

const FEED_ICONS: Record<string, ReactNode> = {
  run: <Workflow size={13} />,
  deploy: <Send size={13} />,
  fact: <ShieldCheck size={13} />,
  task: <Clipboard size={13} />,
  sync: <RefreshCw size={13} />,
  link: <GitFork size={13} />,
  edit: <Pencil size={13} />,
};

export type FeedItem = {
  id: number;
  kind: string;
  actor: string;
  text: string;
  target: string;
  /** Seconds ago, restamped to a real timestamp on render. */
  secondsAgo: number;
};

const DEMO_FEED: FeedItem[] = [
  { id: 1, kind: "run", actor: "Docs guardrail", text: "completed a run over", target: "billing/*.md", secondsAgo: 42 },
  { id: 2, kind: "edit", actor: "Dana R.", text: "refined", target: "Pricing FAQ", secondsAgo: 190 },
  { id: 3, kind: "fact", actor: "Mari", text: "verified a fact in", target: "Proration rule", secondsAgo: 380 },
  { id: 4, kind: "deploy", actor: "Stale sweeper", text: "deployed", target: "help.mari.guru", secondsAgo: 900 },
  { id: 5, kind: "sync", actor: "Notion", text: "synced", target: "Onboarding space", secondsAgo: 1500 },
  { id: 6, kind: "link", actor: "Mari", text: "derived links between", target: "on-call guide", secondsAgo: 2400 },
  { id: 7, kind: "task", actor: "Priya K.", text: "closed a task on", target: "auth/README", secondsAgo: 3600 },
  { id: 8, kind: "edit", actor: "Sam L.", text: "edited", target: "Escalation ladder", secondsAgo: 5400 },
];

const isNoise = (e: FeedItem) => /slack/i.test(`${e.kind} ${e.text}`);

/* ── PulseDot — the animated "live" status indicator ── */
function PulseDot({ tone = "ok", pulsing = true }: { tone?: "ok" | "info"; pulsing?: boolean }) {
  const bg = tone === "info" ? "bg-biscay-2" : "bg-moss";
  return (
    <span className="relative inline-flex w-2 h-2" aria-hidden>
      {pulsing && <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${bg}`} />}
      <span className={`relative inline-flex w-2 h-2 rounded-full ${bg}`} />
    </span>
  );
}

export type OverviewLiveActivityProps = {
  items?: FeedItem[];
  loading?: boolean;
  offline?: boolean;
  /** Poll interval in ms (re-stamps times to feel live). 0 disables. */
  pollMs?: number;
  className?: string;
};

export function OverviewLiveActivity({
  items = DEMO_FEED, loading = false, offline = false, pollMs = 10_000, className = "",
}: OverviewLiveActivityProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => setNow(Date.now()), pollMs);
    return () => clearInterval(t);
  }, [pollMs]);

  const rows = items.filter((e) => !isNoise(e)).slice(0, 8);
  const activityItems: ActivityItem[] = rows.map((e) => ({
    id: String(e.id),
    actor: e.actor,
    action: `${e.text} ${e.target}`,
    time: fmtDateTime(now - e.secondsAgo * 1000, new Date(now)),
    icon: FEED_ICONS[e.kind] ?? <Pencil size={13} />,
  }));

  return (
    <Card
      className={className}
      icon={<span className="grid place-items-center w-[31px] h-[31px]"><PulseDot /></span>}
      title="Live"
      hint="Runs & edits · refreshes every 10s"
    >
      {loading ? (
        <div className="grid place-items-center min-h-[60px]"><Spinner size="sm" /></div>
      ) : offline ? (
        <EmptyState>API offline — activity unavailable.</EmptyState>
      ) : rows.length === 0 ? (
        <p className="py-4 text-[13px] text-ink/55">Quiet for now — nothing running.</p>
      ) : (
        <ActivityFeed items={activityItems} />
      )}
    </Card>
  );
}
