import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Clock3, SearchX } from "lucide-react";
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
        action={
          <Button
            className="ll:h-6 ll:px-2.5"
            onClick={onResetFilters}
            type="button"
            variant="ghost"
          >
            {t("emptyState.showAll")}
          </Button>
        }
        icon={SearchX}
        title={t("emptyState.filteredTitle")}
      />
    );
  }

  return <EmptyState icon={Clock3} title={t("emptyState.noneTitle")} />;
};
