import { useState } from "react";
import { Eye, Share2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { DocReviewOutlinePanel, type DocRevision } from "../features/DocReviewOutlinePanel";
import { DocReviewFindingsPanel, type DocClaim, type DocFinding, type FindingsActions } from "../features/DocReviewFindingsPanel";
import type { EditorFinding } from "../features/DocReviewEditor";
import type { DocChange } from "../features/DocReviewChangeQueue";
import { MarkdownView } from "../data-display/MarkdownView";
import { PageHeader, Card, Button, EmptyState, TagChip } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";
import { Truncate } from "../data-display/Truncate";
import { ReadError } from "../feedback/ReadError";
import { WriteError } from "../feedback/WriteError";
import { useWrite } from "../actions/useWrite";

/* Synced documents are evidence, not a second authoring system. This page is
   deliberately read-only: edits belong in the source system and arrive on the
   next connector poll. Mari owns review findings, watches, and review tasks. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "outline", label: "Outline + revisions" },
  { id: "findings", label: "Fact check · findings" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error / service unavailable" },
  { id: "empty", label: "Empty document" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

export type ReviewDoc = {
  outlineBody: string;
  revisions: DocRevision[];
  editorBody: string;
  editorFindings: EditorFinding[];
  findings: DocFinding[];
  claims: DocClaim[];
  /* Compatibility-only ingestion output. Proposed source changes are reviewed
     in the unified Review queue; they are never applied from this page. */
  refine: { errorN: number; warnN: number; advisoryN: number };
  changes: DocChange[];
  changeBody: string;
};

/** Deprecated compatibility type. Document detail never enters a save state. */
export type SaveState = "saved" | "dirty" | "saving" | "applied" | "offline-dirty";
export type ReviewPane = "workspace" | "outline" | "editor" | "changes" | "findings" | "refine";

export type DocReviewActions = FindingsActions & {
  toggleWatch?: () => Promise<boolean>;
  share?: () => void | Promise<void>;
  openLibrary?: () => void;
};

export type DocReviewData = {
  title: string;
  subtitle: string;
  /** @deprecated retained so older adapters remain source-compatible. */
  save: SaveState;
  pane: ReviewPane;
  doc: ReviewDoc;
  tags?: string[];
  watched?: boolean;
  /** @deprecated findings are the only review surface on document detail. */
  bottomTab?: "changes" | "findings";
};

function isEmpty(data: DocReviewData): boolean {
  return !data.doc.editorBody && !data.doc.outlineBody && !data.doc.revisions.length
    && !data.doc.findings.length && !data.doc.claims.length;
}

function Body({ data, error, actions, mobile }: {
  data: DocReviewData; error: string | null; actions?: DocReviewActions; mobile: boolean;
}) {
  if (error) return <Card><ReadError>{error}</ReadError></Card>;
  if (isEmpty(data)) {
    return <Card><EmptyState title="Empty document">The source contains no readable content yet.</EmptyState></Card>;
  }
  if (data.pane === "outline") {
    return <DocReviewOutlinePanel body={data.doc.outlineBody} revisions={data.doc.revisions} />;
  }
  if (data.pane === "findings") {
    return <DocReviewFindingsPanel findings={data.doc.findings} claims={data.doc.claims} actions={actions} />;
  }
  return (
    <div className={mobile ? "flex flex-col gap-5" : "grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"}>
      <Card title="Source content" className="min-w-0">
        <MarkdownView>{data.doc.editorBody || data.doc.outlineBody}</MarkdownView>
      </Card>
      <div className="flex min-w-0 flex-col gap-5">
        <DocReviewOutlinePanel body={data.doc.outlineBody} revisions={data.doc.revisions} />
        <DocReviewFindingsPanel findings={data.doc.findings} claims={data.doc.claims} actions={actions} />
      </div>
    </div>
  );
}

function DocReviewPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<DocReviewData, DocReviewActions>) {
  const [watch, setWatch] = useState<boolean | null>(null);
  const write = useWrite();
  const watched = watch ?? data.watched;
  const onWatch = async () => {
    if (!actions?.toggleWatch) { setWatch((v) => !(v ?? data.watched ?? false)); return; }
    const next = await write.runFor(actions.toggleWatch);
    if (next !== undefined) setWatch(next);
  };
  const headerActions = (
    <>
      {(data.tags ?? []).map((tag) => <TagChip key={tag} tag={tag} />)}
      {watched !== undefined && <Button compact variant="default" onClick={onWatch}><Eye size={15} /> {watched ? "Watching" : "Watch"}</Button>}
      {actions?.share && <Button compact variant="default" onClick={actions.share}><Share2 size={15} /> Share</Button>}
    </>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("doc-review")} title="Document detail" mobile={mobile}>
      {loading ? <SkeletonPage variant="detail" label="Document detail" rail={["Document outline", "Revision history", "Fact check"]} mobile={mobile} /> : (
        <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          <PageHeader title={data.title} backLink={{ href: "/knowledge", label: "Knowledge" }} actions={mobile ? undefined : headerActions} />
          <Truncate className="mt-1 max-w-[680px] text-[13px] text-ink/70">{data.subtitle}</Truncate>
          <p className="mt-2 text-[12.5px] text-ink/70">Read-only source record · make content changes in the connected source.</p>
          {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
          <WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError>
          <div className="mt-6"><Body data={data} error={error} actions={actions} mobile={mobile} /></div>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<DocReviewData, DocReviewActions> = {
  id: "doc-review",
  title: "Document detail",
  route: "/knowledge/doc",
  component: DocReviewPage,
  states: STATES.map((state) => ({ ...state })),
};
