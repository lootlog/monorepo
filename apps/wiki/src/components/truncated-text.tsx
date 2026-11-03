import { type ReactNode, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";

type TruncatedTextProps = {
  /** The whole text, shown in a tooltip while the line cuts it off. */
  label: string;
  /** What the line shows; the label when omitted. */
  children?: ReactNode;
  className?: string;
};

/** One line of text that ends in an ellipsis and offers itself whole on hover. */
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
