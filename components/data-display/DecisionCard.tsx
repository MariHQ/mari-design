import type { ReactNode } from "react";
import { Check, ArrowRight, MoreVertical, RefreshCw } from "lucide-react";
import { card } from "../tokens/card";
import { fmtDate, type DateInput } from "../tokens/format";
import { Chip } from "./Chip";
import { Avatar } from "./Avatar";
import { Button } from "../actions/Button";
import { Menu, MenuItem } from "../navigation/Menu";

/* DecisionCard — one row in the decision ledger's timeline: a node marker on a
   spine, then the decision card (statement, context, a superseded-by line, and
   a meta row of source / owners / date / actions). Ratified decisions can host
   an impact strip via the `impact` slot (compose <ImpactPanel />). Ported from
   pages/decisions/DecisionCard.tsx; app state replaced by props/callbacks. */

export type DecisionStatus = "proposed" | "ratified" | "superseded";

const STAMP_LABEL: Record<DecisionStatus, string> = {
  proposed: "Proposed",
  ratified: "Ratified",
  superseded: "Superseded",
};

const STAMP_TONE: Record<DecisionStatus, string> = {
  proposed: "text-clay border-clay/35 bg-clay/[0.07]",
  ratified: "text-moss border-moss/35 bg-moss/[0.07]",
  superseded: "text-ink/50 border-ink/20 bg-ink/[0.04]",
};

const NODE: Record<DecisionStatus, string> = {
  proposed: "border-clay/50 bg-paper text-clay",
  ratified: "border-moss bg-moss text-white",
  superseded: "border-ink/25 bg-flysch text-ink/40",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export type DecisionCardProps = {
  statement: string;
  context?: string;
  status: DecisionStatus;
  /** Marks decisions Mari surfaced from a scan (sparkle before the statement). */
  fresh?: boolean;
  sourceLabel?: string;
  /** Optional source glyph rendered inside the source chip. */
  sourceIcon?: ReactNode;
  /** Owner names — rendered as overlapping avatars from their initials. */
  owners?: string[];
  decidedOn?: DateInput;
  supersededByStatement?: string;
  ratifying?: boolean;
  onRatify?: () => void;
  onSupersede?: () => void;
  /** Override the default action cluster (Ratify / Supersede menu). */
  actions?: ReactNode;
  /** Impact strip — compose <ImpactPanel /> here for ratified decisions. */
  impact?: ReactNode;
  /** Draws the connecting timeline spine below the node (for stacked lists). */
  spine?: boolean;
  className?: string;
};

export function DecisionCard({
  statement, context, status, fresh = false, sourceLabel, sourceIcon,
  owners = [], decidedOn, supersededByStatement, ratifying = false,
  onRatify, onSupersede, actions, impact, spine = true, className = "",
}: DecisionCardProps) {
  const superseded = status === "superseded";
  return (
    <div className={`relative flex gap-4 ${className}`.trim()}>
      <div className="relative flex flex-col items-center">
        {spine && <span className="absolute top-6 bottom-0 w-px bg-ink/12" aria-hidden="true" />}
        <span className={`relative z-10 grid place-items-center w-6 h-6 rounded-full border ${NODE[status]}`} aria-hidden="true">
          {status === "ratified" && <Check size={12} />}
        </span>
      </div>

      <article className={`${card} min-w-0 flex-1 p-4 mb-4 ${superseded ? "opacity-70" : ""}`.trim()}>
        <div className="flex items-start gap-3">
          <h3 className={`min-w-0 flex-1 text-[15px] font-semibold text-ink ${superseded ? "line-through decoration-ink/30" : ""}`.trim()}>
            {fresh && <span title="Found by Mari scan" className="mr-1">✨</span>}
            <q className="not-italic">{statement}</q>
          </h3>
          <span className={`shrink-0 rounded-[3px] border px-1.5 py-[2.5px] font-term text-[10.5px] font-medium uppercase tracking-[0.06em] ${STAMP_TONE[status]}`}>
            {STAMP_LABEL[status]}
          </span>
        </div>

        {context && <p className="mt-1.5 text-[13px] leading-[1.5] text-ink/70">{context}</p>}

        {superseded && supersededByStatement && (
          <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink/60">
            <ArrowRight size={14} className="shrink-0" />
            <span>Superseded by <b className="text-ink/80">{`“${supersededByStatement}”`}</b></span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {sourceLabel && <Chip label={sourceLabel} icon={sourceIcon} />}
          {owners.length > 0 && (
            <span className="flex items-center -space-x-1.5">
              {owners.map((o) => <Avatar key={o} initials={initialsOf(o)} />)}
            </span>
          )}
          {decidedOn && <span className="font-term text-[11px] text-ink/55">Decided {fmtDate(decidedOn)}</span>}
          <span className="ml-auto flex items-center gap-2">
            {actions ?? (
              <>
                {status === "proposed" && onRatify && (
                  <Button variant="success" compact onClick={onRatify} disabled={ratifying}>
                    <Check size={13} /> {ratifying ? "Ratifying…" : "Ratify"}
                  </Button>
                )}
                {status === "ratified" && onSupersede && (
                  <Menu trigger={<Button icon compact aria-label="Decision actions"><MoreVertical size={16} /></Button>}>
                    <MenuItem icon={<RefreshCw size={14} />} onSelect={onSupersede}>Supersede…</MenuItem>
                  </Menu>
                )}
              </>
            )}
          </span>
        </div>

        {impact && <div className="mt-3 border-t border-ink/10 pt-3">{impact}</div>}
      </article>
    </div>
  );
}
