import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  title: string;
  description: string;
  actions?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  description,
  actions,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  children,
  className,
}: StatCardProps) {
  const { t } = useTranslation();

  return (
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
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isEmpty ? (
          <EmptyState
            icon={Inbox}
            title={emptyMessage ?? t("battlePanel.statistics.empty.title")}
          />
        ) : (
          children
        )}
      </SectionCardContent>
    </SectionCard>
  );
}
