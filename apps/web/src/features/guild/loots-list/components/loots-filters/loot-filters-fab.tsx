import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LootFiltersActiveDot } from "./loot-filters-active-dot";

type LootFiltersFabProps = {
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
};

/** Phones open the loot filters from a floating button within thumb reach. */
export const LootFiltersFab = ({
  hasActiveFilters,
  onOpenFilters,
}: LootFiltersFabProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      onClick={onOpenFilters}
      aria-label={t("loots.header.filtersButton")}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg shadow-black/40 [&_svg:not([class*='size-'])]:size-6"
    >
      <Filter aria-hidden="true" />
      {hasActiveFilters && <LootFiltersActiveDot />}
    </Button>
  );
};
