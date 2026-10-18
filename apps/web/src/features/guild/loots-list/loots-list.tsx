import { LootsList } from "@/features/guild/loots-list/components/loots-list/loots-list";
import { LootsFiltersSidebar } from "@/features/guild/loots-list/components/loots-filters/loots-filters-sidebar";
import { LootFiltersRail } from "@/features/guild/loots-list/components/loots-filters/loot-filters-rail";
import type { LootFilterSectionKey } from "@/features/guild/loots-list/components/loots-filters/loot-filter-sections";
import { useLootFiltersSidebar } from "@/features/guild/loots-list/components/loots-filters/use-loot-filters-sidebar";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { FiltersFab } from "@/components/filters/filters-fab";
import { useState } from "react";
import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { Sheet, SheetContent, SheetTitle } from "@lootlog/ui/components/sheet";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";
import { useLocalStorage } from "usehooks-ts";
import { cn } from "cn";
import { LootDetailsDialog } from "@/features/guild/loots-list/components/loots-list/loot-details-dialog";
import { useTranslation } from "react-i18next";
import {
  LOOTS_COMPACT_FILTERS_BREAKPOINT,
  LOOTS_FILTERS_OPEN_KEY,
} from "./loots-list-layout";

export const LootsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { setFilters } = useLootsFilters();
  const filtersState = useLootFiltersSidebar();

  const [isFiltersOpen, setIsFiltersOpen] = useLocalStorage(
    LOOTS_FILTERS_OPEN_KEY,
    true,
  );

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const [requestedSection, setRequestedSection] =
    useState<LootFilterSectionKey>();

  // Keyboard focus follows the toggle once the player used it, never on load.
  const [focusHandoff, setFocusHandoff] = useState<"panel" | "rail">();
  const isMobile = useIsMobile();
  const usesOverlayFilters = useMaxWidth(LOOTS_COMPACT_FILTERS_BREAKPOINT);
  const usesSideSheet = usesOverlayFilters && !isMobile;
  const isPanelDocked = !usesOverlayFilters && isFiltersOpen;

  const filtersLayout = isMobile
    ? "drawer"
    : usesOverlayFilters
      ? "sheet"
      : "docked";

  // Crossing a breakpoint swaps the filters surface: an overlay opened for
  // the old layout closes, and a pending focus handoff is dropped so the
  // remounted surface never takes focus on its own.
  const [renderedFiltersLayout, setRenderedFiltersLayout] =
    useState(filtersLayout);

  if (renderedFiltersLayout !== filtersLayout) {
    setRenderedFiltersLayout(filtersLayout);
    setIsOverlayOpen(false);
    setFocusHandoff(undefined);
  }

  const openFilters = (section?: LootFilterSectionKey) => {
    setRequestedSection(section);

    if (usesOverlayFilters) {
      setIsOverlayOpen(true);

      return;
    }

    setFocusHandoff("panel");
    setIsFiltersOpen(true);
  };

  const collapseFilters = () => {
    setRequestedSection(undefined);
    setFocusHandoff("rail");
    setIsFiltersOpen(false);
  };

  return (
    <>
      {isMobile && (
        <Drawer open={isOverlayOpen} onOpenChange={setIsOverlayOpen}>
          <DrawerContent className="flex h-[92dvh] max-h-[92dvh] flex-col overflow-hidden bg-sidebar p-0">
            <LootsFiltersSidebar state={filtersState} titleAs={DrawerTitle} />
          </DrawerContent>
        </Drawer>
      )}

      {usesSideSheet && (
        <Sheet open={isOverlayOpen} onOpenChange={setIsOverlayOpen}>
          <SheetContent
            closeLabel={t("common.close")}
            className="w-[min(400px,calc(100vw-12px))] gap-0 border-sidebar-border bg-sidebar p-0 sm:max-w-[400px]"
          >
            <LootsFiltersSidebar
              state={filtersState}
              titleAs={SheetTitle}
              hasOverlayCloseButton
              initialSection={requestedSection}
            />
          </SheetContent>
        </Sheet>
      )}

      <GuildWorldHeaderSwitcher />

      {/* Phones scroll the document, where hiding the overflow would make
          these the scroller the toolbar sticks to. */}
      <div className="flex h-full w-full overflow-x-clip md:overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip md:overflow-hidden">
          <LootsList />
        </div>

        {/* Phones open the filters from a floating button instead. */}
        {!isMobile && (
          <aside
            data-top-bar-inset
            aria-label={t("loots.filtersPanel.title")}
            className={cn(
              "flex h-full shrink-0 overflow-hidden border-l border-sidebar-border bg-sidebar transition-[width] duration-300 ease-emphasized motion-reduce:transition-none",
              isPanelDocked ? "w-[340px]" : "w-14",
            )}
          >
            {isPanelDocked ? (
              <div className="h-full w-[340px] shrink-0">
                <LootsFiltersSidebar
                  state={filtersState}
                  onCollapse={collapseFilters}
                  initialSection={requestedSection}
                  autoFocus={focusHandoff === "panel"}
                />
              </div>
            ) : (
              <LootFiltersRail
                state={filtersState}
                onOpen={openFilters}
                isPanelOpen={isOverlayOpen}
                autoFocus={focusHandoff === "rail"}
              />
            )}
          </aside>
        )}
      </div>

      {isMobile && (
        <FiltersFab
          activeFilterCount={filtersState.totalActiveFilterCount}
          onOpenFilters={() => openFilters()}
        />
      )}

      <LootDetailsDialog
        onShowPlayerLoots={(playerName) =>
          setFilters({ players: [playerName] })
        }
      />
    </>
  );
};
