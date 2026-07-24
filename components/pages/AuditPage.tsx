import type { ReactNode } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Shield } from "lucide-react";
import { AuditFindingsChecklist, type AuditFinding } from "../features/AuditFindingsChecklist";
import { PageHeader } from "../layout/PageHeader";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Alert } from "../feedback/Alert";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Chip } from "../index";
import { AvatarGroup } from "../index";
import { Breadcrumb } from "../index";

/* Repository Audit (pages/audit.md). An onboarding / re-audit workflow: Mari
   scans a connected repo's docs, localization, authorship, tags and hygiene,
   then walks the user through fixing or dismissing each finding. The findings
   checklist is the page core; a right rail carries run history + "what we scan".

   This page is a pure presenter. It holds no demo content: the repo, the run
   history, the findings and the copy all arrive in `data`, and both empty
   shapes are derived from it — no repo connected is "connect a repo", a
   connected repo with no findings left is "run cleared". The canvas supplies
   the same shape from `.preview/fixtures/audit.ts`. */

const STATES = [
  { id: "default", label: "Default: full findings" },
  { id: "localization", label: "Section · Localization" },
  { id: "tags", label: "Section · Tags" },
  { id: "authorship", label: "Section · Authorship" },
  { id: "coverage", label: "Section · Coverage" },
  { id: "hygiene", label: "Section · Hygiene" },
  { id: "fixed", label: "A finding fixed" },
  { id: "fix-all", label: "Fix all: section handled" },
  { id: "many", label: "Over threshold: many findings" },
  { id: "hide-resolved", label: "Hide-resolved · mostly handled" },
  { id: "clear", label: "Run cleared: all clear" },
  { id: "loading", label: "Scanning" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No repo connected" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** One entry in the audit-history rail. */
export type AuditRun = { label: string; detail: string; current?: boolean };

/** A supporting card carrying long contributor/label content. Only the
    long-text states have one, which is why it is nullable. */
export type AuditExtras = {
  title: string;
  crumbs: string[];
  tags: string[];
  people: string[];
  avatarMax: number;
};

/** Everything the Repository audit page renders. */
export type AuditData = {
  /** The audited repository, e.g. "acme/product-docs". Empty = none connected,
      which is what makes the "connect a repo" state true. */
  repo: string;
  provider: string;
  /** When the last run happened, already formatted. */
  ranAt: string;
  /** The page header's supporting line. */
  summary: string;
  findings: AuditFinding[];
  /** People an unmapped git author can be mapped to. */
  members: { id: number; name: string }[];
  /** A banner above the checklist (e.g. "hide resolved is on"). */
  banner: { title: string; body: string } | null;
  history: AuditRun[];
  /** The "what we scan" list in the rail. */
  scans: string[];
  extras: AuditExtras | null;
};

function Extras({ extras }: { extras: AuditExtras }) {
  return (
    <Card variant="plain" title={extras.title}>
      <div className="space-y-3">
        <Breadcrumb items={extras.crumbs.map((label) => ({ label }))} />
        <div className="flex flex-wrap gap-1.5">
          {extras.tags.map((t, i) => <Chip key={i} label={t} tone="info" />)}
        </div>
        <AvatarGroup people={extras.people.map((initials) => ({ initials }))} max={extras.avatarMax} />
      </div>
    </Card>
  );
}

function HistoryRail({ history, scans }: { history: AuditRun[]; scans: string[] }) {
  return (
    <aside className="flex min-w-0 flex-col gap-5">
      <Card variant="plain" title="Audit history">
        <ul className="space-y-1.5 text-[12.5px]">
          {history.map((r) => (
            <li
              key={r.label}
              className={r.current
                ? "rounded-[5px] border border-biscay/30 bg-flysch px-3 py-2"
                : "rounded-[5px] px-3 py-2 hover:bg-flysch"}
            >
              <div className="font-medium text-ink">{r.label}</div>
              <div className="text-ink/65">{r.detail}</div>
            </li>
          ))}
        </ul>
      </Card>
      <Card variant="plain" title="What we scan">
        <ul className="space-y-1.5 text-[12.5px] text-ink/70">
          {scans.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </Card>
    </aside>
  );
}

function withRail(main: ReactNode, rail: ReactNode, mobile: boolean) {
  return (
    /* §11 two-column split: main column minmax(0,1fr) + standard 320px rail.
       Mobile, and any window too narrow to hold both, collapses to one column
       with the rail below the main content. */
    <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 items-start ${SPLIT[320]}`}>
      <div className="min-w-0">{main}</div>
      {rail}
    </div>
  );
}

/** No repository connected at all: there is nothing to audit yet. Derived from
    the data, so it is true in the real app for the same reason it is true on
    the canvas. */
const noRepo = (d: AuditData) => !d.repo;

function Body({ data, error, mobile }: { data: AuditData; error: string | null; mobile: boolean }) {
  if (error) {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">{error}</EmptyState>
      </div>
    );
  }
  if (noRepo(data)) {
    return (
      <div className="mt-6">
        <EmptyState title="Connect a repo to begin">
          Link a documentation repository and run your first audit to see findings here.
        </EmptyState>
      </div>
    );
  }

  const rail = <HistoryRail history={data.history} scans={data.scans} />;

  /* A connected repo whose run has nothing left in it. Same derivation rule:
     the checklist has no rows, so there is nothing to check off. */
  if (!data.findings.length) {
    return withRail(
      <EmptyState title="Run cleared 🎉">
        Every finding in this run is fixed or dismissed. Re-audit any time to catch new drift.
      </EmptyState>,
      rail,
      mobile,
    );
  }

  const checklist = (
    <AuditFindingsChecklist
      provider={data.provider}
      repo={data.repo}
      ranAt={data.ranAt}
      members={data.members}
      findings={data.findings}
    />
  );

  if (!data.banner && !data.extras) return withRail(checklist, rail, mobile);

  return withRail(
    <div className="flex flex-col gap-5">
      {data.banner && (
        <Alert tone="info" title={data.banner.title}>{data.banner.body}</Alert>
      )}
      {data.extras && <Extras extras={data.extras} />}
      {checklist}
    </div>,
    rail,
    mobile,
  );
}

function AuditPage({ data, loading = false, error = null, mobile = false }: PageProps<AuditData>) {
  const actions = <Button variant="primary">{noRepo(data) ? "Run first audit" : "Re-audit"}</Button>;
  if (loading) {
    return (
      <PageFrame active={navFor("audit")} title="Repository audit" mobile={mobile}>
        <SkeletonPage variant="list" />
      </PageFrame>
    );
  }
  return (
    <PageFrame active={navFor("audit")} title="Repository audit" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-moss"><Shield size={26} /></span>}
          eyebrow="Onboarding"
          title={data.repo ? `Repository audit, ${data.repo}` : "Repository audit"}
          description={data.summary}
          actions={mobile ? undefined : actions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <Body data={data} error={error} mobile={mobile} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule<AuditData> = {
  id: "audit",
  title: "Repository Audit",
  route: "/audit",
  component: AuditPage,
  states: STATES.map((s) => ({ ...s })),
};
