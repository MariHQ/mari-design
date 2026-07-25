import { useState, type ReactNode } from "react";
import { Users, UserPlus, ChevronDown, Check, Mail } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { SettingsTabs } from "./SettingsTabs";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Avatar } from "../data-display/Avatar";
import { PropertyList } from "../data-display/PropertyList";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Scrollable } from "../data-display/Scrollable";
import { Alert } from "../feedback/Alert";
import { SettingsMembersTable, type Member, type GithubTeamSync, type SettingsMembersActions } from "../features/SettingsMembersTable";
import type { PropertyItem } from "../data-display/PropertyList";

/** What Settings → Members can do. Defined with the table that renders the
    controls and re-exported here, so an app types its handlers off the page. */
export type { SettingsMembersActions };

/* Settings → Members (pages/settings-members.md). Renders the
   SettingsMembersTable feature (members table + invite panel + workspace name +
   GitHub sync + provisioning) under the shared settings tab strip, in every
   state — including the invite and remove steps, which are driven through that
   component's own props rather than by a second copy of it.

   Pure presenter: the roster, the workspace name, the provisioning config and
   the rail summary all arrive in `data`. "No members yet" is derived from the
   roster being empty, never from a flag. */

const STATES = [
  { id: "default", label: "Members list" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "empty", label: "No members yet" },
  { id: "single", label: "Single member" },
  { id: "many", label: "Many members" },
  { id: "invite-open", label: "Invite panel open" },
  { id: "pending", label: "Pending invite" },
  { id: "invite-sent", label: "Invitation sent" },
  { id: "remove-confirm", label: "Remove member (confirm)" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which step of the invite/remove lifecycle to show. An app drives it from
    its own UI state; `none` is the plain list.

    These used to select between the real members table and a static copy of it
    that lived in this file — a second, hand-drawn table whose seven controls
    could not do anything. Every step below is now the REAL table, put into
    that state through its own props, so what the canvas reviews is what ships.

    "role-change" went with the twin: the role cell is a native <select>, and
    the browser draws its open menu. No component can pin that, so the twin was
    depicting a menu the product does not have. */
export type MembersInteraction =
  | "none" | "invite-open" | "pending" | "invite-sent" | "remove-confirm";

/** An invitation being composed, or one just sent. */
export type MemberInvite = { name: string; email: string; role: string };

/** Everything Settings → Members renders. */
export type SettingsMembersData = {
  members: Member[];
  workspaceName: string;
  githubTeam: GithubTeamSync;
  /** Read-only facts in the rail. */
  summary: PropertyItem[];
  interaction: MembersInteraction;
  invite: MemberInvite;
  /** The row the role menu or the remove confirmation is open on. */
  focusMemberId: number | null;
};


/* ── §11 page grid ─────────────────────────────────────────────────────────
   Shared verbatim with the other four Settings pages: one container width, one
   main/rail split, one form-field grid. */
const PAGE = "mx-auto max-w-[1400px] px-5 py-6 sm:px-8";
const FORM_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

function SettingsBody({ mobile, rail, children }: { mobile: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

function MembersRail({ summary }: { summary: PropertyItem[] }) {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList items={summary} />
      </Card>
      <Card title="Roles">
        <ul className="flex flex-col gap-2 text-[12.5px] text-ink/70">
          <li><b className="text-ink">Admin</b> Full access, including billing and deletion.</li>
          <li><b className="text-ink">Manager</b> Curates knowledge and approves reviews.</li>
          <li><b className="text-ink">User</b> Reads and asks; cannot change settings.</li>
        </ul>
      </Card>
    </>
  );
}

/** Nobody in the workspace at all. Derived from the roster, so it is true in
    the real app for exactly the same reason it is true on the canvas. */
function isEmpty(d: SettingsMembersData): boolean {
  return d.members.length === 0;
}

function Body({ data, error, actions, inviteOpen, onInviteOpenChange }: {
  data: SettingsMembersData;
  error: string | null;
  actions?: SettingsMembersActions;
  inviteOpen: boolean;
  onInviteOpenChange: (open: boolean) => void;
}) {
  if (error) {
    return <EmptyState icon={<Users size={22} />} title="API offline">{error}</EmptyState>;
  }
  if (isEmpty(data)) {
    return (
      <EmptyState icon={<Users size={22} />} title="No members yet">
        Invite a teammate to give them access to this workspace.
      </EmptyState>
    );
  }
  return (
    <>
      {data.interaction === "invite-sent" && (
        <Alert tone="ok" title="Invitation sent">
          We emailed <span className="font-term">{data.invite.email}</span>. They appear below with an amber dot
          until they sign in.
        </Alert>
      )}
      <SettingsMembersTable
        embedded
        members={data.members}
        workspaceName={data.workspaceName}
        githubTeam={data.githubTeam}
        actions={actions}
        /* The composer opens from the page header, or because the state under
           review says it is open. */
        inviteOpen={inviteOpen || data.interaction === "invite-open"}
        onInviteOpenChange={onInviteOpenChange}
        confirmRemoveId={data.interaction === "remove-confirm" ? data.focusMemberId : null}
      />
    </>
  );
}

function SettingsMembersPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<SettingsMembersData, SettingsMembersActions>) {
  /* The header owns the "Invite member" button, so it owns whether the
     composer below it is open. Without this the button was decorative: the
     table's own header is hidden when embedded (§2). */
  const [inviteOpen, setInviteOpen] = useState(false);
  return (
    <PageFrame chrome={chrome} active={navFor("settings")} title="Settings" mobile={mobile}>
      {loading ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className={PAGE}>
          <PageHeader
            eyebrow="Settings"
            title="Members"
            description="Manage workspace access, invitations, and provisioning."
            actions={<Button variant="primary" onClick={() => setInviteOpen((v) => !v)}><UserPlus size={15} /> Invite member</Button>}
          />
          <div className="mt-5"><SettingsTabs active="members" onNavigate={chrome?.onNavigate} /></div>
          <SettingsBody mobile={mobile} rail={<MembersRail summary={data.summary} />}>
            <Body data={data} error={error} actions={actions} inviteOpen={inviteOpen} onInviteOpenChange={setInviteOpen} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsMembersData, SettingsMembersActions> = {
  id: "settings-members",
  title: "Settings · Members",
  route: "/settings/members",
  component: SettingsMembersPage,
  states: STATES.map((s) => ({ ...s })),
};
