import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimersEmptyStateProps = {
  areFiltersActive: boolean;
};

export const TimersEmptyState: FC<TimersEmptyStateProps> = ({
  areFiltersActive,
}) => {
  const { t } = useTranslation("timers");

  return (
    <span className="ll:w-full ll:flex ll:justify-center ll:text-center ll:mt-6 ll:text-gray-400">
      {areFiltersActive ? t("emptyState.filtered") : t("emptyState.none")}
    </span>
  );
};
