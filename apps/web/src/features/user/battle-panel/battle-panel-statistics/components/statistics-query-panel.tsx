import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

type StatisticsQueryPanelProps = {
  query: {
    isError: boolean;
    isFetching: boolean;
    data: unknown;
    refetch: () => unknown;
  };
  children?: ReactNode;
};

export function StatisticsQueryPanel({
  query,
  children,
}: StatisticsQueryPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-2">
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
            disabled={query.isFetching}
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
