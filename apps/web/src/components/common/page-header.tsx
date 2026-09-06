import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "./section-card/section-card";
import { cn } from "cn";

type PageHeaderProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  id?: string;
  className?: string;
};

export const PageHeader = ({
  icon: Icon,
  title,
  description,
  metadata,
  status,
  actions,
  children,
  id,
  className,
}: PageHeaderProps) => (
  <SectionCard className={cn("shrink-0", className)}>
    <header className="flex min-w-0 flex-wrap items-start gap-3 p-4">
      {Icon && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1
            id={id}
            className="min-w-0 break-words text-lg font-semibold leading-tight"
          >
            {title}
          </h1>
          {status}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {metadata && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {metadata}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
    {children}
  </SectionCard>
);
