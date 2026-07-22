import { useState } from "react";
import type { ReactNode } from "react";
import { Key, X, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Skeleton, SkeletonLine, SkeletonButton } from "./Skeleton";

/* TokenReveal — one-time secret reveal (API keys, MCP tokens): a clay dashed
   card that keeps the secret masked until you reveal it, a copy button, and a
   "you won't see this again" warning. Ported from components/TokenReveal.tsx,
   with the reveal-toggle added. */

function mask(token: string): string {
  // Keep a short tail visible for recognition; dot out the rest.
  const tail = token.slice(-4);
  const dots = "•".repeat(Math.max(4, Math.min(32, token.length - 4)));
  return token.length > 8 ? `${dots}${tail}` : "•".repeat(token.length);
}

export type TokenRevealProps = {
  token: string;
  title?: string;
  /** Start masked (default true). */
  masked?: boolean;
  warning?: ReactNode;
  onDismiss?: () => void;
  /** Render a content-shaped skeleton while the token is being minted. */
  loading?: boolean;
  className?: string;
};

export function TokenReveal({
  token, title = "Your new token", masked = true,
  warning = "You won't see this again — store it somewhere safe before dismissing.",
  onDismiss, loading = false, className = "",
}: TokenRevealProps) {
  const [revealed, setRevealed] = useState(!masked);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <Card
        className={`border-clay/50 border-dashed bg-clay/[0.06] ${className}`.trim()}
        icon={<Key size={16} className="text-clay" />}
        title={title}
      >
        <div className="flex items-center gap-2.5">
          <Skeleton height={32} className="flex-1" rounded="rounded-[3px]" />
          <SkeletonButton w={84} />
        </div>
        <SkeletonLine w="72%" h={11} className="mt-2.5" />
      </Card>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code stays selectable */
    }
  };

  return (
    <Card
      className={`border-clay/50 border-dashed bg-clay/[0.06] ${className}`.trim()}
      icon={<Key size={16} className="text-clay" />}
      title={title}
      actions={(
        <>
          <Button icon compact aria-label={revealed ? "Hide token" : "Reveal token"} onClick={() => setRevealed((v) => !v)}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          {onDismiss && (
            <Button icon compact aria-label="Dismiss" title="Dismiss" onClick={onDismiss}>
              <X size={13} />
            </Button>
          )}
        </>
      )}
    >
      <div className="flex items-center gap-2.5">
        <code className="min-w-0 flex-1 rounded-[3px] bg-ink/[0.05] px-2.5 py-1.5 font-term text-[12.5px] text-ink break-all select-all">
          {revealed ? token : mask(token)}
        </code>
        <Button compact onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {warning && <div className="mt-2.5 text-[12px] text-clay">{warning}</div>}
    </Card>
  );
}
