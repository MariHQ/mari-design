import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "./Button";

export type ConfirmButtonProps = Omit<ButtonProps, "onClick" | "variant"> & {
  confirmLabel?: string;
  onConfirm: () => void;
};

/* Two-step destructive confirm — the one pattern for deletes/revokes. First
   click arms ("Really delete?"), second within 4s fires; blur or timeout
   disarms. Replaces window.confirm and unguarded deletes. */
export function ConfirmButton({ confirmLabel = "Really?", onConfirm, children, onBlur, ...rest }: ConfirmButtonProps) {
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
      variant={armed ? "danger" : "default"}
      onClick={click}
      onBlur={(e) => { setArmed(false); onBlur?.(e); }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
