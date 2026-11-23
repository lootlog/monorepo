import type { ClipboardCopyState } from "@lootlog/ui/hooks/use-clipboard-copy";
import { Check, TriangleAlert, type LucideIcon } from "lucide-react";
import type { FC } from "react";

type CopyStateIconProps = {
  state: ClipboardCopyState;
  IdleIcon: LucideIcon;
};

export const CopyStateIcon: FC<CopyStateIconProps> = ({ state, IdleIcon }) => {
  if (state === "copied")
    return (
      <Check key="copied" aria-hidden className="ll-pop-in ll:text-success" />
    );

  if (state === "failed")
    return (
      <TriangleAlert
        key="failed"
        aria-hidden
        className="ll-pop-in ll:text-amber-300"
      />
    );

  return <IdleIcon aria-hidden />;
};
