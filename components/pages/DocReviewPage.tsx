import { useState } from "react";
import { Save, Eye, Share2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { DocReviewEditor, type EditorFinding } from "../features/DocReviewEditor";
import { DocReviewOutlinePanel, type DocRevision } from "../features/DocReviewOutlinePanel";
import { DocReviewRefinePanel } from "../features/DocReviewRefinePanel";
import { DocReviewChangeQueue, type DocChange } from "../features/DocReviewChangeQueue";
import { DocReviewFindingsPanel, type DocClaim, type DocFinding } from "../features/DocReviewFindingsPanel";
import { PageHeader, Card, Button, Chip, Tabs, EmptyState, Alert, TagChip } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { Truncate } from "../data-display/Truncate";

/* Doc Review workspace (pages/doc-review.md). A multi-pane editor: outline +
   revisions on the left, the block editor in the centre, refine on the right,
   and a change-queue / findings tab strip below.

   This page is a pure presenter: it holds no demo content. The document, its
   revisions, the proposed changes, and the fact-check findings all arrive in
   `data`, so a document with nothing in it renders the empty state rather than
   someone's invented draft. The design canvas supplies the same shape from
   `.preview/fixtures/docReview.ts`. */

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

/** The document itself, as the five review panels render it. Every field is
    something a document API returns; nothing is a rendering flag. */
export type ReviewDoc = {
  /** Markdown the outline is derived from. */
  outlineBody: string;
  revisions: DocRevision[];
  /** Markdown the block editor renders. */
  editorBody: string;
  editorFindings: EditorFinding[];
  /** The refine panel's findings tally. */
  refine: { errorN: number; warnN: number; advisoryN: number };
  changes: DocChange[];
  /** Prose the change queue diffs against. */
  changeBody: string;
  findings: DocFinding[];
  claims: DocClaim[];
};

/** Where the document stands against the server. An app drives this from its
    own mutation state; it is not a canvas concept. */
export type SaveState = "saved" | "dirty" | "saving" | "applied" | "offline-dirty";

/** Which review surface is open. The workspace shows all three panes at once;
    the others are the deep-link views of a single pane. */
export type ReviewPane = "workspace" | "outline" | "editor" | "changes" | "findings" | "refine";

/** Everything the Doc Review page renders. */
export type DocReviewData = {
  title: string;
  /** The owner / last-verified line under the title. A value, not prose. */
  subtitle: string;
  save: SaveState;
  pane: ReviewPane;
  doc: ReviewDoc;
};

/** A document with no body and nothing said about it yet. Derived from the
    data, not from a state flag, so it is true in the real app for exactly the
    same reason it is true on the canvas. */
function isEmpty(d: DocReviewData): boolean {
  const doc = d.doc;
  return !doc.editorBody && !doc.outlineBody && !doc.changeBody
    && !doc.revisions.length && !doc.editorFindings.length
    && !doc.changes.length && !doc.findings.length && !doc.claims.length;
}

function HeaderActions({ save }: { save: SaveState }) {
  const offlineDirty = save === "offline-dirty";
  const dirty = save === "dirty";
  const saving = save === "saving";
  const applied = save === "applied";

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

function Workspace({ mobile, initialTab, doc }: { mobile: boolean; initialTab: BottomTab; doc: ReviewDoc }) {
  const [tab, setTab] = useState<BottomTab>(initialTab);
  return (
    <>
      {/* §11: main column carries minmax(0,1fr); both supporting rails at the
          standard 320px so the internal plumb lines match every other page.

          Two 320px rails plus the editor need ~1250px of content column, which
          only exists from about 1530px of window. Narrower than that the row
          sheds rails rather than squeezing the editor to a gutter (§12/§15):
          at 2xl it is outline | editor | refine, at xl the editor keeps the
          main column and both panels stack in one 320px rail beside it, and
          below xl the three panels stack in reading order. The panels are
          placed explicitly rather than reordered in the DOM so the editor is
          always the second thing a screen reader reaches. */}
      <div className={mobile ? "flex flex-col gap-5" : "grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[320px_minmax(0,1fr)_320px]"}>
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-1 2xl:col-start-1">
          <DocReviewOutlinePanel body={doc.outlineBody} revisions={doc.revisions} />
        </div>
        <div className="min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:col-start-2 2xl:row-span-1">
          <DocReviewEditor compact={mobile} body={doc.editorBody} findings={doc.editorFindings} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-2 2xl:col-start-3 2xl:row-start-1">
          <DocReviewRefinePanel {...doc.refine} />
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
          ? <DocReviewChangeQueue compact={mobile} changes={doc.changes} body={doc.changeBody} />
          : <DocReviewFindingsPanel findings={doc.findings} claims={doc.claims} />}
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

function Body({ data, error, mobile }: { data: DocReviewData; error: string | null; mobile: boolean }) {
  const doc = data.doc;
  if (error) {
    return (
      <Card>
        <EmptyState title="API offline">{error}</EmptyState>
      </Card>
    );
  }
  if (isEmpty(data)) {
    return (
      <Card>
        <EmptyState title="Empty document">
          This document has no body yet. Start writing to build it out.
        </EmptyState>
      </Card>
    );
  }

  // Panel-isolation views — show a single pane full-width.
  if (data.pane === "outline") {
    return (
      <PanelFrame title="Document outline" description="Live section outline derived from headings, plus revision history.">
        <DocReviewOutlinePanel body={doc.outlineBody} revisions={doc.revisions} />
      </PanelFrame>
    );
  }
  if (data.pane === "editor") {
    return (
      <PanelFrame title="Block editor" description="Content-editable blocks with inline finding underlines and margin annotations.">
        <DocReviewEditor compact={mobile} body={doc.editorBody} findings={doc.editorFindings} />
      </PanelFrame>
    );
  }
  if (data.pane === "changes") {
    return (
      <PanelFrame title="Change queue" description="Proposed edits as a word-level diff: accept to rewrite the body, reject to dismiss.">
        <DocReviewChangeQueue compact={mobile} changes={doc.changes} body={doc.changeBody} />
      </PanelFrame>
    );
  }
  if (data.pane === "findings") {
    return (
      <PanelFrame title="Fact check" description="Claim tallies, the top contradiction against verified facts, and a create-review-task row.">
        <DocReviewFindingsPanel findings={doc.findings} claims={doc.claims} />
      </PanelFrame>
    );
  }
  if (data.pane === "refine") {
    return (
      <PanelFrame title="Refine" description="AI editing skills that propose edits into the review-before-apply queue.">
        <DocReviewRefinePanel {...doc.refine} />
      </PanelFrame>
    );
  }

  const initialTab: BottomTab = "changes";
  return (
    <>
      {data.save === "offline-dirty" && (
        <Alert tone="attention" title="You're offline">
          Changes are kept locally and will save once the connection returns.
        </Alert>
      )}
      {data.save === "applied" && (
        <Alert tone="ok" title="Changes saved">
          The document was saved and revisions were refreshed.
        </Alert>
      )}
      <Workspace mobile={mobile} initialTab={initialTab} doc={doc} />
    </>
  );
}

function DocReviewPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<DocReviewData>) {
  const actions = <HeaderActions save={data.save} />;
  return (
    <PageFrame chrome={chrome} active={navFor("doc-review")} title="Doc Review" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="editor" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        {/* The owner/verified line is a value, not prose: it carries a name and
            can carry a URL, so it truncates with the full text on hover
            (CONVENTIONS.md §12). PageHeader's own `description` slot wraps
            instead, which is what pushed the stress URL past the header. */}
        <PageHeader
          title={data.title}
          backLink={{ href: "/knowledge", label: "Library" }}
          actions={mobile ? undefined : actions}
        />
        <Truncate className="mt-1 max-w-[680px] text-[13px] text-ink/70">{data.subtitle}</Truncate>
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <div className="mt-6 flex flex-col gap-5">
          <Body data={data} error={error} mobile={mobile} />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<DocReviewData> = {
  id: "doc-review",
  title: "Doc Review",
  route: "/knowledge/doc",
  component: DocReviewPage,
  states: STATES.map((s) => ({ ...s })),
};
