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
};

/* Two-step confirm, the one pattern for deletes/revokes and for any yes/no
   that must not fire on first click. First click arms ("Really delete?"),
   second within 4s fires; blur or timeout disarms. Replaces window.confirm
   and unguarded deletes.

   Wherever this sits inline on a card or panel it belongs BOTTOM LEFT, ahead
   of any secondary action (CONVENTIONS.md §2). */
export function ConfirmButton({
  confirmLabel = "Really?", onConfirm, confirmVariant = "danger", children, onBlur, ...rest
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
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
