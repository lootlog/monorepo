import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

type SectionCardHeaderProps = {
  title: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
};

export const SectionCardHeader = ({
  title,
  icon: Icon,
  description,
  actions,
  id,
  className,
}: SectionCardHeaderProps) => (
  <header
    className={cn(
      "flex min-h-12 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/70 px-3 py-2",
      className,
    )}
  >
    <div className="min-w-0 flex-1">
      <h2
        id={id}
        className="flex min-w-0 items-center gap-2 text-sm font-semibold"
      >
        {Icon && (
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {actions}
      </div>
    )}
  </header>
);
