import { useState } from "react";
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
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Alert } from "../feedback/Alert";
import { SettingsMembersTable, type Member } from "../features/SettingsMembersTable";

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
      className="mb-5"
    />
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
    <div className="flex flex-col gap-5">
      {variant === "invite-sent" && (
        <Alert tone="ok" title="Invitation sent">
          We emailed <span className="font-term">jordan@team.com</span> — they appear below with an amber dot until they sign in.
        </Alert>
      )}

      {variant === "invite-open" && (
        <Card title="Invite a teammate" hint="They appear below with an amber dot until they sign in.">
          <div className="grid gap-3 sm:grid-cols-3">
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
                      {m.role} <ChevronDown size={13} className="text-ink/50" />
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
    </div>
  );
}

function Body({ state }: { state: string }) {
  if (state === "error") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Users size={22} />} title="API offline">
          The member directory is temporarily unavailable. Retrying…
        </EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-5">
        <EmptyState icon={<Users size={22} />} title="No members yet">
          Invite a teammate to give them access to this workspace.
        </EmptyState>
      </div>
    );
  }
  if (state === "single") return <SettingsMembersTable members={[ROSTER[0]]} />;
  if (state === "many") return <SettingsMembersTable members={MANY} />;
  if (state === "invite-open" || state === "role-change" || state === "pending" || state === "invite-sent" || state === "remove-confirm") {
    return <MembersInline variant={state} />;
  }
  return <SettingsMembersTable />;
}

function SettingsMembersPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("settings")} title="Settings" mobile={mobile}>
      {state === "loading" ? (
        <SkeletonPage variant="settings" />
      ) : (
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <PageHeader
            eyebrow="Settings"
            title="Members"
            description="Manage workspace access, invitations, and provisioning."
            actions={<Button variant="primary"><UserPlus size={15} /> Invite member</Button>}
          />
          <div className="mt-5" />
          <SettingsTabs active="members" />
          <Body state={state} />
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
