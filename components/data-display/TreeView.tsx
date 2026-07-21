import { useState, type ReactNode } from "react";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { focusRing } from "../tokens/focusRing";

export type TreeNode = { id: string; label: string; icon?: ReactNode; children?: TreeNode[] };

function TreeRow({ node, depth, onSelect, selected }: { node: TreeNode; depth: number; onSelect?: (node: TreeNode) => void; selected?: string }) {
  const hasChildren = Boolean(node.children?.length);
  const [open, setOpen] = useState(depth === 0);
  return (
    <li>
      <div
        className={`flex items-center gap-1.5 h-7 rounded-[4px] text-[13px] cursor-pointer ${selected === node.id ? "bg-flysch text-ink" : "text-ink/80 hover:bg-flysch/60"}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => { if (hasChildren) setOpen((o) => !o); onSelect?.(node); }}
      >
        {hasChildren ? (
          <button
            aria-label={open ? "Collapse" : "Expand"}
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
            className={`grid place-items-center w-4 h-4 shrink-0 text-ink/40 rounded-[2px] ${focusRing}`}
          >
            <ChevronRight size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="shrink-0 text-ink/40" aria-hidden="true">{node.icon ?? (hasChildren ? <Folder size={14} /> : <FileText size={14} />)}</span>
        <span className="truncate">{node.label}</span>
      </div>
      {hasChildren && open && (
        <ul>
          {node.children!.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* Hierarchical disclosure list — doc lineage trees, folder structures.
   No Radix primitive for this; a small recursive expand/collapse component. */
export function TreeView({ data, onSelect, selected }: { data: TreeNode[]; onSelect?: (node: TreeNode) => void; selected?: string }) {
  return (
    <ul role="tree" className="flex flex-col gap-0.5">
      {data.map((node) => <TreeRow key={node.id} node={node} depth={0} onSelect={onSelect} selected={selected} />)}
    </ul>
  );
}
