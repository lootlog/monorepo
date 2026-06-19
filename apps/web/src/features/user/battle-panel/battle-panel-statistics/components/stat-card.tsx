import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { BattlePanelEmptyState } from "@/features/user/battle-panel/components/battle-panel-empty-state";
import { cn } from "@lootlog/ui/lib/utils";
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
    <Card
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
      variant={onClick ? "interactive" : "default"}
      className={cn(
        "flex min-w-0 flex-col border-border bg-card/40 p-0 backdrop-blur-sm",
        className,
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex gap-2 flex-col">
          <CardTitle className="text-base font-semibold leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-xs leading-tight">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 flex-1 p-4 pt-2">
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
      </CardContent>
    </Card>
  );
}
