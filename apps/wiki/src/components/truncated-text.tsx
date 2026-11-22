import { type ReactNode, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";

type TruncatedTextProps = {
  label: string;
  children?: ReactNode;
  className?: string;
};

export function TruncatedText({
  label,
  children = label,
  className,
}: TruncatedTextProps) {
  const lineRef = useRef<HTMLSpanElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={(open) => {
        const line = lineRef.current;

        setIsOpen(open && !!line && line.scrollWidth > line.clientWidth);
      }}
    >
      <TooltipTrigger
        render={<span ref={lineRef} />}
        className={cn("block min-w-0 truncate", className)}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
