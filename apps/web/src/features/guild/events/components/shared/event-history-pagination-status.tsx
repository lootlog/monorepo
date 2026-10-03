import { Spinner } from "@lootlog/ui/components/spinner";
import { useTranslation } from "react-i18next";
import { QueryErrorNotice } from "@/components/common/query-error-notice";

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
      {isFetching && <Spinner className="size-4 text-primary" />}
      {t("events.kills.loading")}
    </span>
  );
};
