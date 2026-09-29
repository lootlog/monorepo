import { EmptyState } from "@/components/empty-state";
import { NoLootlogEmptyState } from "@/components/no-lootlog-empty-state";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
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
  const { hasNoGuilds } = useLootlogGuilds();

  if (hasNoGuilds) {
    return <NoLootlogEmptyState />;
  }

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
