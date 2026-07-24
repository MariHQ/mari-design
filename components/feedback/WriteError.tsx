import { Alert } from "./Alert";
import { ERRORS } from "./errors";

/* The failure surface for a page ACTION, and the twin of the `error` banner a
   failed read renders (pages/types.ts, CONVENTIONS §8).

   The catalog owns the heading and the tone; the body is the message the server
   actually sent, so a rejected write says why instead of "something went
   wrong". Renders nothing when there is nothing to report, so a control can
   drop it in unconditionally. */
export function WriteError({ children, onDismiss }: {
  children: string | null | undefined;
  onDismiss?: () => void;
}) {
  if (!children) return null;
  return (
    <Alert tone="blocked" title={ERRORS["generic.saveFailed"].title} onDismiss={onDismiss}>
      {children}
    </Alert>
  );
}
