import { useState } from "react";
import { CheckCircle2, ArrowRight, GitBranch } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { SectionLabel } from "../forms/SectionLabel";
import { TagPicker } from "../forms/TagPicker";
import { Tabs } from "../navigation/Tabs";
import { CountChip } from "../data-display/Chip";
import { Pill } from "../data-display/Pill";
import { SourceMark } from "../icons/marks";
import { SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";

/* KnowledgeInspector — the sticky right-rail describing the selected search
   result: title/source, editable tags, a two-tab view (Document summary vs.
   raw Inspector metadata), verified facts, related results, a revision
   timeline, and an "open in lineage" mini-graph. Slack ("thread chunk")
   documents suppress tags. Standalone with baked demo document. */

type Fact = { text: string };
type Related = { source: string; title: string };
type Revision = { at: string; actor: string; verb: string };

type Doc = {
  id: string;
  title: string;
  source: string;
  kind: string;
  owner: string;
  updated: string;
  slack?: boolean;
  messageCount?: number;
  summary: string;
  tags: string[];
  facts: Fact[];
  related: Related[];
  timeline: Revision[];
};

const DEMO: Doc = {
  id: "doc_8f21",
  title: "Payments incident runbook",
  source: "notion",
  kind: "Page",
  owner: "Priya Nair",
  updated: "2026-07-16",
  summary: "The canonical procedure for payment-processing incidents: how to detect a stalled settlement queue, drain it safely, restart workers, and escalate to on-call when depth exceeds the alarm threshold.",
  tags: ["canonical", "customer-facing"],
  facts: [
    { text: "Settlement alarm fires when queue depth exceeds 10,000." },
    { text: "Workers must be drained before restart to avoid duplicate captures." },
    { text: "On-call escalation target is the #payments-oncall rotation." },
    { text: "Rollback window is the end of the business day of the change." },
  ],
  related: [
    { source: "github", title: "feat: retry settlement on transient errors" },
    { source: "slack", title: "Decision: move webhooks to the gateway" },
    { source: "docs", title: "Sign-in and session model" },
  ],
  timeline: [
    { at: "Jul 16, 4:12 PM", actor: "Priya Nair", verb: "verified the runbook" },
    { at: "Jul 11, 9:38 AM", actor: "Marcus Vale", verb: "added the rollback window" },
    { at: "Jun 28, 2:05 PM", actor: "Dana Osei", verb: "created the page" },
  ],
};

type InsTab = "document" | "inspector";

export type KnowledgeInspectorProps = {
  doc?: Doc;
  loading?: boolean;
  className?: string;
};

export function KnowledgeInspector({ doc = DEMO, loading = false, className = "" }: KnowledgeInspectorProps) {
  const [insTab, setInsTab] = useState<InsTab>("document");
  const [tags, setTags] = useState<string[]>(doc.tags);

  if (loading) {
    return (
      <Card variant="flush" className={`sticky top-4 ${className}`.trim()}>
        <div className="flex gap-4 border-b border-ink/10 px-4 pb-2.5 pt-3" aria-hidden="true">
          <SkeletonLine w={70} h={11} /><SkeletonLine w={64} h={11} />
        </div>
        <div className="space-y-4 p-4" aria-hidden="true">
          <div className="flex items-start gap-2.5"><SkeletonCircle size={20} /><SkeletonLine w="75%" h={15} /></div>
          <div className="flex gap-2"><SkeletonChip w={72} /><SkeletonChip w={54} /></div>
          <div className="space-y-2"><SkeletonLine w="40%" h={9} /><SkeletonText lines={3} /></div>
          <div className="space-y-2"><SkeletonLine w="40%" h={9} /><SkeletonText lines={4} /></div>
          <div className="space-y-2"><SkeletonLine w="40%" h={9} /><SkeletonText lines={3} /></div>
        </div>
      </Card>
    );
  }

  const metaRow = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-ink/10 last:border-0">
      <SectionLabel>{label}</SectionLabel>
      <span className="text-[13px] text-ink/85 text-right min-w-0 break-words">{value}</span>
    </div>
  );

  return (
    <Card variant="flush" className={`sticky top-4 ${className}`.trim()}>
      <div className="px-4 pt-3 border-b border-ink/10">
        <Tabs
          ariaLabel="Inspector view"
          variant="underline"
          value={insTab}
          onChange={setInsTab}
          options={[{ id: "document", label: "Document" }, { id: "inspector", label: "Inspector" }]}
        />
      </div>

      <div className="p-4">
        {/* Title */}
        <div className="flex items-start gap-2.5">
          <SourceMark provider={doc.source} size={20} />
          <h3 className="text-[15px] font-semibold text-ink leading-snug min-w-0 break-words">{doc.title}</h3>
        </div>

        {/* Tag row */}
        <div className="mt-3">
          {doc.slack ? (
            <div className="rounded-[4px] border border-ink/12 bg-ink/[0.02] px-3 py-2 font-term text-[11.5px] text-ink/60">
              Thread-sized search chunk · {doc.messageCount ?? 18} messages · no per-message tagging
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => <Pill key={t} kind={t} />)}
              <TagPicker compact tags={tags} onChange={setTags} onManage={() => undefined} />
            </div>
          )}
        </div>

        {insTab === "inspector" ? (
          <div className="mt-4">
            {metaRow("ID", <code className="font-term text-[12px]">{doc.id}</code>)}
            {metaRow("Kind", doc.kind)}
            {metaRow("Source", doc.source)}
            {metaRow("Owner", doc.owner)}
            {metaRow("Updated", doc.updated)}
            {metaRow("Tags", tags.length ? tags.join(", ") : "—")}
            {metaRow("Watched", "Yes")}
            <Button block className="mt-4">Open document <ArrowRight size={14} /></Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {/* strip */}
            <div className="grid grid-cols-3 gap-2 rounded-[5px] border border-ink/12 p-3">
              <div><SectionLabel>Owner</SectionLabel><div className="text-[12.5px] text-ink/85 mt-0.5">{doc.owner}</div></div>
              <div><SectionLabel>Last updated</SectionLabel><div className="text-[12.5px] text-ink/85 mt-0.5">{doc.updated}</div></div>
              <div><SectionLabel>Source</SectionLabel><div className="text-[12.5px] text-ink/85 mt-0.5 capitalize">{doc.source}</div></div>
            </div>

            {/* Summary */}
            <div>
              <h4 className="font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/60 mb-1.5">Summary</h4>
              <p className="text-[13px] text-ink/80">{doc.summary}</p>
            </div>

            {/* Verified facts */}
            <div>
              <h4 className="flex items-center gap-1.5 font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/60 mb-2">Verified facts <CountChip count={doc.facts.length} tone="info" /></h4>
              <ul className="flex flex-col gap-1.5">
                {doc.facts.slice(0, 6).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink/80">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-moss" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Related */}
            <div>
              <h4 className="flex items-center gap-1.5 font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/60 mb-2">Related <CountChip count={doc.related.length} /></h4>
              <ul className="flex flex-col gap-1.5">
                {doc.related.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-ink/80">
                    <SourceMark provider={r.source} size={15} />
                    <span className="min-w-0 truncate hover:text-biscay-2 cursor-pointer">{r.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2-col: timeline + lineage */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/60 mb-2">Revision timeline</h4>
                <ul className="flex flex-col gap-2">
                  {doc.timeline.map((r, i) => (
                    <li key={i} className="text-[12px] text-ink/75">
                      <b className="font-term text-[11px] text-ink/55 block">{r.at}</b>
                      {r.verb} — {r.actor}
                    </li>
                  ))}
                </ul>
                <Button variant="link" className="mt-2">View full history <ArrowRight size={12} /></Button>
              </div>
              <div>
                <h4 className="font-term text-[11px] font-medium uppercase tracking-[0.08em] text-ink/60 mb-2">Open in lineage</h4>
                <div className="rounded-[5px] border border-ink/12 bg-flysch/60 p-3 grid place-items-center h-[92px]">
                  <svg width="150" height="64" aria-hidden>
                    <line x1="24" y1="32" x2="74" y2="18" stroke="#10263B40" strokeWidth="1.4" />
                    <line x1="24" y1="32" x2="74" y2="48" stroke="#10263B40" strokeWidth="1.4" />
                    <line x1="90" y1="18" x2="130" y2="32" stroke="#10263B40" strokeWidth="1.4" />
                    <line x1="90" y1="48" x2="130" y2="32" stroke="#10263B40" strokeWidth="1.4" />
                    <foreignObject x="8" y="20" width="24" height="24"><SourceMark provider={doc.source} size={20} /></foreignObject>
                    <circle cx="82" cy="18" r="5" fill="#1E6FA8" />
                    <circle cx="82" cy="48" r="5" fill="#2C6E49" />
                    <circle cx="130" cy="32" r="6" fill="#1C3F60" />
                  </svg>
                </div>
                <Button variant="link" className="mt-2"><GitBranch size={12} /> Open in lineage <ArrowRight size={12} /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default KnowledgeInspector;
