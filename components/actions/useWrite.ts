import { useCallback, useState } from "react";

/* The one way a control performs a page action (pages/types.ts, CONVENTIONS §8).
 *
 * A page is given its `actions` by whoever renders it, and that slot is
 * OPTIONAL: the design canvas has no server behind it. So every control keeps
 * the local state that already makes it visibly respond, and this hook decides
 * whether that local echo is the whole story or the tail of a real write:
 *
 *   - no handler  → run the echo immediately. Exactly today's behaviour.
 *   - a handler   → await it, then echo, so the UI only claims the change once
 *                   the server has accepted it. If it throws, nothing is echoed
 *                   and `failed` carries the message the server actually sent,
 *                   which the control renders through the same surface a failed
 *                   read uses.
 *
 * `busy` is for disabling the control that fired, so a slow write cannot be
 * double-submitted. */
export function useWrite() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  /** Returns whether the write succeeded, for callers that close a form on
      success and keep it open (with the message) on failure. */
  const run = useCallback(async (
    call: (() => unknown | Promise<unknown>) | undefined,
    echo?: () => void,
  ): Promise<boolean> => {
    if (!call) { echo?.(); return true; }
    setBusy(true);
    setFailed(null);
    try {
      await call();
      echo?.();
      return true;
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "That change could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  /** Same contract, for a write whose RESULT the control has to show (a
      one-time secret, a test report). Resolves to the value on success and to
      undefined on failure, with `failed` set. */
  const runFor = useCallback(async <T,>(call: () => T | Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setFailed(null);
    try {
      return await call();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "That change could not be saved.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, failed, setFailed, run, runFor };
}
