import { useState, type ReactNode } from "react";
import { Users, UserPlus, ChevronDown, Check, Mail } from "lucide-react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
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
import { Alert } from "../feedback/Alert";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { SettingsMembersTable, type Member } from "../features/SettingsMembersTable";
import {
  LONG_NAME, LONG_SOURCE, LONG_WORD, UNBREAKABLE, MIXED_SCRIPT, HUGE_NUMBER_STR,
  MANY_TAGS, MANY_INITIALS, repeat,
} from "./stress";

/* Settings → Members (pages/settings-members.md). The list variants render the
   SettingsMembersTable feature (members table + invite panel + workspace name +
   GitHub sync + provisioning). The interaction variants (invite open, role
   change, pending resend, remove-confirm, invite sent) render an inline members
   card so every step of the lifecycle can be captured without portalled UI.
   Under the shared settings tab strip. */

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
    <div className={mobile ? "mt-6 flex flex-col gap-5" : "mt-6 grid grid-cols-[minmax(0,1fr)_320px] gap-5"}>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      <aside className="flex min-w-0 flex-col gap-5">{rail}</aside>
    </div>
  );
}

const ROSTER: Member[] = [
  { id: 1, name: "Maya Chen", initials: "MC", email: "maya@team.com", role: "admin", status: "active", joined: "2024-11-03" },
  { id: 2, name: "Devon Park", initials: "DP", email: "devon@team.com", role: "manager", status: "active", joined: "2025-01-18" },
  { id: 3, name: "Priya Nair", initials: "PN", email: "priya@team.com", role: "user", status: "active", joined: "2025-03-22" },
  { id: 4, name: "Sam Okafor", initials: "SO", email: "sam@team.com", role: "user", status: "invited", joined: "2025-06-30" },
];

const MANY: Member[] = [
  ...ROSTER,
  { id: 5, name: "Lena Ford", initials: "LF", email: "lena@team.com", role: "user", status: "active", joined: "2025-02-09" },
  { id: 6, name: "Tomás Rivas", initials: "TR", email: "tomas@team.com", role: "manager", status: "active", joined: "2025-04-14" },
  { id: 7, name: "Aiko Sato", initials: "AS", email: "aiko@team.com", role: "user", status: "active", joined: "2025-05-01" },
  { id: 8, name: "Noah Klein", initials: "NK", email: "noah@team.com", role: "user", status: "invited", joined: "2025-07-02" },
  { id: 9, name: "Grace Hobbs", initials: "GH", email: "grace@team.com", role: "admin", status: "active", joined: "2024-10-20" },
  { id: 10, name: "Omar Farouk", initials: "OF", email: "omar@team.com", role: "user", status: "active", joined: "2025-06-11" },
];

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";
const ROLES = ["admin", "manager", "user"] as const;

/* Inline members card used by the interaction variants — no portalled menus. */
function MembersInline({ variant }: { variant: "invite-open" | "role-change" | "pending" | "invite-sent" | "remove-confirm" }) {
  return (
    <>
      {variant === "invite-sent" && (
        <Alert tone="ok" title="Invitation sent">
          We emailed <span className="font-term">jordan@team.com</span>they appear below with an amber dot until they sign in.
        </Alert>
      )}

      {variant === "invite-open" && (
        <Card title="Invite a teammate" hint="They appear below with an amber dot until they sign in.">
          <div className={FORM_GRID}>
            <Field label="Name"><Input defaultValue="Jordan Lee" placeholder="Jordan Lee" className="w-full" /></Field>
            <Field label="Email"><Input type="email" defaultValue="jordan@team.com" className="w-full" /></Field>
            <Field label="Role">
              <Select defaultValue="user" className="w-full">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary"><Mail size={15} /> Send invite</Button>
            <Button>Cancel</Button>
          </div>
        </Card>
      )}

      <Card variant="flush" title="Members" hint={`${ROSTER.length} people`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 720 }}>
            <thead><tr>{["Member", "Email", "Role", "Status", "Joined", ""].map((h, i) => <th key={i} className={`${thClass} px-4 py-2.5 border-y border-ink/10`} style={i === 5 ? { width: 160 } : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {ROSTER.map((m) => {
                const roleCell = variant === "role-change" && m.id === 2 ? (
                  <div className="relative inline-block">
                    <button className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[4px] border border-biscay-2 bg-paper text-[13px] text-ink">
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
                      ) : variant === "remove-confirm" && m.id === 3 ? (
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
        </div>
      </Card>
    </>
  );
}

/* Extra composition to exercise chip-row / avatar-stack overflow that the
   members table (one avatar + one status chip per row) doesn't reach. */
function StressExtras({ extreme }: { extreme: boolean }) {
  return (
    <Card title={extreme ? UNBREAKABLE : "Team-wide roles, labels, and everyone with access"} hint={extreme ? MIXED_SCRIPT : LONG_SOURCE}>
      <div className="flex items-center gap-3">
        <AvatarGroup people={MANY_INITIALS.map((initials) => ({ initials }))} max={5} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink/60">{extreme ? `${HUGE_NUMBER_STR} ${UNBREAKABLE}` : `${HUGE_NUMBER_STR} members across every region and team`}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(extreme ? [UNBREAKABLE, LONG_WORD, ...MANY_TAGS] : MANY_TAGS).map((t, i) => <Chip key={i} label={t} tone="info" caps />)}
      </div>
    </Card>
  );
}

function StressMembers({ extreme }: { extreme: boolean }) {
  const members: Member[] = extreme
    ? repeat((i) => ({
        id: i + 1,
        name: [UNBREAKABLE, LONG_WORD, MIXED_SCRIPT][i % 3],
        initials: MANY_INITIALS[i % MANY_INITIALS.length],
        email: `${UNBREAKABLE}@${LONG_WORD}.example`,
        role: ["admin", "manager", "user"][i % 3],
        status: i % 2 === 0 ? "active" : "invited",
        joined: "2025-01-01",
      }), 5)
    : repeat((i) => ({
        id: i + 1,
        name: LONG_NAME,
        initials: MANY_INITIALS[i % MANY_INITIALS.length],
        email: `${LONG_WORD}.${i}@${LONG_SOURCE}`,
        role: ["admin", "manager", "user"][i % 3],
        status: i % 2 === 0 ? "active" : "invited",
        joined: "2025-01-01",
      }), 4);
  return (
    <>
      <SettingsMembersTable embedded members={members} workspaceName={extreme ? UNBREAKABLE : LONG_NAME} githubTeam={{ connected: true, team: extreme ? UNBREAKABLE : LONG_SOURCE }} />
      <StressExtras extreme={extreme} />
    </>
  );
}

/* Supporting rail (§11, 320px) — matches the General/Models/Keys/Audit rails. */
function MembersRail() {
  return (
    <>
      <Card title="At a glance" hint="Read only">
        <PropertyList
          items={[
            { label: "Seats used", value: "24 of 50" },
            { label: "Admins", value: "2" },
            { label: "Pending invites", value: "1" },
            { label: "Provisioning", value: "GitHub team sync" },
          ]}
        />
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

function Body({ state }: { state: string }) {
  if (state === "overflow" || state === "stress") return <StressMembers extreme={state === "stress"} />;
  if (state === "error") {
    return (
      <EmptyState icon={<Users size={22} />} title="API offline">
        The member directory is temporarily unavailable. Retrying…
      </EmptyState>
    );
  }
  if (state === "empty") {
    return (
      <EmptyState icon={<Users size={22} />} title="No members yet">
        Invite a teammate to give them access to this workspace.
      </EmptyState>
    );
  }
  if (state === "single") return <SettingsMembersTable embedded members={[ROSTER[0]]} />;
  if (state === "many") return <SettingsMembersTable embedded members={MANY} />;
  if (state === "invite-open" || state === "role-change" || state === "pending" || state === "invite-sent" || state === "remove-confirm") {
    return <MembersInline variant={state} />;
  }
  return <SettingsMembersTable embedded />;
}

function SettingsMembersPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
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
          <SettingsBody mobile={mobile} rail={<MembersRail />}>
            <Body state={state} />
          </SettingsBody>
        </div>
      )}
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "settings-members",
  title: "Settings · Members",
  route: "/settings/members",
  component: SettingsMembersPage,
  states: STATES.map((s) => ({ ...s })),
};
