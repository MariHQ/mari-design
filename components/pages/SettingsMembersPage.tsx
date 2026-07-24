import { useState, type ReactNode } from "react";
import { Users, UserPlus, ChevronDown, Check, Mail } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor, SPLIT } from "./PageFrame";
import { Tabs, type TabOption } from "../navigation/Tabs";
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
import { SettingsMembersTable, type Member, type GithubTeamSync } from "../features/SettingsMembersTable";
import type { PropertyItem } from "../data-display/PropertyList";

/* Settings → Members (pages/settings-members.md). The list variants render the
   SettingsMembersTable feature (members table + invite panel + workspace name +
   GitHub sync + provisioning). The interaction variants (invite open, role
   change, pending resend, remove-confirm, invite sent) render an inline members
   card so every step of the lifecycle can be captured without portalled UI.
   Under the shared settings tab strip.

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
  { id: "role-change", label: "Role change (menu)" },
  { id: "pending", label: "Pending invite" },
  { id: "invite-sent", label: "Invitation sent" },
  { id: "remove-confirm", label: "Remove member (confirm)" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** Which inline lifecycle step the members card is showing. An app drives it
    from its own UI state; `none` is the plain list. */
export type MembersInteraction =
  | "none" | "invite-open" | "role-change" | "pending" | "invite-sent" | "remove-confirm";

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

type SettingsTab =
  | "general" | "members" | "models" | "sources" | "api-keys" | "audit" | "design";

const SETTINGS_TABS: TabOption<SettingsTab>[] = [
  { id: "general", label: "General" },
  { id: "members", label: "Members" },
  { id: "models", label: "Models" },
  { id: "sources", label: "Sources" },
  { id: "api-keys", label: "API keys" },
  { id: "audit", label: "Audit log" },
  { id: "design", label: "Design & brand" },
];

function SettingsTabs({ active }: { active: SettingsTab }) {
  const [value, setValue] = useState<SettingsTab>(active);
  return (
    <Tabs
      ariaLabel="Workspace settings"
      variant="underline"
      options={SETTINGS_TABS}
      value={value}
      onChange={setValue}
    />
  );
}

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

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";
const ROLES = ["admin", "manager", "user"] as const;

/* Inline members card used by the interaction variants — no portalled menus. */
function MembersInline({ data }: { data: SettingsMembersData }) {
  const { interaction: variant, members, invite, focusMemberId } = data;
  return (
    <>
      {variant === "invite-sent" && (
        <Alert tone="ok" title="Invitation sent">
          We emailed <span className="font-term">{invite.email}</span>they appear below with an amber dot until they sign in.
        </Alert>
      )}

      {variant === "invite-open" && (
        <Card title="Invite a teammate" hint="They appear below with an amber dot until they sign in.">
          <div className={FORM_GRID}>
            <Field label="Name"><Input defaultValue={invite.name} placeholder="Jordan Lee" className="w-full" /></Field>
            <Field label="Email"><Input type="email" defaultValue={invite.email} className="w-full" /></Field>
            <Field label="Role">
              <Select defaultValue={invite.role} className="w-full">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary"><Mail size={15} /> Send invite</Button>
            <Button>Cancel</Button>
          </div>
        </Card>
      )}

      <Card variant="flush" title="Members" hint={`${members.length} people`}>
        <Scrollable>
          <table className="w-full text-left border-collapse" style={{ minWidth: 720 }}>
            <thead><tr>{["Member", "Email", "Role", "Status", "Joined", ""].map((h, i) => <th key={i} className={`${thClass} px-4 py-2.5 border-y border-ink/10`} style={i === 5 ? { width: 160 } : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {members.map((m) => {
                const roleCell = variant === "role-change" && m.id === focusMemberId ? (
                  /* w-32 matches the menu below it, so the open menu sits inside
                     the cell's own box instead of spilling out of the table. */
                  <div className="relative inline-block w-32">
                    <button className="inline-flex w-full items-center justify-between gap-1.5 h-8 px-2.5 rounded-[4px] border border-biscay-2 bg-paper text-[13px] text-ink">
                      {m.role} <ChevronDown size={13} className="text-ink/65" />
                    </button>
                    {/* inline (non-portal) menu depiction */}
                    <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-32 rounded-[6px] border border-ink/15 bg-paper p-1 shadow-md">
                      {ROLES.map((r) => (
                        <div key={r} className={`flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-[13px] ${r === "admin" ? "bg-flysch text-ink" : "text-ink/85"}`}>
                          {r}{r === m.role && <Check size={13} className="text-biscay-2" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Select value={m.role} className="h-8" onChange={() => {}}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
                );
                const pendingRow = (variant === "pending" || variant === "invite-sent") && m.status === "invited";
                return (
                  <tr key={m.id} className={`border-b border-ink/10 last:border-0 ${pendingRow ? "bg-clay/[0.05]" : ""}`}>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2.5"><Avatar initials={m.initials} /><span className="text-[13px] font-medium text-ink">{m.name}</span></span></td>
                    <td className="px-4 py-3 text-[13px] text-ink/70">{m.email}</td>
                    <td className="px-4 py-3">{roleCell}</td>
                    <td className="px-4 py-3"><Chip label={m.status === "invited" ? "Invited" : "Active"} tone={m.status === "invited" ? "attention" : "ok"} dot caps /></td>
                    <td className="px-4 py-3 font-term text-[12px] text-ink/60">{m.joined}</td>
                    <td className="px-4 py-3">
                      {pendingRow ? (
                        <span className="inline-flex gap-1.5">
                          <Button compact>Resend</Button>
                          <Button compact variant="danger">Revoke</Button>
                        </span>
                      ) : variant === "remove-confirm" && m.id === focusMemberId ? (
                        <Button compact variant="danger">Remove?</Button>
                      ) : (
                        <Button compact>Remove</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Scrollable>
      </Card>
    </>
  );
}

/* Supporting rail (§11, 320px) — matches the General/Models/Keys/Audit rails. */
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

function Body({ data, error }: { data: SettingsMembersData; error: string | null }) {
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
  if (data.interaction !== "none") return <MembersInline data={data} />;
  return (
    <SettingsMembersTable
      embedded
      members={data.members}
      workspaceName={data.workspaceName}
      githubTeam={data.githubTeam}
    />
  );
}

function SettingsMembersPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<SettingsMembersData>) {
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
            actions={<Button variant="primary"><UserPlus size={15} /> Invite member</Button>}
          />
          <div className="mt-5"><SettingsTabs active="members" /></div>
          <SettingsBody mobile={mobile} rail={<MembersRail summary={data.summary} />}>
            <Body data={data} error={error} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule<SettingsMembersData> = {
  id: "settings-members",
  title: "Settings · Members",
  route: "/settings/members",
  component: SettingsMembersPage,
  states: STATES.map((s) => ({ ...s })),
};
