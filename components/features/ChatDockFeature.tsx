import { useRef, useState } from "react";
import { Sparkles, Calendar, Plus, X } from "lucide-react";
import { ChatDock as ChatDockUI } from "../chat/ChatDock";
import type { ChatMessageData, ToolCallData } from "../chat/types";
import { Button } from "../actions/Button";
import { Menu, MenuItem, MenuLabel } from "../navigation/Menu";
import { focusRing } from "../tokens/focusRing";

/* ChatDockFeature — the persistent Mari-agent dock in its app context. Wraps
   the chat/<ChatDock> (aliased ChatDockUI) with the surrounding shell chrome:
   a topbar toggle, a floating launcher when closed, and the header action
   cluster (past-conversations menu, new conversation, close). Streaming, tool
   calls, and SPA-navigation are simulated locally against baked-in demo data —
   no SSE, no network. Source: web/src/components/chat/ChatDock.tsx. */

const SUGGESTIONS = [
  "Summarize what changed in the handbook this week",
  "Tag the pricing doc as customer-facing",
  "Which facts are stale?",
];

const OFFLINE_MSG = "I can't reach the agent backend right now — this is a local demo, so I'll narrate instead of actually running tools.";

let uid = 0;
const nextId = () => `m${++uid}`;

function seedTranscript(): ChatMessageData[] {
  return [
    { id: nextId(), role: "user", content: "Find docs that mention the old 3-seat free tier and flag them" },
    {
      id: nextId(),
      role: "assistant",
      content:
        "I found 3 documents referencing the 3-seat limit. Two are customer-facing and now stale; I've flagged them for review and left the internal runbook alone.",
      tools: [
        { id: "t1", name: "search_docs", args: { query: "free tier 3 seats", limit: 20 }, summary: "3 matches across handbook, pricing, onboarding", ok: true },
        { id: "t2", name: "tag_document", args: { doc: "pricing.md", tag: "needs-review" }, summary: "tagged pricing.md needs-review", ok: true },
      ],
    },
    { id: nextId(), role: "warning", content: "Rate limit near — 8 of 10 tool calls used this minute." },
  ];
}

const DEMO_SESSIONS = [
  { id: "s_current", title: "Free-tier seat audit", meta: "current" },
  { id: "s_2", title: "Sync GitHub docs", meta: "6 msgs" },
  { id: "s_3", title: "Draft release notes", meta: "14 msgs" },
];

export type ChatDockFeatureProps = {
  /** Start with the dock open (default true so it renders visibly standalone). */
  defaultOpen?: boolean;
  className?: string;
};

export function ChatDockFeature({ defaultOpen = true, className = "" }: ChatDockFeatureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessageData[]>(seedTranscript);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>("s_current");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const patchLast = (fn: (m: ChatMessageData) => ChatMessageData) =>
    setMessages((cur) => (cur.length ? [...cur.slice(0, -1), fn(cur[cur.length - 1])] : cur));

  const send = (text: string) => {
    if (streaming) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((cur) => [...cur, { id: nextId(), role: "user", content: trimmed }]);
    setStreaming(true);

    // Assistant turn: a tool call resolves, then the reply streams token by token.
    const tool: ToolCallData = { id: nextId(), name: "search_docs", args: { query: trimmed.slice(0, 40) }, ok: null };
    after(450, () => {
      setMessages((cur) => [...cur, { id: nextId(), role: "assistant", content: "", tools: [tool], streaming: true }]);
    });
    after(1200, () => {
      patchLast((m) => ({ ...m, tools: [{ ...tool, summary: "4 matching documents", ok: true }] }));
    });

    const reply = "Done — I searched the knowledge base and pulled the relevant documents. Ask me to tag, edit, or open any of them.";
    const words = reply.split(" ");
    words.forEach((_, i) => {
      after(1500 + i * 55, () => {
        patchLast((m) => ({ ...m, content: words.slice(0, i + 1).join(" ") }));
      });
    });
    after(1500 + words.length * 55 + 120, () => {
      patchLast((m) => ({ ...m, streaming: false }));
      setStreaming(false);
    });
  };

  const stop = () => {
    clearTimers();
    setStreaming(false);
    patchLast((m) => (m.role === "assistant" ? { ...m, streaming: false, content: m.content || OFFLINE_MSG } : m));
  };

  const newConversation = () => {
    if (streaming) return;
    clearTimers();
    setStreaming(false);
    setMessages([]);
    setSessionId(null);
  };

  const resume = (id: string, title: string) => {
    if (streaming) return;
    clearTimers();
    setStreaming(false);
    setSessionId(id);
    setMessages(id === "s_current" ? seedTranscript() : [
      { id: nextId(), role: "user", content: `Resume: ${title}` },
      { id: nextId(), role: "assistant", content: `Restored the "${title}" conversation from history.` },
    ]);
  };

  const headerActions = (
    <div className="flex items-center gap-1">
      <Menu
        align="end"
        trigger={
          <Button icon compact aria-label="Past conversations" className="w-7 h-7">
            <Calendar size={15} />
          </Button>
        }
      >
        <MenuLabel>Past conversations</MenuLabel>
        {DEMO_SESSIONS.length === 0 ? (
          <MenuLabel>No past conversations.</MenuLabel>
        ) : (
          DEMO_SESSIONS.map((s) => (
            <MenuItem key={s.id} end={<span className="font-term text-[10.5px]">{s.meta}</span>} onSelect={() => resume(s.id, s.title)}>
              {s.title}
            </MenuItem>
          ))
        )}
      </Menu>
      <Button icon compact aria-label="New conversation" disabled={streaming} onClick={newConversation} className="w-7 h-7">
        <Plus size={15} />
      </Button>
      <Button icon compact aria-label="Close" onClick={() => setOpen(false)} className="w-7 h-7">
        <X size={14} />
      </Button>
    </div>
  );

  const title = sessionId ? `Mari agent · #${sessionId}` : "Mari agent";

  return (
    <div className={`relative h-[560px] overflow-hidden rounded-md border border-ink/15 bg-flysch/40 ${className}`.trim()}>
      {/* Mock app shell topbar with the dock toggle */}
      <div className="flex items-center gap-2 border-b border-ink/12 bg-paper px-4 py-2.5">
        <span className="font-display text-[14px] text-ink">Console</span>
        <span className="font-term text-[11px] text-ink/40">/ overview</span>
        <button
          type="button"
          aria-pressed={open}
          onClick={() => setOpen((v) => !v)}
          className={`ml-auto grid h-8 w-8 place-items-center rounded-[4px] border ${open ? "border-biscay-2/50 bg-biscay-2/[0.08] text-biscay-2" : "border-ink/20 text-ink/70 hover:text-ink"} ${focusRing}`}
        >
          <Sparkles size={16} />
        </button>
      </div>

      {/* Page body (placeholder) */}
      <div className="p-5 font-term text-[12px] text-ink/35">
        The agent dock is mounted once and persists across navigation.
      </div>

      {/* The dock — a persistent right slide-over, not a modal */}
      {open && (
        <aside className="absolute right-0 top-[49px] bottom-0 w-[360px] max-w-full border-l border-ink/15 bg-paper">
          <ChatDockUI
            className="h-full rounded-none border-0"
            title={title}
            messages={messages}
            isStreaming={streaming}
            onSend={send}
            onStop={stop}
            headerActions={headerActions}
            suggestions={SUGGESTIONS}
            placeholder="Ask Mari to do something…"
            hint="Tools run with your own permissions · gemma3 local"
          />
        </aside>
      )}

      {/* Floating launcher when closed */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Mari agent — it can act on Mari for you"
          aria-label="Open Mari agent"
          className={`absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full border border-biscay-2/40 bg-biscay text-white hover:bg-biscay-2 ${focusRing}`}
        >
          <Sparkles size={20} />
        </button>
      )}
    </div>
  );
}
