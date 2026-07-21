import { Spinner } from "../data-display/Spinner";

/* The "Mari is working…" row shown while a turn is in flight but no
   assistant tokens have landed yet. Spinner + a soft caption. */
export function TypingIndicator({ label = "working…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 ml-[18px] text-[12.5px] text-ink/50">
      <Spinner size="sm" label="Assistant is working" />
      {label}
    </div>
  );
}
