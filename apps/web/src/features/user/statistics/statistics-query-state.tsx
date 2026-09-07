import { CircleAlert } from "lucide-react";
import { cn } from "cn";
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
    refetch: () => unknown;
  };
  children: ReactNode;
  loading?: ReactNode;
  centered?: boolean;
  errorMessage?: string;
};
export function StatisticsQueryState({
  query,
  children,
  loading,
  centered = false,
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
  return (
    <>
      {query.isError && (
        <div
          role="alert"
          className={cn(
            "text-sm",
            centered && query.data === undefined
              ? "flex min-h-full flex-col items-center justify-center gap-4 px-4 py-8 text-center"
              : "space-y-2 rounded-md border border-destructive/50 p-3",
          )}
        >
          {centered && query.data === undefined && (
            <span
              className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-hidden
            >
              <CircleAlert className="size-6" />
            </span>
          )}
          <p className={cn(centered && "text-muted-foreground")}>
            {errorMessage ?? t("statistics.loadError")}
          </p>
          {query.data !== undefined && <p>{t("statistics.stale")}</p>}
          <Button
            variant="outline"
            loading={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            {t("common.actions.retry")}
          </Button>
        </div>
      )}
      {query.data !== undefined && children}
    </>
  );
}
