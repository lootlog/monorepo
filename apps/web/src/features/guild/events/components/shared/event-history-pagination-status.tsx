import { Spinner } from "@lootlog/ui/components/spinner";
import { useTranslation } from "react-i18next";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { cn } from "cn";

type EventHistoryPaginationStatusProps = {
  hasError: boolean;
  hasNextPage?: boolean;
  isFetching: boolean;
  onRetry: () => void;
};

export const EventHistoryPaginationStatus = ({
  hasError,
  hasNextPage,
  isFetching,
  onRetry,
}: EventHistoryPaginationStatusProps) => {
  const { t } = useTranslation();

  if (hasError) {
    return (
      <QueryErrorNotice
        message={t("events.error")}
        onRetry={onRetry}
        isRetrying={isFetching}
      />
    );
  }

  if (!hasNextPage) return t("events.kills.endOfList");

  return (
    <span className="inline-flex items-center gap-2">
      {/* The slot stays reserved so the label never shifts when a page loads. */}
      <Spinner
        className={cn("size-4 text-primary", !isFetching && "invisible")}
      />
      {t("events.kills.loading")}
    </span>
  );
};
