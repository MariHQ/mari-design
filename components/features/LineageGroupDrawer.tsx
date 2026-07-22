import { useMemo, useState } from "react";
import { ChevronsUpDown, Layers } from "lucide-react";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { Field } from "../forms/Field";
import { SectionLabel } from "../forms/SectionLabel";
import { GithubMark } from "../icons";
import { fmtDate } from "../tokens/format";
import { SkeletonCircle, SkeletonLine, SkeletonChip, SkeletonText, SkeletonList } from "../data-display/Skeleton";
import {
  LgDrawerShell, ConnectionRow, groupParts, groupKindWord,
  DEMO_EDGES, type LNode, type LEdge,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage group (roll-up) drawer (feature: lineage-group-drawer)

   The macro-node counterpart to the node drawer. When a roll-up macro node
   (one card standing in for a whole gh:<repo>:<kind> bucket, e.g. "89 commits ·
   MariHQ/web") is tapped, this drawer summarizes the group and offers the
   expand/collapse affordance plus a jump list of the top members (ranked by
   degree). Same non-modal shell. Standalone with a baked-in demo bucket.
   ──────────────────────────────────────────────────────────────────────── */

export type LineageGroupDrawerProps = {
  /** The roll-up bucket id, e.g. "gh:MariHQ/web:commits". */
  groupId?: string;
  /** Total members in the bucket (may exceed what the demo lists). */
  totalMembers?: number;
  members?: LNode[];
  edges?: LEdge[];
  onSelectMember?: (id: string) => void;
  onClose?: () => void;
  /** Render a content-shaped skeleton silhouette instead of the drawer body. */
  loading?: boolean;
  className?: string;
};

/** A baked-in set of commit members for the demo bucket. */
const DEMO_MEMBERS: LNode[] = [
  { id: "c1", source: "github", title: "fix: enforce free-tier cap per workspace", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Dev R", date: "2026-07-19", inbound: 4 },
  { id: "c2", source: "github", title: "refactor billing plan resolver", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Dev R", date: "2026-07-18", inbound: 3 },
  { id: "c3", source: "github", title: "add Q3 pricing constants", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Mia M", date: "2026-07-16", inbound: 2 },
  { id: "c4", source: "github", title: "docs: sync FAQ with new tiers", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Sam L", date: "2026-07-14", inbound: 2 },
  { id: "c5", source: "github", title: "test: billing edge cases", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Dev R", date: "2026-07-12", inbound: 1 },
  { id: "c6", source: "github", title: "chore: bump stripe sdk", meta: "commit", icon: "github", docKind: "commit", group: "gh:MariHQ/web:commits", x: 0, y: 0, owner: "Jo S", date: "2026-07-09", inbound: 0 },
];

export function LineageGroupDrawer({
  groupId = "gh:MariHQ/web:commits", totalMembers = 42, members = DEMO_MEMBERS,
  edges = DEMO_EDGES, onSelectMember, onClose, loading = false, className = "",
}: LineageGroupDrawerProps) {
  const { repo, kind } = groupParts(groupId);
  const [isOpen, setIsOpen] = useState(false);

  const degreeOf = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  const ranked = useMemo(
    () => [...members].sort((a, b) => (b.inbound ?? 0) - (a.inbound ?? 0) || (b.date ?? "").localeCompare(a.date ?? "")),
    [members],
  );
  const visibleCount = members.length; // in the demo, all listed members pass filters
  const kindWord = groupKindWord(kind, totalMembers);

  if (loading) {
    return (
      <LgDrawerShell
        className={className}
        onClose={onClose}
        icon={<SkeletonCircle size={19} />}
        title={<SkeletonLine w="60%" h={14} />}
        pills={<><SkeletonChip w={90} /><SkeletonChip w={72} /></>}
      >
        <div className="mb-3"><SkeletonLine w="45%" h={12} /></div>
        <SkeletonText lines={3} />
        <div className="mt-4"><SkeletonList rows={5} /></div>
      </LgDrawerShell>
    );
  }

  return (
    <LgDrawerShell
      className={className}
      onClose={onClose}
      icon={<GithubMark size={19} />}
      title={`${totalMembers} ${kindWord}`}
      pills={
        <>
          <Chip label={repo} tone="neutral" />
          <Chip label="Rolled up" tone="neutral" icon={<Layers size={11} />} />
          {visibleCount !== totalMembers && <Chip label={`${visibleCount} match filters`} tone="attention" />}
        </>
      }
      footer={
        <Button compact onClick={() => setIsOpen((o) => !o)}>
          <ChevronsUpDown size={13} /> {isOpen ? "Collapse group" : "Expand group"}
        </Button>
      }
    >
      <SectionLabel>Group</SectionLabel>
      <div className="mt-1">
        <Field label="Repository">{repo}</Field>
        <Field label="Kind">{groupKindWord(kind, 2)}</Field>
        <Field label="Members">{totalMembers}</Field>
        <Field label="Matching filters">{visibleCount}</Field>
      </div>

      <div className="mt-4">
        <SectionLabel>Top members (by connections)</SectionLabel>
        <div className="mt-1.5">
          {ranked.slice(0, 8).map((m) => (
            <ConnectionRow
              key={m.id}
              rel="references"
              dir="out"
              title={m.title}
              subline={[m.owner, m.date ? fmtDate(m.date) : null, `${degreeOf.get(m.id) ?? m.inbound ?? 0} link${(m.inbound ?? 0) === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
              onSelect={() => onSelectMember?.(m.id)}
            />
          ))}
        </div>
      </div>
    </LgDrawerShell>
  );
}
