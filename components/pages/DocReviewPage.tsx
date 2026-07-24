import { useState } from "react";
import { Save, Eye, Share2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { DocReviewEditor, type EditorFinding } from "../features/DocReviewEditor";
import { DocReviewOutlinePanel, type DocRevision } from "../features/DocReviewOutlinePanel";
import { DocReviewRefinePanel, type RefineActions } from "../features/DocReviewRefinePanel";
import { DocReviewChangeQueue, type DocChange, type ChangeQueueActions } from "../features/DocReviewChangeQueue";
import { DocReviewFindingsPanel, type DocClaim, type DocFinding, type FindingsActions } from "../features/DocReviewFindingsPanel";
import { PageHeader, Card, Button, Chip, Tabs, EmptyState, Alert, TagChip } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { Truncate } from "../data-display/Truncate";
import { FieldError } from "../feedback/ErrorMessage";

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

/** What the review workspace can DO. Handlers may throw and the page shows the
    server's own message beside the control that tried the write.

    Optional, as always: with none of them the editor, the change queue, the
    refine panel and the fact check keep the local behaviour they already had —
    which is what the design canvas, with no server behind it, renders. */
export type DocReviewActions = ChangeQueueActions & RefineActions & FindingsActions & {
  /** Persist the edited body. */
  save?: (args: { body: string }) => void | Promise<void>;
  /** Watch or unwatch this document. Resolves to the new watched state. */
  toggleWatch?: () => Promise<boolean>;
};

/** Whatever the server said, or a floor when the failure carried no message. */
const why = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

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

function HeaderActions({ save, onSave, onWatch, watched }: {
  save: SaveState;
  onSave?: () => void;
  onWatch?: () => void;
  watched: boolean;
}) {
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
      <Button compact icon={false} disabled={saveDisabled} onClick={onSave}>
        <Save size={15} /> {saveLabel}
      </Button>
      <Button compact variant="default" onClick={onWatch}>
        <Eye size={15} /> {watched ? "Watching" : "Watch"}
      </Button>
      <Button compact variant="default">
        <Share2 size={15} /> Share
      </Button>
    </>
  );
}

function Workspace({ mobile, initialTab, doc, actions, onBodyChange }: {
  mobile: boolean; initialTab: BottomTab; doc: ReviewDoc;
  actions?: DocReviewActions; onBodyChange: (body: string) => void;
}) {
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
          <DocReviewEditor compact={mobile} body={doc.editorBody} findings={doc.editorFindings} onChange={onBodyChange} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-2 2xl:col-start-3 2xl:row-start-1">
          <DocReviewRefinePanel {...doc.refine} actions={actions} />
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
          ? <DocReviewChangeQueue compact={mobile} changes={doc.changes} body={doc.changeBody} actions={actions} />
          : <DocReviewFindingsPanel findings={doc.findings} claims={doc.claims} actions={actions} />}
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

function Body({ data, error, actions, mobile, onBodyChange }: {
  data: DocReviewData; error: string | null; actions?: DocReviewActions;
  mobile: boolean; onBodyChange: (body: string) => void;
}) {
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
        <DocReviewEditor compact={mobile} body={doc.editorBody} findings={doc.editorFindings} onChange={onBodyChange} />
      </PanelFrame>
    );
  }
  if (data.pane === "changes") {
    return (
      <PanelFrame title="Change queue" description="Proposed edits as a word-level diff: accept to rewrite the body, reject to dismiss.">
        <DocReviewChangeQueue compact={mobile} changes={doc.changes} body={doc.changeBody} actions={actions} />
      </PanelFrame>
    );
  }
  if (data.pane === "findings") {
    return (
      <PanelFrame title="Fact check" description="Claim tallies, the top contradiction against verified facts, and a create-review-task row.">
        <DocReviewFindingsPanel findings={doc.findings} claims={doc.claims} actions={actions} />
      </PanelFrame>
    );
  }
  if (data.pane === "refine") {
    return (
      <PanelFrame title="Refine" description="AI editing skills that propose edits into the review-before-apply queue.">
        <DocReviewRefinePanel {...doc.refine} actions={actions} />
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
      <Workspace mobile={mobile} initialTab={initialTab} doc={doc} actions={actions} onBodyChange={onBodyChange} />
    </>
  );
}

function DocReviewPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<DocReviewData, DocReviewActions>) {
  /* Save is a lifecycle this page owns once it can actually write: `data.save`
     is where the document started, and every edit and every save moves it from
     there. Without a `save` handler the state is whatever the app said, exactly
     as before. */
  const [save, setSave] = useState<SaveState | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const saveState = save ?? data.save;

  const onBodyChange = (next: string) => {
    if (!actions?.save) return; // nothing to save it with: no false "unsaved".
    setBody(next);
    setSave("dirty");
  };

  const onSave = async () => {
    if (!actions?.save || body === null) return;
    setSave("saving");
    setFailed(null);
    try {
      await actions.save({ body });
      setSave("applied");
    } catch (e) {
      setSave("dirty");
      setFailed(why(e, "This document could not be saved."));
    }
  };

  const onWatch = async () => {
    if (!actions?.toggleWatch) { setWatched((v) => !v); return; }
    setFailed(null);
    try {
      setWatched(await actions.toggleWatch());
    } catch (e) {
      setFailed(why(e, "That subscription could not be changed."));
    }
  };

  const headerActions = (
    <HeaderActions
      save={saveState}
      watched={watched}
      onSave={actions?.save ? onSave : undefined}
      onWatch={actions?.toggleWatch ? onWatch : undefined}
    />
  );
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
          actions={mobile ? undefined : headerActions}
        />
        <Truncate className="mt-1 max-w-[680px] text-[13px] text-ink/70">{data.subtitle}</Truncate>
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
        <FieldError>{failed}</FieldError>
        <div className="mt-6 flex flex-col gap-5">
          <Body
            data={{ ...data, save: saveState }}
            error={error}
            actions={actions}
            mobile={mobile}
            onBodyChange={onBodyChange}
          />
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<DocReviewData, DocReviewActions> = {
  id: "doc-review",
  title: "Doc Review",
  route: "/knowledge/doc",
  component: DocReviewPage,
  states: STATES.map((s) => ({ ...s })),
};
