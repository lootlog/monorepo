import { EmptyState } from "@lootlog/ui/components/empty-state";
import type { FilterChip } from "@/components/common/filter-chip-list";
import { AlertCircle, SearchX, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RetryButton } from "@/components/common/retry-button";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";

type BattlesTableEmptyProps = {
  hasError: boolean;
  isRetrying: boolean;
  onRetry?: () => void;
  activeFilterChips?: FilterChip[];
  onClearFilters?: () => void;
  paginated: boolean;
};

export const BattlesTableEmpty = ({
  hasError,
  isRetrying,
  onRetry,
  activeFilterChips = [],
  onClearFilters,
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
      ) : onClearFilters && activeFilterChips.length > 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("battlePanel.list.noResults")}
          description={t("battlePanel.list.noResultsDescription")}
          compact={!paginated}
          className={paginated ? "min-h-[360px]" : "min-h-48"}
          action={<ClearFiltersButton onClear={onClearFilters} />}
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
