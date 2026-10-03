import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  /** Shown instead of the content when there is nothing to show. */
  emptyMessage?: string;
  className?: string;
  children: ReactNode;
};

/** Titled card around one chart or statistic, with its loading and empty states. */
export const ChartCard = ({
  title,
  description,
  actions,
  isLoading = false,
  emptyMessage,
  className,
  children,
}: ChartCardProps) => (
  <SectionCard
    aria-busy={isLoading}
    className={cn("flex min-w-0 flex-1 flex-col", className)}
  >
    <SectionCardHeader
      title={title}
      description={description}
      actions={actions}
    />
    <SectionCardContent className="flex min-w-0 flex-1 flex-col">
      {isLoading ? (
        <Skeleton className="min-h-64 w-full flex-1 rounded-lg" />
      ) : emptyMessage ? (
        <EmptyState
          icon={Inbox}
          title={emptyMessage}
          compact
          className="flex-1"
        />
      ) : (
        children
      )}
    </SectionCardContent>
  </SectionCard>
);
