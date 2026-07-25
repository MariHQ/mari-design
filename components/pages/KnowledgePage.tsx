import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { KnowledgeBrowser, type KnowledgeResult } from "../features/KnowledgeBrowser";
import { KnowledgeInspector, type KnowledgeDoc, type KnowledgeInspectorActions } from "../features/KnowledgeInspector";
import { PageHeader, Card, EmptyState } from "../index";
import { SkeletonPage } from "../data-display/Skeletons";

/* Knowledge search surface (pages/knowledge.md). A workspace that pairs the
   faceted results browser (filter rail + search + result cards + footer stats)
   with a sticky inspector for the selected result.

   This page is a pure presenter: it holds no demo content. The results and the
   inspected document arrive in `data`, so a workspace with nothing indexed
   renders the empty state rather than someone's invented corpus. The design
   canvas supplies the same shape from `.preview/fixtures/knowledge.ts`. */

const STATES = [
  { id: "default", label: "Default" },
  { id: "documents", label: "Documents tab" },
  { id: "conversations", label: "Conversations tab · Slack chunks" },
  { id: "pages", label: "Pages tab" },
  { id: "pull-requests", label: "Pull requests tab" },
  { id: "single-result", label: "Single result" },
  { id: "many-results", label: "Many results" },
  { id: "inspector-slack", label: "Inspector · Slack thread-chunk" },
  { id: "no-selection", label: "Nothing selected" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No results" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Everything the Knowledge page renders. One object, so an app can build it
    from a single search query plus the selected document. */
export type KnowledgeData = {
  /** Hits for the current query and facets. */
  results: KnowledgeResult[];
  /** The document in the inspector rail. `null` means nothing is selected. */
  doc: KnowledgeDoc | null;
};

/** What the Knowledge page can DO. Search, facets, sort and bookmarks are all
    reads or local view state; the one write this surface offers is watching the
    document in the inspector rail.

    Optional, as always: with no actions the watch toggle keeps its local
    behaviour, which is what the design canvas renders. */
export type KnowledgeActions = KnowledgeInspectorActions & {
  /** Inspect this result. Selection outlives this page — it decides what the
      rail describes and should survive a reload — so the page reports which
      result was picked and the app decides where that lives (a query param, a
      route). Without the handler the feed keeps its own highlight. */
  select?: (args: { id: string }) => void;
};

/** Nothing matched. Derived from the data, not from a state flag, so it is
    true in the real app for exactly the same reason it is true on the canvas. */
function isEmpty(d: KnowledgeData): boolean {
  return !d.results.length;
}

/* Every empty/offline box on this page shares one wrapper, so the "No
   results" and "No document" cards render at the same height (§15). */
function EmptyBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="grid place-items-center py-16">
        <EmptyState title={title}>{children}</EmptyState>
      </div>
    </Card>
  );
}

function Feed({ data, error, mobile, actions }: {
  data: KnowledgeData; error: string | null; mobile: boolean; actions?: KnowledgeActions;
}) {
  if (error) return <EmptyBox title="API offline">{error}</EmptyBox>;
  if (isEmpty(data)) {
    return (
      <EmptyBox title="No results">
        No results match the current filters. Clear a filter or try a different search.
      </EmptyBox>
    );
  }
  /* Selection is only the page's business when something can receive it: with
     a `select` handler the inspected document IS the selection, so the feed is
     told what to highlight and reports every pick. Without one the browser
     keeps its own highlight, which is what the canvas renders (§2). */
  const select = actions?.select;
  return (
    <KnowledgeBrowser
      results={data.results}
      stacked={mobile}
      selectedId={select ? data.doc?.id ?? null : undefined}
      onSelect={select && ((id) => select({ id }))}
    />
  );
}

function Inspector({ data, error, actions }: { data: KnowledgeData; error: string | null; actions?: KnowledgeActions }) {
  // Nothing to inspect at all: the search failed, or it matched nothing.
  if (error || isEmpty(data)) return <EmptyBox title="No document">Nothing to inspect.</EmptyBox>;
  if (!data.doc) return <EmptyBox title="Nothing selected">Select a result to inspect it here.</EmptyBox>;
  return <KnowledgeInspector doc={data.doc} actions={actions} />;
}

function KnowledgePage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<KnowledgeData, KnowledgeActions>) {
  return (
    <PageFrame chrome={chrome} active={navFor("knowledge")} title="Knowledge" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="detail" />
      ) : (
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          eyebrow="Knowledge"
          title="Search the knowledge base"
          description="Every connected source in one index: filter, read the match in context, and inspect the document beside it."
        />
        <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[360]}`}>
          <div className="min-w-0">
            <Feed data={data} error={error} mobile={mobile} actions={actions} />
          </div>
          <div className={mobile ? "min-w-0" : "min-w-0 sticky top-6 self-start"}>
            <Inspector data={data} error={error} actions={actions} />
          </div>
        </div>
      </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<KnowledgeData, KnowledgeActions> = {
  id: "knowledge",
  title: "Knowledge",
  route: "/knowledge",
  component: KnowledgePage,
  states: STATES.map((s) => ({ ...s })),
};
