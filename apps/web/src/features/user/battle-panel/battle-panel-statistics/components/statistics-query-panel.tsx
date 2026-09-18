import { cn } from "cn";
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

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {query.isError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm"
        >
          <p>{t("battlePanel.statistics.empty.errorTitle")}</p>
          {query.data !== undefined && (
            <p>{t("battlePanel.statistics.staleData")}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            loading={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            {t("common.actions.retry")}
          </Button>
        </div>
      )}
      {(!query.isError || query.data !== undefined) && children}
    </div>
  );
}
