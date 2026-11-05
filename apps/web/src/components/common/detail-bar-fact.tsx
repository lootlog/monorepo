import { cn } from "cn";
import type { ReactNode } from "react";

type DetailBarFactProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * One fact about the page's subject, its value under a quiet label. On a bar
 * wide enough for one row, a rule sets each fact apart from the one before it.
 */
export const DetailBarFact = ({
  label,
  children,
  className,
}: DetailBarFactProps) => (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-0.5 @min-[36rem]/detail-bar:border-l @min-[36rem]/detail-bar:px-4 @min-[36rem]/detail-bar:first:border-l-0 @min-[36rem]/detail-bar:first:pl-0",
      className,
    )}
  >
    <span className="text-[11px] leading-4 text-muted-foreground">{label}</span>
    {/* A block, not a flex row: text in a flex row clips without an ellipsis. */}
    <span className="block min-w-0 truncate text-sm leading-5 font-medium tabular-nums">
      {children}
    </span>
  </div>
);
