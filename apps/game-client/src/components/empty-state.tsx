import type { LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  icon: LucideIcon;
  title: string;
};

export const EmptyState: FC<EmptyStateProps> = ({
  action,
  className,
  icon: Icon,
  title,
}) => {
  return (
    <div
      aria-live="polite"
      className={cn(
        "ll:box-border ll:flex ll:h-full ll:min-h-20 ll:w-full ll:flex-col ll:items-center ll:justify-center ll:px-4 ll:py-3 ll:text-center",
        className,
      )}
      role="status"
    >
      <span className="ll:mb-2 ll:flex ll:size-9 ll:items-center ll:justify-center ll:rounded-full ll:border ll:border-gray-600/70 ll:bg-gray-800/60 ll:text-gray-400">
        <Icon aria-hidden className="ll:size-4.5" />
      </span>
      <span className="ll:text-xs ll:font-medium ll:text-gray-200">
        {title}
      </span>
      {action ? <div className="ll:mt-2.5">{action}</div> : null}
    </div>
  );
};
