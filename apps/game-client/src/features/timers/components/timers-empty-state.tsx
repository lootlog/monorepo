import { EmptyState } from "@/components/empty-state";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimersEmptyStateProps = {
  areFiltersActive: boolean;
  onResetFilters: () => void;
};

export const TimersEmptyState: FC<TimersEmptyStateProps> = ({
  areFiltersActive,
  onResetFilters,
}) => {
  const { t } = useTranslation("timers");

  if (areFiltersActive) {
    return (
      <EmptyState
        action={{ label: t("emptyState.showAll"), onClick: onResetFilters }}
        title={t("emptyState.filteredTitle")}
      />
    );
  }

  return (
    <EmptyState
      description={t("emptyState.noneDescription")}
      title={t("emptyState.noneTitle")}
    />
  );
};
