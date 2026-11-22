import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  "aria-label" | "aria-pressed" | "size" | "variant" | "children"
> & {
  label: string;
  tooltip?: ReactNode;
  children: ReactNode;
  active?: boolean;
  variant?: "quiet" | "quiet-destructive" | "taskbar";
  onTooltipOpenChange?: (open: boolean) => void;
};

export const IconButton = ({
  label,
  tooltip,
  children,
  active,
  variant = "quiet",
  onTooltipOpenChange,
  ...props
}: IconButtonProps) => (
  <Tooltip onOpenChange={(open) => onTooltipOpenChange?.(open)}>
    <TooltipTrigger asChild>
      <Button
        type="button"
        variant={variant}
        size="icon-xs"
        data-ll-draggable="false"
        aria-label={label}
        aria-pressed={active}
        {...props}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip ?? label}</TooltipContent>
  </Tooltip>
);
