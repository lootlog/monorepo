import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

type StatisticsQueryPanelProps = {
  query: {
    isError: boolean;
    isFetching: boolean;
    data: unknown;
    refetch: () => void;
  };
  /** The section's heading, kept over the failure so it is clear what failed. */
  title?: string;
  children?: ReactNode;
};

/**
 * One statistics section's query: its content, a failure with a retry in its
 * place, or a notice over the last good copy when a refresh fails.
 */
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
