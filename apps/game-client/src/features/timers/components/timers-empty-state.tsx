import type { FC } from "react";

type TimersEmptyStateProps = {
  areFiltersActive: boolean;
};

export const TimersEmptyState: FC<TimersEmptyStateProps> = ({
  areFiltersActive,
}) => {
  return (
    <span className="ll:w-full ll:flex ll:justify-center ll:text-center ll:mt-6 ll:text-gray-400">
      {areFiltersActive ? "Brak timerów dla wybranych filtrów" : "----"}
    </span>
  );
};
