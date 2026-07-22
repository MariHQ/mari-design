import { useState } from "react";
import { DigestCard as DigestCardUI, type DigestTopic } from "../data-display/DigestCard";
import { SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";

/* Overview — This week's digest ──────────────────────────────────────────
   Mari's weekly, AI-generated summary of what changed across the workspace's
   knowledge. Self-contained: owns demo topics and a manual "Refresh digest"
   that simulates the server-side regenerate + refetch. Composes the catalog
   <DigestCard>. Source: web/src/pages/overview/DigestCard.tsx. */

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
      "The Jul 14 latency incident's action items landed as a new escalation ladder. Mari cross-linked it from the on-call guide.",
    impact: [
      { name: "SRE", tone: "blocked" },
      { name: "On-call", tone: "attention" },
    ],
  },
];

export type OverviewDigestCardProps = {
  topics?: DigestTopic[];
  loading?: boolean;
  error?: boolean;
  className?: string;
};

export function OverviewDigestCard({
  topics = DEMO_TOPICS, loading = false, error = false, className = "",
}: OverviewDigestCardProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [current, setCurrent] = useState<DigestTopic[]>(topics);

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
    <DigestCardUI
      className={className}
      topics={current}
      loading={loading}
      error={error}
      regenerating={regenerating}
      onRefresh={refresh}
    />
  );
}
