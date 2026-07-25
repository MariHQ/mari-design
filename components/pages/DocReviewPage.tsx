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
import { ReadError } from "../feedback/ReadError";
import { WriteError } from "../feedback/WriteError";
import { useWrite } from "../actions/useWrite";

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
  { id: "error", label: "Error / service unavailable" },
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
  /** Hand this document's address to whoever is being shared with. The app
      owns what sharing means — a copied link, a share sheet, an invite — so
      the page only says that the reader asked to share. */
  share?: () => void | Promise<void>;
  /** Take the reader to the knowledge library. An intent, not a route: the
      editor used to `window.open("/knowledge")` from inside the library, which
      is the exact coupling every other page emits a handler to avoid. */
  openLibrary?: () => void;
};

/** Everything the Doc Review page renders. */
export type DocReviewData = {
  title: string;
  /** The owner / last-verified line under the title. A value, not prose. */
  subtitle: string;
  save: SaveState;
  pane: ReviewPane;
  doc: ReviewDoc;
  /** This document's tags, as the library stores them. The header used to
      render "canonical" and "verified" on every document no matter what it was
      tagged; a chip nobody can trace to a value is invented data. Omit it and
      the header carries no tags. */
  tags?: string[];
  /** Whether the reader already watches this document. Optional because not
      every deployment knows: where it is unknown the Watch control is not
      drawn at all rather than claiming "Watch" at someone already watching. */
  watched?: boolean;
  /** Which review surface the bottom tab strip opens on, so the change queue
      and the fact check are both deep-linkable. */
  bottomTab?: BottomTab;
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

function HeaderActions({ save, onSave, onWatch, onShare, watched, tags }: {
  save: SaveState;
  onSave?: () => void;
  onWatch?: () => void;
  onShare?: () => void;
  /** Undefined means "nobody told this page", and the control stays away. */
  watched?: boolean;
  tags: string[];
}) {
  const offlineDirty = save === "offline-dirty";
  const dirty = save === "dirty";
  const saving = save === "saving";
  const applied = save === "applied";

  const statusChip = offlineDirty ? (
    /* A document that will not save is a failed WRITE, and it gets the same
       surface every other failed write gets. This was a bespoke inline span
       carrying its own error string, which §8 forbids (XA-02). */
    <WriteError>Changes are kept locally until the connection returns.</WriteError>
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
      {/* The document's own tags, or none. */}
      {tags.map((t) => <TagChip key={t} tag={t} />)}
      {statusChip}
      <Button compact icon={false} disabled={saveDisabled} onClick={onSave}>
        <Save size={15} /> {saveLabel}
      </Button>
      {/* Gated on KNOWING the state, not on being able to write it. A Watch
          button that starts at "Watch" for a document you already watch is
          worse than no Watch button, so an undefined `watched` draws nothing.
          A missing `toggleWatch` is different: §2 says omitting an action must
          never make a control vanish, it falls back to the local echo below. */}
      {watched !== undefined && (
        <Button compact variant="default" onClick={onWatch}>
          <Eye size={15} /> {watched ? "Watching" : "Watch"}
        </Button>
      )}
      {/* Only offered where sharing means something. A Share button that
          cannot share is worse than a page with no Share button. */}
      {onShare && (
        <Button compact variant="default" onClick={onShare}>
          <Share2 size={15} /> Share
        </Button>
      )}
    </>
  );
}

function Workspace({ mobile, initialTab, doc, actions, onBodyChange, onSave }: {
  mobile: boolean; initialTab: BottomTab; doc: ReviewDoc;
  actions?: DocReviewActions; onBodyChange: (body: string) => void; onSave?: () => void;
}) {
  const [tab, setTab] = useState<BottomTab>(initialTab);
  /* The tab is a deep link, so a new one from the URL has to reach the strip.
     C1's resync sentinel. */
  const [seen, setSeen] = useState(initialTab);
  if (seen !== initialTab) { setSeen(initialTab); setTab(initialTab); }
  return (
    <>
      {/* §11: main column carries minmax(0,1fr); both supporting rails at the
          standard 320px so the internal plumb lines match every other page.

          Two 320px rails plus the editor need ~1250px of content column, which
          only exists from about 1530px of window. Narrower than that the row
          sheds rails rather than squeezing the editor to a gutter (§12/§15):
          at 2xl it is outline | editor | refine, at xl the editor keeps the
          main column and both panels stack in one 320px rail beside it, and
          below xl the three panels stack in one column.

          In that one column the editor comes FIRST. It used to come second,
          in DOM order, which put the outline and the whole revision history
          above it and started the editor about 850px down the page — on a
          laptop you opened a document and saw no editor at all. `order` is
          what fixes it without disturbing the wider layouts: it reorders the
          auto-placed single column and is ignored by the explicit row/column
          placement the xl and 2xl grids use. DOM order is untouched, so a
          screen reader still reaches outline → editor → refine. */}
      <div className={mobile ? "flex flex-col gap-5" : "grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[320px_minmax(0,1fr)_320px]"}>
        <div className="order-2 flex min-w-0 flex-col gap-5 xl:order-none xl:col-start-2 xl:row-start-1 2xl:col-start-1">
          <DocReviewOutlinePanel body={doc.outlineBody} revisions={doc.revisions} />
        </div>
        <div className="order-1 min-w-0 xl:order-none xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:col-start-2 2xl:row-span-1">
          <DocReviewEditor
            compact={mobile}
            body={doc.editorBody}
            findings={doc.editorFindings}
            onChange={onBodyChange}
            onSave={onSave}
            onOpenLibrary={actions?.openLibrary}
          />
        </div>
        <div className="order-3 flex min-w-0 flex-col gap-5 xl:order-none xl:col-start-2 xl:row-start-2 2xl:col-start-3 2xl:row-start-1">
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

function Body({ data, error, actions, mobile, onBodyChange, onSave }: {
  data: DocReviewData; error: string | null; actions?: DocReviewActions;
  mobile: boolean; onBodyChange: (body: string) => void; onSave?: () => void;
}) {
  const doc = data.doc;
  if (error) {
    /* An empty state says "nothing here yet"; a failed read says the request
       did not come back. They are not the same sentence (§8, XA-01). */
    return (
      <Card>
        <ReadError>{error}</ReadError>
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
        <DocReviewEditor
          compact={mobile}
          body={doc.editorBody}
          findings={doc.editorFindings}
          onChange={onBodyChange}
          onSave={onSave}
          onOpenLibrary={actions?.openLibrary}
        />
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

  /* Which pane the bottom strip opens on comes from the data, so a link to
     the fact check opens the fact check (CONSOLE-REVIEW P-DR-5). */
  const initialTab: BottomTab = data.bottomTab ?? "changes";
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
      <Workspace mobile={mobile} initialTab={initialTab} doc={doc} actions={actions} onBodyChange={onBodyChange} onSave={onSave} />
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
  const [watch, setWatch] = useState<boolean | null>(null);
  /* One hook for both writes on this page (XA-04). `save` keeps its own
     five-value lifecycle — "saving" and "applied" are states the header reads,
     not just "not busy" — so the hook supplies the failure surface and the
     lifecycle stays where it was. */
  const write = useWrite();

  const saveState = save ?? data.save;
  /* Seeded from the document, not from `false`: a document you already watch
     used to greet you with "Watch" (CONSOLE-REVIEW P-DR-2). `null` means the
     reader has not toggled it here, so `data` is still the truth — and if
     `data` does not know either, the control is not drawn. */
  const watched = watch ?? data.watched;

  const onBodyChange = (next: string) => {
    if (!actions?.save) return; // nothing to save it with: no false "unsaved".
    setBody(next);
    setSave("dirty");
  };

  const onSave = async () => {
    if (!actions?.save || body === null) return;
    setSave("saving");
    const ok = await write.run(() => actions.save!({ body }), () => setSave("applied"));
    if (!ok) setSave("dirty");
  };

  const onWatch = async () => {
    if (!actions?.toggleWatch) { setWatch((v) => !(v ?? data.watched ?? false)); return; }
    // `runFor`: the new watched state is the server's answer, not an assumption.
    const next = await write.runFor(actions.toggleWatch);
    if (next !== undefined) setWatch(next);
  };

  const headerActions = (
    <HeaderActions
      save={saveState}
      watched={watched}
      tags={data.tags ?? []}
      onSave={actions?.save ? onSave : undefined}
      /* Always passed: with no `toggleWatch` it toggles local state, which is
         what the design canvas renders and what §2 requires. */
      onWatch={onWatch}
      onShare={actions?.share}
    />
  );
  return (
    <PageFrame chrome={chrome} active={navFor("doc-review")} title="Doc Review" mobile={mobile}>
      {loading ? (
        <SkeletonPage
          variant="editor"
          /* No title or description: on Doc Review both are the document's,
             and a document name is the response's to give. The three panels
             around it are the page's own furniture and render as themselves. */
          label="Doc Review"
          sections={["Document outline"]}
          rail={["Fact check", "Refine"]}
          actions={3}
          mobile={mobile}
        />
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
        {/* A failed save or a refused subscription accuses no input, so it is a
            banner beside the header's controls (XA-02). */}
        <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
        <div className="mt-6 flex flex-col gap-5">
          <Body
            data={{ ...data, save: saveState }}
            error={error}
            actions={actions}
            mobile={mobile}
            onBodyChange={onBodyChange}
            onSave={actions?.save ? onSave : undefined}
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
