import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type ChatActionButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  pressed?: boolean;
  className?: string;
};

const actionButtonStyle = {
  appearance: "none",
  background: "transparent",
  border: 0,
  padding: 0,
  margin: 0,
  color: "inherit",
} as const;

export const ChatActionButton: FC<ChatActionButtonProps> = ({
  label,
  onClick,
  children,
  pressed,
  className,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        style={actionButtonStyle}
        className={cn(
          "ll-custom-cursor-pointer ll:relative ll:flex ll:size-5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
          className,
        )}
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);
