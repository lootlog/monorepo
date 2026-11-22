import { cn } from "cn";
import { useState, type FC, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TruncatedTextProps = {
  children: ReactNode;
  className?: string;
};

export const TruncatedText: FC<TruncatedTextProps> = ({
  children,
  className,
}) => {
  const [isTruncated, setIsTruncated] = useState(false);

  return (
    <Tooltip disabled={!isTruncated}>
      <TooltipTrigger asChild>
        <span
          className={cn("ll:min-w-0 ll:truncate", className)}
          onPointerEnter={(event) =>
            setIsTruncated(
              event.currentTarget.scrollWidth > event.currentTarget.clientWidth,
            )
          }
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
};
