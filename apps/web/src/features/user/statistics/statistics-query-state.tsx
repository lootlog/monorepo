import { EmptyState } from "@/components/common/empty-state";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { CircleAlert, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type StatisticsQueryStateProps = {
  query: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    data: unknown;
    refetch: () => void;
  };
  children: ReactNode;
  loading?: ReactNode;
  /** Sizes the failed-load state for a card rather than a whole page. */
  compact?: boolean;
  errorMessage?: string;
};

export function StatisticsQueryState({
  query,
  children,
  loading,
  compact = false,
  errorMessage,
}: StatisticsQueryStateProps) {
  const { t } = useTranslation();

  if (query.isPending)
    return (
      loading ?? (
        <div
          role="status"
          aria-label={t("common.loading")}
          className="space-y-3"
        >
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )
    );

  const message = errorMessage ?? t("statistics.loadError");

  if (query.data === undefined) {
    if (!query.isError) return null;

    return (
      <div role="alert" className="flex min-h-full flex-1 flex-col">
        <EmptyState
          icon={CircleAlert}
          title={message}
          compact={compact}
          className="flex-1"
          action={
            <Button
              type="button"
              variant="outline"
              loading={query.isFetching}
              icon=<RotateCcw className="size-3.5" />
              onClick={() => {
                void query.refetch();
              }}
            >
              {t("common.actions.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {query.isError && (
        <QueryErrorNotice
          message={message}
          detail={t("statistics.stale")}
          isRetrying={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {children}
    </>
  );
}
