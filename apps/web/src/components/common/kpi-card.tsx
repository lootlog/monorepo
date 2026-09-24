import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type KpiCardProps = {
  icon: LucideIcon;
  isLoading?: boolean;
  label: string;
  /** Context for the value, such as its unit or the share it is part of. */
  detail?: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
};

export const KpiCard = ({
  detail,
  icon: Icon,
  isLoading = false,
  label,
  value,
  valueClassName,
  className,
}: KpiCardProps) => {
  return (
    <SectionCard className={cn("flex min-w-0 flex-col gap-2 p-3", className)}>
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="my-0.5 h-3 w-16" />
        </>
      ) : (
        <>
          <div
            className={cn(
              "animate-content-in truncate text-2xl font-semibold leading-7 tabular-nums",
              valueClassName,
            )}
          >
            {value}
          </div>
          <div className="min-h-4 animate-content-in truncate text-xs text-muted-foreground">
            {detail}
          </div>
        </>
      )}
    </SectionCard>
  );
};
