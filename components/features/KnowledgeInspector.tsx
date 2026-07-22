import { useState } from "react";
import { CheckCircle2, ArrowRight, GitBranch } from "lucide-react";
import { Card } from "../layout/Card";
import { CardSection } from "../layout/CardShell";
import { Button } from "../actions/Button";
import { SectionLabel } from "../forms/SectionLabel";
import { TagPicker } from "../forms/TagPicker";
import { Tabs } from "../navigation/Tabs";
import { Chip, CountChip } from "../data-display/Chip";
import { Pill } from "../data-display/Pill";
import { SourceMark } from "../icons/marks";
import { fmtDate } from "../tokens/format";
import { ConnectionRow, type RelKey } from "./LineageDataModel";
import { SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";

/* KnowledgeInspector — the sticky right-rail describing the selected search
   result: title/source, editable tags, a two-tab view (Document summary vs.
   raw Inspector metadata), verified facts, related results, a revision
   timeline, and an "open in lineage" mini-graph. Slack ("thread chunk")
   documents suppress tags. Standalone with baked demo document. */

type Fact = { text: string };
type Related = { source: string; title: string };
type Revision = { at: string; actor: string; verb: string };
/** One lineage edge off this document, drawn with the shared lineage styling. */
type Link = { rel: RelKey; dir: "out" | "in"; title: string; source: string };

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
  /** Lineage edges off this doc. Optional: callers that predate the preview
      fall back to a derived list built from `related`. */
  lineage?: Link[];
};

const REL_CYCLE: RelKey[] = ["derived", "references", "discussed"];

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
    { at: "Jul 16, 2026, 4:12 PM", actor: "Priya Nair", verb: "verified the runbook" },
    { at: "Jul 11, 2026, 9:38 AM", actor: "Marcus Vale", verb: "added the rollback window" },
    { at: "Jun 28, 2026, 2:05 PM", actor: "Dana Osei", verb: "created the page" },
    { at: "Jun 20, 2026, 11:02 AM", actor: "Priya Nair", verb: "linked the settlement dashboard" },
    { at: "Jun 14, 2026, 3:47 PM", actor: "Marcus Vale", verb: "split the escalation section" },
    { at: "Jun 02, 2026, 8:15 AM", actor: "Dana Osei", verb: "imported the page from Notion" },
  ],
  lineage: [
    { rel: "derived", dir: "in", title: "Settlement queue postmortem", source: "docs" },
    { rel: "references", dir: "out", title: "feat: retry settlement on transient errors", source: "github" },
    { rel: "discussed", dir: "out", title: "#payments-oncall escalation thread", source: "slack" },
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
  // Both rail links used to be inert. They now drive real state: the history
  // link expands the full revision list, the lineage link opens the connection
  // preview inline (CONVENTIONS.md §2).
  const [fullHistory, setFullHistory] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const lineage: Link[] = doc.lineage ?? doc.related.map((r, i) => ({
    rel: REL_CYCLE[i % REL_CYCLE.length],
    dir: i === 0 ? "in" : "out",
    title: r.title,
    source: r.source,
  }));

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
        {/* Title (order slot 4) */}
        <div className="flex items-start gap-2.5">
          <SourceMark provider={doc.source} size={20} />
          <h3 className="text-[15px] font-semibold text-ink leading-snug min-w-0 break-words">{doc.title}</h3>
        </div>

        {insTab === "inspector" ? (
          <div className="mt-4">
            {metaRow("ID", <code className="font-term text-[12px]">{doc.id}</code>)}
            {metaRow("Kind", doc.kind)}
            {metaRow("Source", doc.source)}
            {metaRow("Owner", doc.owner)}
            {metaRow("Updated", fmtDate(doc.updated))}
            {metaRow("Tags", tags.length ? tags.join(", ") : "")}
            {metaRow("Watched", "Yes")}
            <Button block className="mt-4">Open document <ArrowRight size={14} /></Button>
          </div>
        ) : (
          /* Rail order is fixed by the client note and CONVENTIONS.md §1:
             summary → verified facts → related docs → source badge → status
             badge (tags) → owner → last updated → revision timeline. */
          <div className="mt-4 flex flex-col gap-5">
            {/* Summary (order slot 5) */}
            <p className="text-[13px] leading-relaxed text-ink/80">{doc.summary}</p>

            <CardSection label="Verified facts" count={doc.facts.length}>
              <ul className="flex flex-col gap-1.5">
                {doc.facts.slice(0, 6).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink/80">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-moss" />
                    <span className="min-w-0 break-words">{f.text}</span>
                  </li>
                ))}
                {doc.facts.length === 0 && (
                  <li className="text-[12.5px] text-ink/70">No verified facts extracted from this document yet.</li>
                )}
              </ul>
            </CardSection>

            <CardSection label="Related docs" count={doc.related.length}>
              <ul className="flex flex-col gap-1.5">
                {doc.related.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px] text-ink/80">
                    <SourceMark provider={r.source} size={15} />
                    <span className="min-w-0 truncate hover:text-biscay-2 cursor-pointer">{r.title}</span>
                  </li>
                ))}
                {doc.related.length === 0 && (
                  <li className="text-[12.5px] text-ink/70">Nothing links to this document yet.</li>
                )}
              </ul>
            </CardSection>

            {/* Source badge (slot 6) + status badge / tags (slot 7) */}
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                label={doc.source}
                tone="neutral"
                icon={<SourceMark provider={doc.source} size={13} />}
              />
              {doc.slack ? (
                <Chip label="Decision excerpt" tone="info" />
              ) : (
                <>
                  {tags.map((t) => <Pill key={t} kind={t} />)}
                  <TagPicker compact tags={tags} onChange={setTags} onManage={() => undefined} />
                </>
              )}
            </div>
            {doc.slack && (
              <p className="-mt-3 text-[12px] text-ink/70">
                A decision excerpt is the passage of a thread where the call was made,
                {" "}{doc.messageCount ?? 18} messages long. Tags apply to the excerpt, not to single messages.
              </p>
            )}

            {/* Owner + last updated (slots 8 to 10) */}
            <div className="grid grid-cols-2 gap-2 rounded-[5px] border border-ink/12 p-3">
              <div><SectionLabel>Owner</SectionLabel><div className="text-[12.5px] text-ink/85 mt-0.5">{doc.owner}</div></div>
              <div><SectionLabel>Last updated</SectionLabel><div className="text-[12.5px] text-ink/85 mt-0.5">{fmtDate(doc.updated)}</div></div>
            </div>

            {/* Revision timeline, last */}
            <CardSection label="Revision timeline" count={doc.timeline.length}>
              <ul className="flex flex-col gap-2">
                {(fullHistory ? doc.timeline : doc.timeline.slice(0, 3)).map((r, i) => (
                  <li key={i} className="break-words text-[12px] text-ink/75">
                    <b className="font-term text-[11px] text-ink/65 block">{r.at}</b>
                    {r.verb}, {r.actor}
                  </li>
                ))}
                {doc.timeline.length === 0 && (
                  <li className="text-[12.5px] text-ink/70">No revisions recorded for this document.</li>
                )}
              </ul>

              {lineageOpen && (
                <div className="mt-3 rounded-[5px] border border-ink/12 bg-flysch/50 p-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h5 className="font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink/65">Lineage connections</h5>
                    <CountChip count={lineage.length} tone="info" />
                  </div>
                  {/* Same ConnectionRow / EdgeSwatch the lineage drawers use, so
                      the preview reads as one component family. */}
                  {lineage.map((l) => (
                    <ConnectionRow
                      key={l.title}
                      rel={l.rel}
                      dir={l.dir}
                      title={l.title}
                      subline={focused === l.title ? "Focused on the canvas" : l.source}
                      onSelect={() => setFocused((f) => (f === l.title ? null : l.title))}
                      onFocus={() => setFocused(l.title)}
                    />
                  ))}
                </div>
              )}

              {/* Both actions on the same line, bottom left (CONVENTIONS.md §2). */}
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Button variant="link" onClick={() => setFullHistory((v) => !v)}>
                  {fullHistory ? "Show recent revisions" : `View full history (${doc.timeline.length})`} <ArrowRight size={12} />
                </Button>
                <Button variant="link" onClick={() => setLineageOpen((v) => !v)}>
                  <GitBranch size={12} /> {lineageOpen ? "Hide lineage" : "Open in lineage"} <ArrowRight size={12} />
                </Button>
              </div>
            </CardSection>
          </div>
        )}
      </div>
    </Card>
  );
}

export default KnowledgeInspector;
