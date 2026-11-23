import { CopyIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ClipboardCopyState } from "../hooks/use-clipboard-copy";
import { SuccessCheckIcon } from "./success-check-icon";

type CopyStateIconProps = {
  state: ClipboardCopyState;
  idleIcon?: ReactNode;
};

export function CopyStateIcon({ state, idleIcon }: CopyStateIconProps) {
  if (state === "copied") {
    return <SuccessCheckIcon key="copied" />;
  }

  if (state === "failed") {
    return (
      <XIcon
        key="failed"
        aria-hidden="true"
        className="text-destructive animate-pop-in motion-reduce:animate-none"
      />
    );
  }

  return idleIcon ?? <CopyIcon aria-hidden="true" />;
}
