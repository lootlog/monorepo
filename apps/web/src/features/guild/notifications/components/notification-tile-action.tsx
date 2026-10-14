import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { ComponentProps, ReactNode } from "react";

type NotificationTileActionProps = Omit<
  ComponentProps<typeof Button>,
  "size" | "variant" | "aria-label" | "children"
> & {
  label: string;
  /** Extra lines under the label in the tooltip. */
  hint?: ReactNode;
  icon: ReactNode;
};

/** A quiet icon button at a notification tile's end, named by its tooltip. */
export const NotificationTileAction = ({
  label,
  hint,
  icon,
  className,
  ...props
}: NotificationTileActionProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          className={className ?? "text-muted-foreground"}
          {...props}
        >
          {icon}
        </Button>
      }
    />
    <TooltipContent>
      <p>{label}</p>
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </TooltipContent>
  </Tooltip>
);
