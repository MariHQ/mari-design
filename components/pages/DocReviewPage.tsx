import { useState, type ComponentProps } from "react";
import { Save, Eye, Share2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { DocReviewEditor } from "../features/DocReviewEditor";
import { DocReviewOutlinePanel } from "../features/DocReviewOutlinePanel";
import { DocReviewRefinePanel } from "../features/DocReviewRefinePanel";
import { DocReviewChangeQueue } from "../features/DocReviewChangeQueue";
import { DocReviewFindingsPanel } from "../features/DocReviewFindingsPanel";
import { PageHeader, Card, Button, Chip, Tabs, EmptyState, Alert, TagChip } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { fmtDate } from "../tokens/format";
import { Truncate } from "../data-display/Truncate";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_NAME, LONG_DOC_TITLE, LONG_URL,
  UNBREAKABLE, LONG_WORD, HUGE_NUMBER, HUGE_NUMBER_STR, MIXED_SCRIPT,
} from "./stress";

/* Doc Review workspace (pages/doc-review.md). A multi-pane editor: outline +
   revisions on the left, the block editor in the centre, refine on the right,
   and a change-queue / findings tab strip below. States isolate each panel as
   its own view, walk the save lifecycle (saved → dirty → saving → applied), and
   cover the standalone loading / offline / offline-dirty / empty edges. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "outline", label: "Outline + revisions" },
  { id: "editor", label: "Editor focus" },
  { id: "change-queue", label: "Change queue · word diff" },
  { id: "findings", label: "Fact check · findings" },
  { id: "refine", label: "Refine panel" },
  { id: "dirty", label: "Unsaved changes" },
  { id: "saving", label: "Saving…" },
  { id: "applied", label: "Saved" },
  { id: "offline-dirty", label: "Offline · unsaved" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "Empty document" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

type BottomTab = "changes" | "findings";

/* ── overflow / stress datasets, injected into the composed panels ─────────
   Types are borrowed from each feature's own props so the data stays in lock-
   step with the components. */
type Rev = NonNullable<ComponentProps<typeof DocReviewOutlinePanel>["revisions"]>[number];
type EditorFinding = NonNullable<ComponentProps<typeof DocReviewEditor>["findings"]>[number];
type Change = NonNullable<ComponentProps<typeof DocReviewChangeQueue>["changes"]>[number];
type Finding = NonNullable<ComponentProps<typeof DocReviewFindingsPanel>["findings"]>[number];
type Claim = NonNullable<ComponentProps<typeof DocReviewFindingsPanel>["claims"]>[number];

type DocData = {
  outlineBody: string;
  revisions: Rev[];
  editorBody: string;
  editorFindings: EditorFinding[];
  refine: { errorN: number; warnN: number; advisoryN: number };
  changes: Change[];
  changeBody: string;
  findings: Finding[];
  claims: Claim[];
};

const OVERFLOW_DATA: DocData = {
  outlineBody: `# ${LONG_TITLE}

## Overview and scope of this consolidated operating guidance
${LONG_PARAGRAPH}

## ${LONG_TITLE}
${LONG_PARAGRAPH}

### ${LONG_DOC_TITLE}
${LONG_PARAGRAPH}`,
  revisions: [
    { id: 1, actor: LONG_NAME, verb: "reconciled the runbook against four quarters of incident retrospectives", at: "2h ago" },
    { id: 2, actor: LONG_NAME, verb: "ran Tighten across every section of the consolidated document", at: "Yesterday, 4:12 PM" },
    { id: 3, actor: "Maya Chen", verb: "accepted 3 changes", at: "Jul 18, 11:03 AM" },
  ],
  editorBody: `# ${LONG_TITLE}

## Overview
${LONG_PARAGRAPH}

## Rollout
${LONG_PARAGRAPH}`,
  editorFindings: [
    { id: 1, kind: "fact", severity: "error", text: "re-reviewed every quarter or after any Sev-1", note: LONG_PARAGRAPH },
    { id: 2, kind: "prose", severity: "warn", text: "in exhaustive detail", note: "hedge: consider trimming this qualifier for concision across the section" },
  ],
  refine: { errorN: 12, warnN: 34, advisoryN: 21 },
  changes: [
    { id: 1, original: LONG_PARAGRAPH, proposed: "This document consolidates the operating guidance for the entire platform organization and describes the escalation ladder, the paging policy, and the post-incident review process.", rule: "Tighten: cut redundant scope-setting across the opening paragraph so responders reach the escalation ladder faster", state: "pending" },
    { id: 2, original: "It will be re-reviewed every quarter or after any Sev-1.", proposed: "It is re-reviewed each quarter and after every Sev-1 incident.", rule: "Sharpen: commit to the cadence instead of hedging with a future tense", state: "pending" },
  ],
  changeBody: LONG_PARAGRAPH,
  findings: [
    { id: 1, kind: "fact", severity: "error", text: "reconciled against the last four quarters of incident retrospectives", note: LONG_PARAGRAPH },
    { id: 2, kind: "freshness", severity: "warn", text: "reviewed by the reliability guild", note: "The reliability-guild sign-off referenced here is more than eight months old and predates the current escalation ladder." },
  ],
  claims: [
    { claim: LONG_PARAGRAPH, source: LONG_DOC_TITLE, status: "Contradicted", verified: "" },
    { claim: "Every section has been reviewed by the reliability guild and reconciled against retrospectives.", source: LONG_TITLE, status: "Verified", verified: "May 1, 2024" },
  ],
};

const STRESS_DATA: DocData = {
  outlineBody: `# ${UNBREAKABLE}

## ${MIXED_SCRIPT}
${LONG_URL}

## ${LONG_WORD}
${UNBREAKABLE}

### ${LONG_URL}
${MIXED_SCRIPT}`,
  revisions: [
    { id: 1, actor: LONG_WORD, verb: MIXED_SCRIPT, at: HUGE_NUMBER_STR },
    { id: 2, actor: MIXED_SCRIPT, verb: `edited ${UNBREAKABLE}`, at: HUGE_NUMBER_STR },
  ],
  editorBody: `# ${UNBREAKABLE}

## ${MIXED_SCRIPT}
${LONG_URL}

${UNBREAKABLE}`,
  editorFindings: [
    { id: 1, kind: "fact", severity: "error", text: UNBREAKABLE, note: `${MIXED_SCRIPT} ${LONG_URL}` },
  ],
  refine: { errorN: HUGE_NUMBER, warnN: HUGE_NUMBER, advisoryN: HUGE_NUMBER },
  changes: [
    { id: 1, original: UNBREAKABLE, proposed: LONG_WORD, rule: MIXED_SCRIPT, state: "pending" },
    { id: 2, original: LONG_URL, proposed: UNBREAKABLE, rule: HUGE_NUMBER_STR, state: "pending" },
  ],
  changeBody: `${UNBREAKABLE} ${LONG_URL} ${MIXED_SCRIPT}`,
  findings: [
    { id: 1, kind: "fact", severity: "error", text: UNBREAKABLE, note: `${MIXED_SCRIPT}, ${LONG_URL}` },
    { id: 2, kind: "freshness", severity: "warn", text: LONG_WORD, note: MIXED_SCRIPT },
  ],
  claims: [
    { claim: UNBREAKABLE, source: LONG_URL, status: "Contradicted", verified: HUGE_NUMBER_STR },
    { claim: MIXED_SCRIPT, source: LONG_WORD, status: "Unsupported", verified: "" },
  ],
};

function dataFor(state: string): DocData | undefined {
  if (state === "overflow") return OVERFLOW_DATA;
  if (state === "stress") return STRESS_DATA;
  return undefined;
}

function HeaderActions({ state }: { state: string }) {
  const offlineDirty = state === "offline-dirty";
  const dirty = state === "dirty";
  const saving = state === "saving";
  const applied = state === "applied";

  const statusChip = offlineDirty ? (
    <span className="text-[12px] font-medium text-espelette">API offline: can't save</span>
  ) : saving ? (
    <Chip label="Saving…" tone="info" dot />
  ) : dirty ? (
    <Chip label="Unsaved changes" tone="attention" dot />
  ) : applied ? (
    <Chip label="Saved" tone="ok" dot pulse />
  ) : (
    <Chip label="Saved" tone="ok" dot />
  );

  const saveLabel = saving ? "Saving…" : "Save";
  const saveDisabled = offlineDirty || saving || (!dirty && !offlineDirty);

  return (
    <>
      <TagChip tag="canonical" />
      <TagChip tag="verified" />
      {statusChip}
      <Button compact icon={false} disabled={saveDisabled}>
        <Save size={15} /> {saveLabel}
      </Button>
      <Button compact variant="default">
        <Eye size={15} /> Watch
      </Button>
      <Button compact variant="default">
        <Share2 size={15} /> Share
      </Button>
    </>
  );
}

function Workspace({ mobile, initialTab, data }: { mobile: boolean; initialTab: BottomTab; data?: DocData }) {
  const [tab, setTab] = useState<BottomTab>(initialTab);
  return (
    <>
      {/* §11: main column carries minmax(0,1fr); both supporting rails at the
          standard 320px so the internal plumb lines match every other page. */}
      <div
        className={
          mobile
            ? "flex flex-col gap-5"
            : "grid gap-5 grid-cols-[320px_minmax(0,1fr)_320px]"
        }
      >
        <div className="flex min-w-0 flex-col gap-5">
          <DocReviewOutlinePanel {...(data ? { body: data.outlineBody, revisions: data.revisions } : {})} />
        </div>
        <div className="min-w-0">
          <DocReviewEditor compact={mobile} {...(data ? { body: data.editorBody, findings: data.editorFindings } : {})} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <DocReviewRefinePanel {...(data ? data.refine : {})} />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Tabs
          ariaLabel="Review panels"
          variant="underline"
          value={tab}
          onChange={setTab}
          options={[
            { id: "changes", label: "Change queue" },
            { id: "findings", label: "Fact check" },
          ]}
        />
        {tab === "changes"
          ? <DocReviewChangeQueue compact={mobile} {...(data ? { changes: data.changes, body: data.changeBody } : {})} />
          : <DocReviewFindingsPanel {...(data ? { findings: data.findings, claims: data.claims } : {})} />}
      </div>
    </>
  );
}

function PanelFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink/65">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  if (state === "error") {
    return (
      <Card>
        <EmptyState title="API offline">
          This document can't be loaded right now.
        </EmptyState>
      </Card>
    );
  }
  if (state === "empty") {
    return (
      <Card>
        <EmptyState title="Empty document">
          This document has no body yet. Start writing to build it out.
        </EmptyState>
      </Card>
    );
  }

  // Panel-isolation states — show a single pane full-width.
  if (state === "outline") {
    return (
      <PanelFrame title="Document outline" description="Live section outline derived from headings, plus revision history.">
        <DocReviewOutlinePanel />
      </PanelFrame>
    );
  }
  if (state === "editor") {
    return (
      <PanelFrame title="Block editor" description="Content-editable blocks with inline finding underlines and margin annotations.">
        <DocReviewEditor compact={mobile} />
      </PanelFrame>
    );
  }
  if (state === "change-queue") {
    return (
      <PanelFrame title="Change queue" description="Proposed edits as a word-level diff: accept to rewrite the body, reject to dismiss.">
        <DocReviewChangeQueue compact={mobile} />
      </PanelFrame>
    );
  }
  if (state === "findings") {
    return (
      <PanelFrame title="Fact check" description="Claim tallies, the top contradiction against verified facts, and a create-review-task row.">
        <DocReviewFindingsPanel />
      </PanelFrame>
    );
  }
  if (state === "refine") {
    return (
      <PanelFrame title="Refine" description="AI editing skills that propose edits into the review-before-apply queue.">
        <DocReviewRefinePanel />
      </PanelFrame>
    );
  }

  const initialTab: BottomTab = "changes";
  return (
    <>
      {state === "offline-dirty" && (
        <Alert tone="attention" title="You're offline">
          Changes are kept locally and will save once the connection returns.
        </Alert>
      )}
      {state === "applied" && (
        <Alert tone="ok" title="Changes saved">
          The document was saved and revisions were refreshed.
        </Alert>
      )}
      <Workspace mobile={mobile} initialTab={initialTab} data={dataFor(state)} />
    </>
  );
}

function DocReviewPage({ state = "default", mobile = false }: PageProps) {
  const actions = <HeaderActions state={state} />;
  return (
    <PageFrame active={navFor("doc-review")} title="Doc Review" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="editor" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        {/* The owner/verified line is a value, not prose: it carries a name and
            can carry a URL, so it truncates with the full text on hover
            (CONVENTIONS.md §12). PageHeader's own `description` slot wraps
            instead, which is what pushed the stress URL past the header. */}
        <PageHeader
          title={state === "overflow" ? LONG_TITLE : state === "stress" ? `${UNBREAKABLE} ${MIXED_SCRIPT}` : "Billing proration runbook"}
          backLink={{ href: "/knowledge", label: "Library" }}
          actions={mobile ? undefined : actions}
        />
        <Truncate className="mt-1 max-w-[680px] text-[13px] text-ink/70">
          {state === "overflow"
            ? `Owner: ${LONG_NAME} · Last verified across every service, region, and team`
            : state === "stress"
              ? `${MIXED_SCRIPT} · ${LONG_URL}`
              : `Owner: Maya M. · Last verified ${fmtDate("2024-05-13")}`}
        </Truncate>
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <div className="mt-6 flex flex-col gap-5">
          <Body state={state} mobile={mobile} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "doc-review",
  title: "Doc Review",
  route: "/knowledge/doc",
  component: DocReviewPage,
  states: STATES.map((s) => ({ ...s })),
};
