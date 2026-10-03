import { EmptyState } from "@/components/common/empty-state";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { SectionCard } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { CircleAlert, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

type StatisticsQueryPanelProps = {
  query: {
    isError: boolean;
    isFetching: boolean;
    data: unknown;
    refetch: () => void;
  };
  children?: ReactNode;
  className?: string;
};

export function StatisticsQueryPanel({
  query,
  children,
  className,
}: StatisticsQueryPanelProps) {
  const { t } = useTranslation();
  const hasData = query.data !== undefined;

  const retry = () => {
    void query.refetch();
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {query.isError && hasData && (
        <SectionCard>
          <QueryErrorNotice
            message={t("battlePanel.statistics.empty.errorTitle")}
            detail={t("battlePanel.statistics.staleData")}
            isRetrying={query.isFetching}
            onRetry={retry}
          />
        </SectionCard>
      )}
      {query.isError && !hasData && (
        <div role="alert" className="flex min-w-0 flex-1 flex-col">
          <EmptyState
            framed
            compact
            icon={CircleAlert}
            title={t("battlePanel.statistics.empty.errorTitle")}
            className="flex-1"
            action={
              <Button
                type="button"
                variant="outline"
                loading={query.isFetching}
                icon=<RotateCcw className="size-3.5" />
                onClick={retry}
              >
                {t("common.actions.retry")}
              </Button>
            }
          />
        </div>
      )}
      {(!query.isError || hasData) && children}
    </div>
  );
}
