import { Button } from "@lootlog/ui/components/button";
import { FilterChipButton } from "@lootlog/ui/components/filter-chip-button";
import { t } from "@/i18n/messages";

type ActiveFilterChipsProps = {
  filters: ReadonlyArray<{ key: string; label: string; onRemove: () => void }>;
  onClearAll: () => void;
};

/**
 * One removable chip per active filter and a way to clear them all. They sit
 * beside the results' count, so picking a filter does not move the results.
 */
export function ActiveFilterChips({
  filters,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <>
      {filters.map((filter) => (
        <FilterChipButton
          key={filter.key}
          removeLabel={t("filters.remove", { filter: filter.label })}
          onRemove={filter.onRemove}
        >
          {filter.label}
        </FilterChipButton>
      ))}
      <Button variant="ghost" size="xs" onClick={onClearAll}>
        {t("filters.clearAll")}
      </Button>
    </>
  );
}
