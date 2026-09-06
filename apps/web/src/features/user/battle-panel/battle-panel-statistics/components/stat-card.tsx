import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { cn } from "cn";
import { Inbox } from "lucide-react";
import type { KeyboardEventHandler, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  title: string;
  description: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  role?: string;
  tabIndex?: number;
  ariaLabel?: string;
}

export function StatCard({
  title,
  description,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  children,
  className,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ariaLabel,
}: StatCardProps) {
  const { t } = useTranslation();

  return (
    <SectionCard
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      variant={onClick ? "interactive" : "default"}
      className={cn(
        "flex min-w-0 flex-col border-border bg-card p-0",
        className,
      )}
    >
      <SectionCardHeader title={title} description={description} />
      <SectionCardContent className="min-w-0 flex-1">
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t("battlePanel.statistics.loading")}
            </p>
          </div>
        ) : isEmpty ? (
          <BattlePanelEmptyState
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
