import { Button } from "@lootlog/ui/components/button";
import { SlidersHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { FilterCount } from "@/components/common/filter-count";
import { TAB_BAR_GLASS_CLASS } from "@/components/layout/tab-bar-glass";
import { useTabBarAccessory } from "@/hooks/context/use-tab-bar-accessory";

type FiltersFabProps = {
  activeFilterCount: number;
  onOpenFilters: () => void;
};

/**
 * Narrow pages open their filters within thumb reach. On phones the button is
 * the tab bar's accessory; elsewhere it floats at the bottom edge, above a
 * footer docked there, such as pagination, which publishes its height as
 * `--docked-footer-height`.
 */
export const FiltersFab = ({
  activeFilterCount,
  onOpenFilters,
}: FiltersFabProps) => {
  const { t } = useTranslation();
  const accessory = useTabBarAccessory();

  const label =
    activeFilterCount > 0
      ? `${t("common.filters.title")}. ${t("common.filters.activeCount", { count: activeFilterCount })}`
      : t("common.filters.title");

  if (accessory) {
    return createPortal(
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={label}
        className={cn(
          TAB_BAR_GLASS_CLASS,
          "flex size-full items-center justify-center gap-2 px-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
        <span className="truncate">{t("common.filters.title")}</span>
        <FilterCount count={activeFilterCount} />
      </button>,
      accessory,
    );
  }

  return (
    <Button
      type="button"
      onClick={onOpenFilters}
      aria-label={label}
      className="fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+var(--docked-footer-height,0px))] z-40 size-14 rounded-full shadow-lg shadow-black/40 [&_svg:not([class*='size-'])]:size-6"
    >
      <SlidersHorizontal aria-hidden="true" />
      <FilterCount count={activeFilterCount} variant="corner" />
    </Button>
  );
};
