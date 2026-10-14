import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { ReactElement, ReactNode } from "react";

/** Names a filters icon button beside it, with an optional line of state. */
export const LootFiltersIconTooltip = ({
  trigger,
  label,
  detail,
}: {
  trigger: ReactElement;
  label: ReactNode;
  detail?: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger render={trigger} />
    <TooltipContent side="left">
      <p className="font-medium">{label}</p>
      {detail && <p className="text-muted-foreground">{detail}</p>}
    </TooltipContent>
  </Tooltip>
);
