import type { ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Shield } from "lucide-react";
import { AuditFindingsChecklist, type AuditFinding } from "../features/AuditFindingsChecklist";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Alert } from "../feedback/Alert";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";

/* Repository Audit (pages/audit.md). An onboarding / re-audit workflow: Mari
   scans a connected repo's docs, localization, authorship, tags and hygiene,
   then walks the user through fixing or dismissing each finding. The findings
   checklist is the page core; a right rail carries run history + "what we scan".
   The prerender canvas walks each finding-kind section, the fixed / fix-all /
   many / hide-resolved variants, the cleared run, and the load/error/empty edges. */

const STATES = [
  { id: "default", label: "Default — full findings" },
  { id: "localization", label: "Section · Localization" },
  { id: "tags", label: "Section · Tags" },
  { id: "authorship", label: "Section · Authorship" },
  { id: "coverage", label: "Section · Coverage" },
  { id: "hygiene", label: "Section · Hygiene" },
  { id: "fixed", label: "A finding fixed" },
  { id: "fix-all", label: "Fix all — section handled" },
  { id: "many", label: "Over threshold — many findings" },
  { id: "hide-resolved", label: "Hide-resolved · mostly handled" },
  { id: "clear", label: "Run cleared — all clear" },
  { id: "loading", label: "Scanning" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No repo connected" },
] as const;

const REPO = "acme/product-docs";

const FINDINGS: AuditFinding[] = [
  { id: 1, kind: "Localization", title: "onboarding.fr.md has no source translation link", detail: "French doc exists but isn't linked to its English source.", fixAction: "link_translation", status: "open" },
  { id: 2, kind: "Localization", title: "pricing.md changed — translations stale", detail: "3 locale copies are older than the source.", fixAction: "translation_task", status: "open" },
  { id: 3, kind: "Tags", title: "api-auth.md is untagged", detail: "No tags — won't surface in filtered search.", fixAction: "apply_tag", fixPayload: { tag: "reference" }, status: "open" },
  { id: 4, kind: "Tags", title: "billing.md missing 'customer-facing'", detail: "Suggested by content classifier.", fixAction: "apply_tag", fixPayload: { suggest: "customer-facing" }, status: "open" },
  { id: 5, kind: "Authorship", title: "Unknown author 'jsmith' on 6 docs", detail: "Git author not mapped to a team member.", fixAction: "invite_member", status: "open" },
  { id: 6, kind: "Coverage", title: "webhooks.md referenced but not indexed", detail: "Linked from 4 docs; never ingested.", fixAction: "ingest", status: "open" },
  { id: 7, kind: "Hygiene", title: "README.md has a broken anchor", detail: "#setup no longer exists.", fixAction: "hygiene_task", status: "open" },
  { id: 8, kind: "Hygiene", title: "changelog.md trailing whitespace", detail: "Cosmetic; safe to auto-fix.", fixAction: "hygiene_task", status: "open" },
];

const MANY: AuditFinding[] = [
  ...FINDINGS,
  { id: 9, kind: "Localization", title: "help.de.md drifted from source", detail: "German copy is 40 commits behind.", fixAction: "translation_task", status: "open" },
  { id: 10, kind: "Tags", title: "sdk-quickstart.md missing 'reference'", detail: "Classifier confidence 0.91.", fixAction: "apply_tag", fixPayload: { suggest: "reference" }, status: "open" },
  { id: 11, kind: "Authorship", title: "Unknown author 'dev-bot' on 3 docs", detail: "CI account committing docs directly.", fixAction: "invite_member", status: "open" },
  { id: 12, kind: "Coverage", title: "migration-guide.md referenced but not indexed", detail: "Linked from the changelog; never ingested.", fixAction: "ingest", status: "open" },
  { id: 13, kind: "Coverage", title: "faq.md is orphaned", detail: "No inbound links; may be dead.", fixAction: "ingest", status: "open" },
  { id: 14, kind: "Hygiene", title: "index.md has duplicate headings", detail: "Two '## Setup' sections.", fixAction: "hygiene_task", status: "open" },
];

const FIXED_MIX: AuditFinding[] = FINDINGS.map((f) =>
  f.id === 3 ? { ...f, status: "fixed" } : f.id === 8 ? { ...f, status: "dismissed" } : f,
);

const FIX_ALL: AuditFinding[] = [
  { id: 3, kind: "Tags", title: "api-auth.md is untagged", detail: "No tags — won't surface in filtered search.", fixAction: "apply_tag", fixPayload: { tag: "reference" }, status: "fixed" },
  { id: 4, kind: "Tags", title: "billing.md missing 'customer-facing'", detail: "Suggested by content classifier.", fixAction: "apply_tag", fixPayload: { suggest: "customer-facing" }, status: "fixed" },
  { id: 10, kind: "Tags", title: "sdk-quickstart.md missing 'reference'", detail: "Classifier confidence 0.91.", fixAction: "apply_tag", fixPayload: { suggest: "reference" }, status: "fixed" },
];

const MOSTLY_HANDLED: AuditFinding[] = FINDINGS.map((f, i) =>
  i < FINDINGS.length - 1 ? { ...f, status: i % 2 === 0 ? "fixed" : "dismissed" } : f,
);

const section = (kind: AuditFinding["kind"]) => MANY.filter((f) => f.kind === kind);

function HistoryRail() {
  return (
    <aside className="hidden w-72 shrink-0 space-y-4 lg:block">
      <Card variant="plain" title="Audit history">
        <ul className="space-y-1.5 text-[12.5px]">
          <li className="rounded-[5px] border border-biscay/30 bg-flysch px-3 py-2">
            <div className="font-medium text-ink">Today · 9:04 AM</div>
            <div className="text-ink/55">8 findings · 1 fixed</div>
          </li>
          <li className="rounded-[5px] px-3 py-2 hover:bg-flysch">
            <div className="font-medium text-ink">Jul 14</div>
            <div className="text-ink/55">12 findings · 12 fixed</div>
          </li>
          <li className="rounded-[5px] px-3 py-2 hover:bg-flysch">
            <div className="font-medium text-ink">Jul 2</div>
            <div className="text-ink/55">First audit · 21 findings</div>
          </li>
        </ul>
      </Card>
      <Card variant="plain" title="What we scan">
        <ul className="space-y-1.5 text-[12.5px] text-ink/70">
          <li>Localization coverage & stale translations</li>
          <li>Tag coverage and classifier suggestions</li>
          <li>Git authorship mapped to members</li>
          <li>Referenced-but-unindexed docs</li>
          <li>Markdown hygiene</li>
        </ul>
      </Card>
    </aside>
  );
}

function withRail(main: ReactNode) {
  return (
    <div className="mt-6 flex items-start gap-6">
      <div className="min-w-0 flex-1">{main}</div>
      <HistoryRail />
    </div>
  );
}

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">The audit service is temporarily unavailable. Retrying…</EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-6">
        <EmptyState title="Connect a repo to begin">
          Link a documentation repository and run your first audit to see findings here.
        </EmptyState>
      </div>
    );
  }
  if (state === "clear") {
    return withRail(
      <EmptyState title="Run cleared 🎉">
        Every finding in this run is fixed or dismissed. Re-audit any time to catch new drift.
      </EmptyState>,
    );
  }
  if (state === "localization") return withRail(<AuditFindingsChecklist repo={REPO} findings={section("Localization")} />);
  if (state === "tags") return withRail(<AuditFindingsChecklist repo={REPO} findings={section("Tags")} />);
  if (state === "authorship") return withRail(<AuditFindingsChecklist repo={REPO} findings={section("Authorship")} />);
  if (state === "coverage") return withRail(<AuditFindingsChecklist repo={REPO} findings={section("Coverage")} />);
  if (state === "hygiene") return withRail(<AuditFindingsChecklist repo={REPO} findings={section("Hygiene")} />);
  if (state === "fixed") return withRail(<AuditFindingsChecklist repo={REPO} findings={FIXED_MIX} />);
  if (state === "fix-all") return withRail(<AuditFindingsChecklist repo={REPO} findings={FIX_ALL} />);
  if (state === "many") return withRail(<AuditFindingsChecklist repo={REPO} findings={MANY} />);
  if (state === "hide-resolved") {
    return withRail(
      <div className="space-y-4">
        <Alert tone="info" title="Hide resolved is on">
          Fixed and dismissed findings are collapsed — only what still needs attention shows.
        </Alert>
        <AuditFindingsChecklist repo={REPO} findings={MOSTLY_HANDLED} />
      </div>,
    );
  }
  return withRail(<AuditFindingsChecklist repo={REPO} findings={FINDINGS} />);
}

function AuditPage({ state = "default", mobile = false }: PageProps) {
  const subline =
    state === "loading" ? "Scanning github · " + REPO + "…"
    : state === "empty" ? "Connect a repo to begin."
    : "github · " + REPO + " · last audit Jul 21, 9:04 AM · 8 findings, 1 fixed";
  if (state === "loading") {
    return (
      <PageFrame active={navFor("audit")} title="Repository audit" mobile={mobile}>
        <SkeletonPage variant="list" />
      </PageFrame>
    );
  }
  return (
    <PageFrame active={navFor("audit")} title="Repository audit" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-moss"><Shield size={26} /></span>}
          eyebrow="Onboarding"
          title={"Repository audit — " + REPO}
          description={subline}
          actions={<Button variant="primary">{state === "empty" ? "Run first audit" : "Re-audit"}</Button>}
        />
        <Body state={state} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "audit",
  title: "Repository Audit",
  route: "/audit",
  component: AuditPage,
  states: STATES.map((s) => ({ ...s })),
};
