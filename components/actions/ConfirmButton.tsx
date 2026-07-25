import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button, type ButtonProps } from "./Button";

export type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "variant"> & {
  confirmLabel?: string;
  onConfirm: () => void;
  /* Which confirm step to show once armed (CONVENTIONS.md §2):
       "danger"  — destructive yes (delete, revoke). The default.
       "success" — affirmative yes (approve, ratify, publish). Green, with a
                   check glyph so the affirmative path is unmistakable.
       "primary" — neutral next step. */
  confirmVariant?: "danger" | "success" | "primary";
  /* Start already armed. Only the design canvas should pass this: it is how
     the confirm step gets captured as a state without a click, which is what
     the Settings pages used to fake by drawing a second, static copy of the
     whole table beside the real one. No disarm timer runs until you actually
     click, so the armed step holds still for a screenshot. */
  defaultArmed?: boolean;
};

/* Two-step confirm, the one pattern for deletes/revokes and for any yes/no
   that must not fire on first click. First click arms ("Really delete?"),
   second within 4s fires; blur or timeout disarms. Replaces window.confirm
   and unguarded deletes.

   Wherever this sits inline on a card or panel it belongs BOTTOM LEFT, ahead
   of any secondary action (CONVENTIONS.md §2). */
export function ConfirmButton({
  confirmLabel = "Really?", onConfirm, confirmVariant = "danger", defaultArmed = false,
  children, onBlur, ...rest
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(defaultArmed);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    if (armed) {
      window.clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), 4000);
    }
  };

  return (
    <Button
      {...rest}
      variant={armed ? confirmVariant : "default"}
      onClick={click}
      onBlur={(e) => { setArmed(false); onBlur?.(e); }}
    >
      {armed
        ? <>{confirmVariant === "success" && <Check size={13} />}{confirmLabel}</>
        : children}
    </Button>
  );
}
