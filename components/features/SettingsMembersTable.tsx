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
import { Skeleton, SkeletonLine, SkeletonButton, SkeletonCard, SkeletonTable } from "../data-display/Skeleton";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { EmptyState } from "../data-display/EmptyState";
import { Scrollable } from "../data-display/Scrollable";
import { PagerBar, ResultCount, usePaged } from "../data-display/Pagination";
import { fmtDate } from "../tokens/format";
import { GithubMark } from "../icons/marks";
import { Truncate, TruncateInline } from "../data-display/Truncate";

/* Settings — Members table & provisioning ────────────────────────────────
   Manage who can access the workspace: invite teammates, list members with
   inline role editing and removal, edit the workspace name, and configure
   member provisioning (GitHub team sync + a static provisioning card).
   Composes PageHeader, Card, Avatar, Chip, Select, ConfirmButton.
   Source: web/src/pages/settings/Members.tsx. Pure presenter: the roster, the
   workspace name and the GitHub team all arrive as required props; mutations
   are local state (no network). */

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

/** The GitHub team members are auto-provisioned from. */
export type GithubTeamSync = { connected: boolean; team: string };

/** Role ids are lowercase on the wire; the dropdown shows them Capitalized
    (CONVENTIONS.md §7). */
const ROLE_LABEL: Record<string, string> = { admin: "Admin", manager: "Manager", user: "User" };
const roleLabel = (r: Role) => ROLE_LABEL[r] ?? (String(r).charAt(0).toUpperCase() + String(r).slice(1));

export type SettingsMembersTableProps = {
  /** Hide the internal PageHeader when the host page already renders one. */
  embedded?: boolean;
  members: Member[];
  workspaceName: string;
  githubTeam: GithubTeamSync;
  loading?: boolean;
  className?: string;
};

export function SettingsMembersTable({
  members: initialMembers,
  workspaceName,
  githubTeam,
  loading = false,
  embedded = false,
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

  const { sort, onSort, sorted } = useSort(members, {
    member: (m) => m.name,
    email: (m) => m.email,
    role: (m) => roleLabel(m.role),
    joined: (m) => m.joined,
    status: (m) => m.status,
  });

  /* A real workspace has hundreds of members. Rendering them all grew this
     card past 15,000px and buried the provisioning cards below it, so the
     table pages and says how many people there really are (§13, §20). */
  const pager = usePaged(sorted, 12);

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`.trim()} aria-hidden="true">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5"><Skeleton width={180} height={20} /><SkeletonLine w={280} h={11} /></div>
          <SkeletonButton w={130} />
        </div>
        <SkeletonCard lines={1} />
        <SkeletonTable rows={4} cols={6} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <SkeletonCard lines={2} /><SkeletonCard lines={3} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`.trim()}>
      {!embedded && <PageHeader
        title="Admin"
        description={`Manage who can reach ${name}, and how they get in`}
        actions={<Button variant="primary" onClick={() => setInviting((v) => !v)}><UserPlus size={15} /> Invite member</Button>}
      />}

      {inviting && (
        <Card title="Invite a teammate" hint="They appear below with an Invited chip until they sign in.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name"><Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Jordan Lee" className="w-full" /></Field>
            <Field label="Email"><Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="jordan@team.com" className="w-full" /></Field>
            <Field label="Role"><Select value={invRole} onChange={(e) => setInvRole(e.target.value)} className="w-full">{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</Select></Field>
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
          : <div className="flex min-w-0 flex-wrap items-center gap-3"><Truncate className="min-w-0 flex-1 basis-[12rem] font-display text-[20px] font-semibold text-ink">{name}</Truncate>{nameSaved && <span className="shrink-0 font-term text-[11.5px] text-moss">✓ Saved</span>}</div>}
      </Card>

      {/* The row count lives in the result strip below the header, once
          (CONVENTIONS §13), so the hint describes instead of counting. */}
      <Card variant="flush" title="Members" hint="Everyone who can reach this workspace">
        {members.length === 0 ? (
          <EmptyState title="No members yet">Send the first invite to bring someone into this workspace.</EmptyState>
        ) : (
          /* table-fixed so the colgroup widths are binding: with auto layout a
             single unbreakable email collapsed the address column to ~80px and
             stacked it a character at a time. The table keeps its 760px floor
             and scrolls inside this card instead. */
          <>
          <ResultCount from={pager.from} to={pager.to} total={pager.total} noun="members" />
          <Scrollable>
            <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: 760 }}>
              <colgroup>
                <col style={{ width: "24%" }} /><col style={{ width: "22%" }} /><col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <SortHeader label="Member" sortKey="member" sort={sort} onSort={onSort} />
                  <SortHeader label="Email" sortKey="email" sort={sort} onSort={onSort} />
                  <SortHeader label="Role" sortKey="role" sort={sort} onSort={onSort} align="center" />
                  <SortHeader label="Joined" sortKey="joined" sort={sort} onSort={onSort} align="center" />
                  {/* Rows carry a clickable action, so status is second to last. */}
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Actions" sortable={false} />
                </tr>
              </thead>
              <tbody>
                {pager.pageRows.map((m) => (
                  <tr key={m.id} className="border-b border-ink/10 last:border-0 align-top">
                    <td className={tdPad}>
                      <span className="flex items-start gap-2.5">
                        <Avatar initials={m.initials} />
                        <Truncate className="min-w-0 flex-1 text-[13px] font-medium text-ink">{m.name}</Truncate>
                      </span>
                    </td>
                    <td className={tdPad}><Truncate className="text-[13px] text-ink/70">{m.email}</Truncate></td>
                    <td className={`${tdPad} text-center`}>
                      <Select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="h-8 w-full">
                        {roleOptions(m.role).map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </Select>
                    </td>
                    <td className={`${tdPad} text-center font-term text-[12px] text-ink/65`}>{fmtDate(m.joined)}</td>
                    <td className={tdPad}><Chip label={m.status === "invited" ? "Invited" : "Active"} tone={m.status === "invited" ? "attention" : "ok"} dot caps /></td>
                    <td className={`${tdPad} whitespace-nowrap`}><ConfirmButton compact confirmLabel="Remove?" onConfirm={() => remove(m.id)}>Remove</ConfirmButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scrollable>
          {pager.paged && <PagerBar page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} />}
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card icon={<GithubMark size={16} />} title="GitHub team sync" actions={
          ghEditing ? <><Button compact variant="primary" onClick={saveGh}>Save</Button><Button compact onClick={() => { setGhDraft(gh.team); setGhEditing(false); }}>Cancel</Button></>
            : <Button compact onClick={() => { setGhDraft(gh.team); setGhEditing(true); }}>Configure</Button>
        }>
          {ghEditing ? (
            <Field label="Team slug"><Input value={ghDraft} onChange={(e) => setGhDraft(e.target.value)} placeholder="org/team" className="w-full font-term" /></Field>
          ) : (
            <p className="min-w-0 text-[13px] text-ink/70">
              {ghConnected ? <>Members of <TruncateInline className="font-term text-ink">{gh.team}</TruncateInline> are auto-provisioned as they sign in.</> : <span className="text-ink/70">Not connected. Configure a team to auto-provision members.</span>}
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
