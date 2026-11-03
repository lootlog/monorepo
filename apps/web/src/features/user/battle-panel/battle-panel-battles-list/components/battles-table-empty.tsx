import { EmptyState } from "@/components/common/empty-state";
import { AlertCircle, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";

type BattlesTableEmptyProps = {
  hasError: boolean;
  isRetrying: boolean;
  onRetry?: () => void;
  /** A paginated list reserves a page's height; a preview stays compact. */
  paginated: boolean;
};

/** Takes the battle list's place when it has no battles or failed to load. */
export const BattlesTableEmpty = ({
  hasError,
  isRetrying,
  onRetry,
  paginated,
}: BattlesTableEmptyProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-3">
      {hasError ? (
        <EmptyState
          icon={AlertCircle}
          title={t("battlePanel.list.loadError")}
          compact={!paginated}
          className={paginated ? "min-h-[360px]" : "min-h-48"}
          action={
            onRetry && <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
          }
        />
      ) : (
        <EmptyState
          icon={Shield}
          title={t("battlePanel.list.empty")}
          description={t("battlePanel.list.emptyDescription")}
          compact={!paginated}
          className={paginated ? "min-h-[360px]" : "min-h-48"}
        />
      )}
    </div>
  );
};
