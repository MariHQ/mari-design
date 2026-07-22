import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "../layout/PageHeader";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Field } from "../forms/Field";
import { Avatar } from "../data-display/Avatar";
import { Chip } from "../data-display/Chip";
import { GithubMark } from "../icons/marks";

/* Settings — Members table & provisioning ────────────────────────────────
   Manage who can access the workspace: invite teammates, list members with
   inline role editing and removal, edit the workspace name, and configure
   member provisioning (GitHub team sync + a static provisioning card).
   Composes PageHeader, Card, Avatar, Chip, Select, ConfirmButton.
   Source: web/src/pages/settings/Members.tsx. Standalone with demo data —
   all mutations are local state (no network). */

const ROLES = ["admin", "manager", "user"] as const;
type Role = (typeof ROLES)[number] | string;

export type Member = {
  id: number;
  name: string;
  initials: string;
  email: string;
  role: Role;
  status: string;
  joined: string;
};

const DEMO_MEMBERS: Member[] = [
  { id: 1, name: "Maya Chen", initials: "MC", email: "maya@team.com", role: "admin", status: "active", joined: "2024-11-03" },
  { id: 2, name: "Devon Park", initials: "DP", email: "devon@team.com", role: "manager", status: "active", joined: "2025-01-18" },
  { id: 3, name: "Priya Nair", initials: "PN", email: "priya@team.com", role: "user", status: "active", joined: "2025-03-22" },
  { id: 4, name: "Sam Okafor", initials: "SO", email: "sam@team.com", role: "user", status: "invited", joined: "2025-06-30" },
];

const thClass = "font-term font-medium text-[11px] uppercase tracking-[0.08em] text-ink/60";

export type SettingsMembersTableProps = {
  members?: Member[];
  workspaceName?: string;
  githubTeam?: { connected: boolean; team: string };
  className?: string;
};

export function SettingsMembersTable({
  members: initialMembers = DEMO_MEMBERS,
  workspaceName = "Acme Data Platform",
  githubTeam = { connected: true, team: "acme/data-eng" },
  className = "",
}: SettingsMembersTableProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviting, setInviting] = useState(false);
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<Role>("user");
  const [sending, setSending] = useState(false);

  const [name, setName] = useState(workspaceName);
  const [nameDraft, setNameDraft] = useState(workspaceName);
  const [editingName, setEditingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [gh, setGh] = useState(githubTeam);
  const [ghDraft, setGhDraft] = useState(githubTeam.team);
  const [ghEditing, setGhEditing] = useState(false);
  const ghConnected = gh.connected && Boolean(gh.team);

  const sendInvite = () => {
    if (!invName.trim() || !invEmail.trim()) return;
    setSending(true);
    setTimeout(() => {
      const initials = invName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      setMembers((m) => [...m, { id: Math.max(0, ...m.map((x) => x.id)) + 1, name: invName.trim(), initials, email: invEmail.trim(), role: invRole, status: "invited", joined: new Date().toISOString().slice(0, 10) }]);
      setInvName(""); setInvEmail(""); setInvRole("user"); setInviting(false); setSending(false);
    }, 500);
  };

  const changeRole = (id: number, role: Role) => setMembers((m) => m.map((x) => (x.id === id ? { ...x, role } : x)));
  const remove = (id: number) => setMembers((m) => m.filter((x) => x.id !== id));

  const saveName = () => { setName(nameDraft); setEditingName(false); setNameSaved(true); setTimeout(() => setNameSaved(false), 1600); };
  const saveGh = () => { setGh({ connected: true, team: ghDraft }); setGhEditing(false); };

  const roleOptions = (r: Role): Role[] => (ROLES.includes(r as never) ? [...ROLES] : [r, ...ROLES]);

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      <PageHeader
        title="Members & roles"
        description={`Manage access to ${name}`}
        actions={<Button variant="primary" onClick={() => setInviting((v) => !v)}><UserPlus size={15} /> Invite member</Button>}
      />

      {inviting && (
        <Card title="Invite a teammate" hint="They appear below with an amber dot until they sign in.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name"><Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Jordan Lee" className="w-full" /></Field>
            <Field label="Email"><Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="jordan@team.com" className="w-full" /></Field>
            <Field label="Role"><Select value={invRole} onChange={(e) => setInvRole(e.target.value)} className="w-full">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" disabled={sending || !invName.trim() || !invEmail.trim()} onClick={sendInvite}>{sending ? "Sending…" : "Send invite"}</Button>
            <Button onClick={() => setInviting(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card eyebrow="Workspace name" actions={
        editingName ? (
          <>
            <Button compact variant="primary" onClick={saveName}>Save</Button>
            <Button compact onClick={() => { setNameDraft(name); setEditingName(false); }}>Cancel</Button>
          </>
        ) : <Button compact onClick={() => { setNameDraft(name); setEditingName(true); }}>Edit</Button>
      }>
        {editingName
          ? <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="w-full max-w-[360px]" />
          : <div className="flex items-center gap-3"><span className="font-display text-[20px] font-semibold text-ink">{name}</span>{nameSaved && <span className="font-term text-[11.5px] text-moss">✓ Saved</span>}</div>}
      </Card>

      <Card variant="flush" title="Members" hint={`${members.length} people`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 720 }}>
            <thead><tr>{["Member", "Email", "Role", "Status", "Joined", ""].map((h, i) => <th key={i} className={`${thClass} px-4 py-2.5 border-y border-ink/10`} style={i === 5 ? { width: 140 } : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2.5"><Avatar initials={m.initials} /><span className="text-[13px] font-medium text-ink">{m.name}</span></span></td>
                  <td className="px-4 py-3 text-[13px] text-ink/70">{m.email}</td>
                  <td className="px-4 py-3"><Select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="h-8">{roleOptions(m.role).map((r) => <option key={r} value={r}>{r}</option>)}</Select></td>
                  <td className="px-4 py-3"><Chip label={m.status === "invited" ? "Invited" : "Active"} tone={m.status === "invited" ? "attention" : "ok"} dot caps /></td>
                  <td className="px-4 py-3 font-term text-[12px] text-ink/60">{m.joined}</td>
                  <td className="px-4 py-3"><ConfirmButton compact confirmLabel="Remove?" onConfirm={() => remove(m.id)}>Remove</ConfirmButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {members.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-ink/55">No members yet — send the first invite.</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card icon={<GithubMark size={16} />} title="GitHub team sync" actions={
          ghEditing ? <><Button compact variant="primary" onClick={saveGh}>Save</Button><Button compact onClick={() => { setGhDraft(gh.team); setGhEditing(false); }}>Cancel</Button></>
            : <Button compact onClick={() => { setGhDraft(gh.team); setGhEditing(true); }}>Configure</Button>
        }>
          {ghEditing ? (
            <Field label="Team slug"><Input value={ghDraft} onChange={(e) => setGhDraft(e.target.value)} placeholder="org/team" className="w-full font-term" /></Field>
          ) : (
            <p className="text-[13px] text-ink/70">
              {ghConnected ? <>Members of <span className="font-term text-ink">{gh.team}</span> are auto-provisioned as they sign in.</> : <span className="text-ink/45">Not connected — configure a team to auto-provision members.</span>}
            </p>
          )}
        </Card>

        <Card title="Provisioning">
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-center justify-between"><span className="text-[13px] text-ink/80">Manual invites</span><Chip label="On" tone="ok" caps /></li>
            <li className="flex items-center justify-between"><span className="text-[13px] text-ink/80">GitHub team</span><Chip label={ghConnected ? "Connected" : "Off"} tone={ghConnected ? "ok" : "neutral"} caps /></li>
            <li className="flex items-center justify-between"><span className="text-[13px] text-ink/80">SCIM</span><Chip label="Enterprise" tone="info" caps /></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
