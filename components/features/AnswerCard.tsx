import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../layout/Card";
import { CardBody, CardTitleBlock, CardMeta, CardSection, CardActions } from "../layout/CardShell";
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
  answer: "Sessions are 30-day rolling tokens: each request within the window extends them. Signing in on a new device revokes the oldest session once you pass the five-device cap, and signing out revokes the current session immediately. Admins can force-revoke every session for a member from the members table.",
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
          <div className="flex items-center gap-2">
            <Button variant="primary" compact disabled={!editQ.trim() || !editA.trim() || busy === "save"} onClick={saveEdit}>{busy === "save" ? "Saving…" : "Save"}</Button>
            <Button compact onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardBody>
        {/* 1 + 2 — header and header summary */}
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Curated answer</h2>
          <p className="mt-0.5 text-[12.5px] text-ink/70">
            Bots serve this wording verbatim. Editing it changes every channel below.
          </p>
        </div>

        {/* 4 + 5 — title and summary of the content */}
        <CardTitleBlock
          title={a.question}
          summary={(
            <>
              <span className={long && !expanded ? "line-clamp-2 block" : "block"}>{a.answer}</span>
              {long && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 inline-flex items-center gap-1 font-term text-[11.5px] text-biscay-2 hover:text-ink">
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{expanded ? "Show less" : "Show more"}
                </button>
              )}
            </>
          )}
        />

        {/* 6 + 7 — source and status on the left, date and author on the right */}
        <CardMeta
          source={a.sources[0] ? <Chip label={a.sources[0].source} tone="neutral" icon={<SourceMark provider={a.sources[0].source} size={13} />} /> : undefined}
          status={<StatusChip status={chipStatus} />}
          date={<span>Updated {fmtDate(a.updated)}</span>}
          author={(
            <span className="inline-flex items-center gap-1.5">
              <Avatar initials={initials(a.owner)} />
              <span className="text-[12px] text-ink/70">{a.owner}</span>
            </span>
          )}
        />

        {/* 8 — references */}
        {a.sources.length > 0 && (
          <CardSection label="References" count={a.sources.length}>
            <div className="flex flex-wrap items-center gap-1.5">
              {a.sources.map((s) => (
                <Chip key={s.title} label={s.title} tone="neutral" icon={<SourceMark provider={s.source} size={13} />} className="max-w-full [&>span]:truncate" />
              ))}
            </div>
          </CardSection>
        )}

        {/* 9 — connections */}
        <CardSection label="Connections" count={a.channels.length}
          action={approved ? undefined : <span className="font-term text-[11px] text-ink/65">Approve to serve</span>}>
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
        </CardSection>

        {/* 10 — owners */}
        <CardSection label="Owners">
          <span className="inline-flex items-center gap-1.5">
            <Avatar initials={initials(a.owner)} />
            <span className="text-[12.5px] text-ink/80">{a.owner}</span>
          </span>
        </CardSection>

        {approved && (
          <CardSection label="Served per week">
            <div className="flex items-center gap-3">
              <b className="text-[15px] text-ink">{a.served.toLocaleString()}</b>
              <Sparkline values={a.spark} tone="ok" />
            </div>
          </CardSection>
        )}

        {/* 11 + 12 — buttons, biggest action last */}
        <CardActions
          primary={<Button compact disabled={anyBusy} onClick={startEdit}>Edit</Button>}
          secondary={approved ? (
            <Button variant="danger" compact disabled={anyBusy} onClick={() => setStatus("retired")}>{busy === "retired" ? "Retiring\u2026" : "Retire"}</Button>
          ) : (
            <Button variant="primary" compact disabled={anyBusy} onClick={() => setStatus("approved")}>{busy === "approved" ? "Embedding\u2026" : "Approve"}</Button>
          )}
        />
      </CardBody>
    </Card>
  );
}

export default AnswerCard;
