import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimersEmptyStateProps = {
  areFiltersActive: boolean;
};

export const TimersEmptyState: FC<TimersEmptyStateProps> = ({
  areFiltersActive,
}) => {
  const { t } = useTranslation();

  return (
    <span className="ll:w-full ll:flex ll:justify-center ll:text-center ll:mt-6 ll:text-gray-400">
      {areFiltersActive
        ? t("timers.emptyState.filtered")
        : t("timers.emptyState.placeholder")}
    </span>
  );
};
