import type { ComponentProps } from "react";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

type ScheduleIconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "size" | "title"
> & {
  /** Names the button and fills its tooltip. */
  label: string;
};

export const ScheduleIconButton = ({
  label,
  variant = "ghost",
  ...props
}: ScheduleIconButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          type="button"
          variant={variant}
          size="icon"
          aria-label={label}
          {...props}
        />
      }
    />
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);
