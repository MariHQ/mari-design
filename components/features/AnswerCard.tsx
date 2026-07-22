import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { StatusChip, Chip, type ChipStatus } from "../data-display/Chip";
import { Avatar } from "../data-display/Avatar";
import { Sparkline } from "../data-display/Sparkline";
import { SourceMark } from "../icons/marks";
import { fmtDate } from "../tokens/format";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip } from "../data-display/Skeleton";

/* AnswerCard — the unit of the Answers ledger: one curated, human-approved
   answer that bots serve verbatim. Shows the question, the answer body
   (clamped when long), lifecycle status, owner, the channels it serves, its
   source chips, and — for approved answers — a served-per-week count with a
   sparkline. Supports inline edit, approve/retire, and per-channel serving
   toggles. Standalone with a baked demo answer. */

type AnswerStatus = "approved" | "draft" | "retired";
const CHANNELS = ["slack-bot", "support-widget", "docs-site"] as const;
type Channel = (typeof CHANNELS)[number];
const CHANNEL_LABEL: Record<Channel, string> = { "slack-bot": "Slack bot", "support-widget": "Support widget", "docs-site": "Docs site" };

type Answer = {
  id: number;
  question: string;
  answer: string;
  status: AnswerStatus;
  owner: string;
  channels: Channel[];
  sources: { source: string; title: string }[];
  served: number;
  spark: number[];
  updated: string;
};

const DEMO: Answer = {
  id: 1,
  question: "How long do sessions last before they expire?",
  answer: "Sessions are 30-day rolling tokens — each request within the window extends them. Signing in on a new device revokes the oldest session once you pass the five-device cap, and signing out revokes the current session immediately. Admins can force-revoke every session for a member from the members table.",
  status: "approved",
  owner: "Priya Nair",
  channels: ["slack-bot", "docs-site"],
  sources: [{ source: "docs", title: "Sign-in and session model" }, { source: "notion", title: "Auth overview" }],
  served: 1284,
  spark: [4, 6, 5, 9, 8, 12, 11, 15, 14, 18],
  updated: "2026-07-16",
};

function initials(name: string) { return name.split(" ").map((w) => w[0]).slice(0, 2).join(""); }

export type AnswerCardProps = {
  answer?: Answer;
  loading?: boolean;
  className?: string;
};

export function AnswerCard({ answer: initial = DEMO, loading = false, className = "" }: AnswerCardProps) {
  const [a, setA] = useState<Answer>(initial);
  const [editing, setEditing] = useState(false);
  const [editQ, setEditQ] = useState(a.question);
  const [editA, setEditA] = useState(a.answer);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const long = a.answer.length > 190;
  const approved = a.status === "approved";

  const startEdit = () => { setEditQ(a.question); setEditA(a.answer); setEditing(true); };
  const saveEdit = () => {
    if (!editQ.trim() || !editA.trim()) return;
    setBusy("save");
    window.setTimeout(() => { setA((p) => ({ ...p, question: editQ.trim(), answer: editA.trim(), updated: new Date().toISOString().slice(0, 10) })); setBusy(null); setEditing(false); }, 500);
  };
  const setStatus = (status: AnswerStatus) => {
    setBusy(status);
    window.setTimeout(() => { setA((p) => ({ ...p, status })); setBusy(null); }, 600);
  };
  const toggleChannel = (ch: Channel) => {
    if (!approved) return;
    setBusy("channels");
    window.setTimeout(() => { setA((p) => ({ ...p, channels: p.channels.includes(ch) ? p.channels.filter((c) => c !== ch) : [...p.channels, ch] })); setBusy(null); }, 400);
  };

  const chipStatus: ChipStatus = approved ? "approved" : a.status === "retired" ? "retired" : "draft";
  const anyBusy = busy !== null;

  if (loading) {
    return (
      <Card className={className}>
        <div className="flex gap-4" aria-hidden="true">
          <div className="min-w-0 flex-1 space-y-2.5">
            <SkeletonLine w="70%" h={15} />
            <SkeletonText lines={2} />
            <div className="flex items-center gap-2.5">
              <SkeletonChip w={72} /><SkeletonCircle size={22} /><SkeletonLine w={90} h={9} />
            </div>
            <div className="flex items-center gap-2"><SkeletonLine w={64} h={9} /><SkeletonChip w={80} /><SkeletonChip w={92} /></div>
          </div>
          <div className="flex w-40 shrink-0 flex-col items-end gap-3 border-l border-ink/10 pl-4">
            <SkeletonLine w={110} h={11} />
            <Skeleton width={120} height={26} />
            <div className="w-full space-y-2">
              <Skeleton height={30} rounded="rounded-[4px]" /><Skeleton height={30} rounded="rounded-[4px]" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className={className}>
        <div className="flex flex-col gap-2.5">
          <Input value={editQ} onChange={(e) => setEditQ(e.target.value)} placeholder="Question" />
          <Textarea value={editA} onChange={(e) => setEditA(e.target.value)} placeholder="Answer" />
          <div className="flex items-center justify-end gap-2">
            <Button compact onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" compact disabled={!editQ.trim() || !editA.trim() || busy === "save"} onClick={saveEdit}>{busy === "save" ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex gap-4">
        {/* main */}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">{a.question}</h3>
          <p className={`mt-1 text-[13px] text-ink/80 ${long && !expanded ? "line-clamp-2" : ""}`}>{a.answer}</p>
          {long && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 inline-flex items-center gap-1 font-term text-[11.5px] text-biscay-2 hover:text-ink">
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{expanded ? "Show less" : "Show more"}
            </button>
          )}

          <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
            <StatusChip status={chipStatus} />
            <span className="inline-flex items-center gap-1.5">
              <Avatar initials={initials(a.owner)} />
              <span className="text-[12px] text-ink/70">{a.owner}</span>
            </span>
            <span className="font-term text-[11px] text-ink/45">Updated {fmtDate(a.updated)}</span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-term text-[11px] uppercase tracking-[0.06em] text-ink/50 w-20">Served to</span>
              {CHANNELS.map((ch) => {
                const on = a.channels.includes(ch);
                return (
                  <Chip
                    key={ch}
                    label={CHANNEL_LABEL[ch]}
                    tone={approved && on ? "ok" : "neutral"}
                    dot={approved && on}
                    onClick={approved && !anyBusy ? () => toggleChannel(ch) : undefined}
                    selected={approved && on}
                  />
                );
              })}
              {!approved && <span className="font-term text-[11px] text-ink/45">approve to serve</span>}
            </div>
            {a.sources.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-term text-[11px] uppercase tracking-[0.06em] text-ink/50 w-20">Sources</span>
                {a.sources.map((s) => (
                  <Chip key={s.title} label={s.title} tone="neutral" icon={<SourceMark provider={s.source} size={13} />} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* side */}
        <div className="w-40 shrink-0 flex flex-col items-end gap-3 border-l border-ink/10 pl-4">
          {approved && (
            <div className="text-right">
              <div className="text-[13px]"><b className="text-ink">{a.served.toLocaleString()}</b> <span className="text-ink/55">served / wk</span></div>
              <div className="mt-1 flex justify-end"><Sparkline values={a.spark} tone="ok" /></div>
            </div>
          )}
          <div className="flex flex-col items-stretch gap-2 w-full">
            {approved ? (
              <Button compact disabled={anyBusy} onClick={() => setStatus("retired")}>{busy === "retired" ? "Retiring…" : "Retire"}</Button>
            ) : (
              <Button variant="primary" compact disabled={anyBusy} onClick={() => setStatus("approved")}>{busy === "approved" ? "Embedding…" : "Approve"}</Button>
            )}
            <Button compact disabled={anyBusy} onClick={startEdit}>Edit</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AnswerCard;
