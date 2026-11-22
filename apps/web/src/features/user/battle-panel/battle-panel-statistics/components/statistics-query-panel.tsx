import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";

type StatisticsQueryPanelProps = {
  query: {
    isError: boolean;
    isFetching: boolean;
    data: unknown;
    refetch: () => void;
  };
  title?: string;
  children?: ReactNode;
};

export function StatisticsQueryPanel({
  query,
  title,
  children,
}: StatisticsQueryPanelProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const hasData = query.data !== undefined;

  const retry = () => {
    void query.refetch();
  };

  if (query.isError && !hasData) {
    const failure = (
      <div role="alert" className="flex min-w-0 flex-col">
        <EmptyState
          compact
          icon={CircleAlert}
          title={t("battlePanel.statistics.empty.errorTitle")}
          className="min-h-40"
          action={<RetryButton onRetry={retry} isRetrying={query.isFetching} />}
        />
      </div>
    );

    return title ? (
      <BandSection id={headingId} title={title} tiled>
        {failure}
      </BandSection>
    ) : (
      <div className={LIST_TILE_RULE_CLASS}>{failure}</div>
    );
  }

  return (
    <>
      {query.isError && (
        <QueryErrorNotice
          message={t("battlePanel.statistics.empty.errorTitle")}
          detail={t("battlePanel.statistics.staleData")}
          isRetrying={query.isFetching}
          onRetry={retry}
          className={LIST_TILE_RULE_CLASS}
        />
      )}
      {children}
    </>
  );
}
