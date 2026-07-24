import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Card } from "../layout/Card";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { Spinner } from "../data-display/Spinner";
import { Button } from "../actions/Button";
import { CardBody, CardTitleBlock } from "../layout/CardShell";
import type { DigestTopic } from "../data-display/DigestCard";
import { SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";
import { Scrollable } from "../data-display/Scrollable";

/* Overview — This week's digest ──────────────────────────────────────────
   Mari's weekly, AI-generated summary of what changed across the workspace's
   knowledge. Self-contained: owns demo topics and a manual "Refresh digest"
   that simulates the server-side regenerate + refetch.

   Renders its own topic rows rather than the catalog <DigestCard> so the
   per-topic block can follow CONVENTIONS.md §1 ordering: title → summary →
   source chips → impact. The source row carries an explicit "Source" /
   "Sources" label (pluralized off the count), which the catalog card has no
   slot for. Source: web/src/pages/overview/DigestCard.tsx. */

const mark = (provider: string) => <SourceMark provider={provider} size={13} />;

const DEMO_TOPICS: DigestTopic[] = [
  {
    title: "Billing docs realigned to the new plan tiers",
    where: [
      { source: "notion", label: "Pricing FAQ", icon: mark("notion") },
      { source: "gdocs", label: "Billing runbook", icon: mark("gdocs") },
    ],
    summary:
      "Three pages drifted after the Growth-tier rename. Mari rewrote the overlap and flagged one contradiction between the FAQ and the runbook's proration rule.",
    impact: [
      { name: "Support", tone: "info" },
      { name: "Sales", tone: "ok" },
    ],
  },
  {
    title: "Onboarding flow gained a self-serve SSO path",
    where: [
      { source: "github", label: "auth/README", icon: mark("github") },
      { source: "slack", label: "#eng-identity", icon: mark("slack") },
    ],
    summary:
      "The SAML setup guide was expanded with an Okta walkthrough. Two stale screenshots were retired and the admin-only caveat now leads the section.",
    impact: [
      { name: "Onboarding", tone: "ok" },
      { name: "Security", tone: "attention" },
    ],
  },
  {
    title: "Incident retro synthesized into a runbook update",
    where: [{ source: "granola", label: "Postmortem sync", icon: mark("granola") }],
    summary:
      "The Jul 14, 2026 latency incident's action items landed as a new escalation ladder. Mari cross-linked it from the on-call guide.",
    impact: [
      { name: "SRE", tone: "blocked" },
      { name: "On-call", tone: "attention" },
    ],
  },
];

/** Topics rendered before "Show all", and chips per row before "+N more". */
const TOPIC_PAGE = 5;
const CHIP_CAP = 5;

/** The shared mono meta label used by both the Sources and Impact rows. */
const metaLabel = "font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink/65";

function TopicBlock({ topic, dim }: { topic: DigestTopic; dim: boolean }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0" style={{ opacity: dim ? 0.55 : 1 }}>
      <CardBody className="gap-2">
        {/* §1: title, then summary, then the source badges, then impact. */}
        <CardTitleBlock title={topic.title} summary={topic.summary} />
        {/* Chip rows are capped: a topic that touched 40 sources used to render
            40 chips and turn one topic into six rows of confetti (§14). */}
        {topic.where.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={metaLabel}>{topic.where.length === 1 ? "Source" : "Sources"}</span>
            {topic.where.slice(0, CHIP_CAP).map((w) => <Chip key={w.label} label={w.label} icon={w.icon} />)}
            {topic.where.length > CHIP_CAP && (
              <span className="font-term text-[11px] text-ink/65">+{topic.where.length - CHIP_CAP} more</span>
            )}
          </div>
        )}
        {topic.impact.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={metaLabel}>Impact</span>
            {topic.impact.slice(0, CHIP_CAP).map((i) => <Chip key={i.name} label={i.name} tone={i.tone ?? "neutral"} dot />)}
            {topic.impact.length > CHIP_CAP && (
              <span className="font-term text-[11px] text-ink/65">+{topic.impact.length - CHIP_CAP} more</span>
            )}
          </div>
        )}
      </CardBody>
    </div>
  );
}

export type OverviewDigestCardProps = {
  topics?: DigestTopic[];
  loading?: boolean;
  error?: boolean;
  /** Wires the error banner's Retry control. Omitted = no button. */
  onRetry?: () => void;
  className?: string;
};

export function OverviewDigestCard({
  topics = DEMO_TOPICS, loading = false, error = false, onRetry, className = "",
}: OverviewDigestCardProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [current, setCurrent] = useState<DigestTopic[]>(topics);
  const [showAll, setShowAll] = useState(false);
  const topics_ = showAll ? current : current.slice(0, TOPIC_PAGE);

  if (loading) {
    return (
      <div className={`rounded-md border border-ink/12 bg-paper p-4 ${className}`.trim()} aria-hidden="true">
        <div className="mb-4 flex items-center gap-2.5">
          <SkeletonCircle size={26} />
          <SkeletonLine w="38%" h={13} />
          <span className="ml-auto"><SkeletonChip w={104} /></span>
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 border-t border-ink/[0.08] pt-3 first:border-0 first:pt-0">
              <SkeletonLine w={i === 1 ? "72%" : "58%"} h={12} />
              <SkeletonText lines={2} lastWidth="80%" />
              <div className="flex gap-2 pt-0.5"><SkeletonChip w={56} /><SkeletonChip w={44} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const refresh = () => {
    if (regenerating) return; // guard re-entry
    setRegenerating(true);
    // Simulate the regenerateDigest mutation + refetch (stale-while-revalidate).
    setTimeout(() => {
      setCurrent((prev) => [...prev].reverse());
      setRegenerating(false);
    }, 1400);
  };

  return (
    <Card
      className={className}
      title="This week's digest"
      actions={
        <Button compact onClick={refresh} disabled={regenerating}>
          <Shuffle size={14} /> {regenerating ? "Refreshing…" : "Refresh digest"}
        </Button>
      }
    >
      {regenerating && (
        <div className="mb-3 flex items-center gap-2 font-display italic text-[13px] text-moss">
          <Spinner size="sm" /> Mari is re-reading the week…
        </div>
      )}
      {error ? (
        /* §8: failure copy comes from the catalog, never a bespoke string. */
        <ErrorMessage id="server.unavailable" onAction={onRetry} />
      ) : current.length === 0 ? (
        <EmptyState>No digest yet. Refresh to have Mari read the week.</EmptyState>
      ) : (
        <>
          {/* Topic count above the topics it describes (§13). A busy week can
              produce dozens; the card shows a page and scrolls the rest. */}
          {current.length > TOPIC_PAGE && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-term text-[11.5px] text-ink/65">
                {showAll
                  ? `Showing all ${current.length.toLocaleString()} topics`
                  : `Showing ${TOPIC_PAGE} of ${current.length.toLocaleString()} topics`}
              </span>
              <Button variant="link" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer" : "Show all"}
              </Button>
            </div>
          )}
          <Scrollable axis="y" style={{ maxHeight: topics_.length > TOPIC_PAGE ? 560 : undefined }} scrollerClassName="pr-1">
            <div className="flex flex-col divide-y divide-ink/10">
              {topics_.map((t, i) => <TopicBlock key={`${t.title}-${i}`} topic={t} dim={regenerating} />)}
            </div>
          </Scrollable>
        </>
      )}
    </Card>
  );
}
