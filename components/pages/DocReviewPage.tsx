import { useState } from "react";
import { Save, Eye, Share2 } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { DocReviewEditor } from "../features/DocReviewEditor";
import { DocReviewOutlinePanel } from "../features/DocReviewOutlinePanel";
import { DocReviewRefinePanel } from "../features/DocReviewRefinePanel";
import { DocReviewChangeQueue } from "../features/DocReviewChangeQueue";
import { DocReviewFindingsPanel } from "../features/DocReviewFindingsPanel";
import { PageHeader, Card, Button, Chip, Tabs, EmptyState, Spinner, Alert, TagChip } from "../index";

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
] as const;

type BottomTab = "changes" | "findings";

function HeaderActions({ state }: { state: string }) {
  const offlineDirty = state === "offline-dirty";
  const dirty = state === "dirty";
  const saving = state === "saving";
  const applied = state === "applied";

  const statusChip = offlineDirty ? (
    <span className="text-[12px] font-medium text-espelette">API offline — can't save</span>
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

function Workspace({ mobile, initialTab }: { mobile: boolean; initialTab: BottomTab }) {
  const [tab, setTab] = useState<BottomTab>(initialTab);
  return (
    <>
      <div
        className={
          mobile
            ? "space-y-4"
            : "grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]"
        }
      >
        <div className="min-w-0 space-y-4">
          <DocReviewOutlinePanel />
        </div>
        <div className="min-w-0">
          <DocReviewEditor />
        </div>
        <div className="min-w-0 space-y-4">
          <DocReviewRefinePanel />
        </div>
      </div>
      <div className="mt-5">
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
        <div className="mt-4">
          {tab === "changes" ? <DocReviewChangeQueue /> : <DocReviewFindingsPanel />}
        </div>
      </div>
    </>
  );
}

function PanelFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[12.5px] text-ink/55">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Body({ state, mobile }: { state: string; mobile: boolean }) {
  if (state === "loading") {
    return (
      <Card>
        <div className="grid place-items-center py-24">
          <Spinner size="md" label="Loading document" />
        </div>
      </Card>
    );
  }
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
        <DocReviewEditor />
      </PanelFrame>
    );
  }
  if (state === "change-queue") {
    return (
      <PanelFrame title="Change queue" description="Proposed edits as a word-level diff — accept to rewrite the body, reject to dismiss.">
        <DocReviewChangeQueue />
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
        <div className="max-w-[360px]"><DocReviewRefinePanel /></div>
      </PanelFrame>
    );
  }

  const initialTab: BottomTab = "changes";
  return (
    <>
      {state === "offline-dirty" && (
        <div className="mb-4">
          <Alert tone="attention" title="You're offline">
            Changes are kept locally and will save once the connection returns.
          </Alert>
        </div>
      )}
      {state === "applied" && (
        <div className="mb-4">
          <Alert tone="ok" title="Changes saved">
            The document was saved and revisions were refreshed.
          </Alert>
        </div>
      )}
      <Workspace mobile={mobile} initialTab={initialTab} />
    </>
  );
}

function DocReviewPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("doc-review")} title="Doc Review" mobile={mobile}>
      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <PageHeader
          title="Billing proration runbook"
          backLink={{ href: "/knowledge", label: "Library" }}
          description="Owner: Maya M. · Last verified May 13, 2024"
          actions={<HeaderActions state={state} />}
        />
        <div className="mt-6">
          <Body state={state} mobile={mobile} />
        </div>
      </div>
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
