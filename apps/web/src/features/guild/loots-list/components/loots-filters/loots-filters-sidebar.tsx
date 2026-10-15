import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { Bookmark, PanelRightClose, SlidersHorizontal } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { LootDirectSearchNotice } from "./loot-direct-search-notice";
import { FilterCount } from "@/components/common/filter-count";
import { LootFilterSection } from "./loot-filter-section";
import {
  LOOT_FILTER_SECTIONS,
  getLootFilterSectionState,
  type LootFilterSectionKey,
  type LootFiltersState,
} from "./loot-filter-sections";
import { LootFiltersIconTooltip } from "./loot-filters-icon-tooltip";
import { LootItemFilters } from "./loot-item-filters";
import { LootNpcFilters } from "./loot-npc-filters";
import { LootPlayerFilters } from "./loot-player-filters";
import { LootQuickFilters } from "./loot-quick-filters";

type LootsFiltersSidebarProps = {
  state: LootFiltersState;
  /**
   * Collapses the docked panel into the rail; overlays close themselves.
   */
  onCollapse?: () => void;
  /** Keeps the header's end free for the overlay's own close button. */
  hasOverlayCloseButton?: boolean;
  /** The overlay's accessible title, or a heading in the docked panel. */
  titleAs?: ComponentType<{ className?: string; children: ReactNode }>;
  /** Opens this section, scrolls to it and focuses its title on mount. */
  initialSection?: LootFilterSectionKey;
  /** Focuses the collapse button on mount, after the rail handed over. */
  autoFocus?: boolean;
};

const ALL_SECTIONS_OPEN: Record<LootFilterSectionKey, boolean> = {
  npc: true,
  item: true,
  player: true,
};

/** The loot filters: quick filters, then one section per dimension. */
export const LootsFiltersSidebar = ({
  state,
  onCollapse,
  hasOverlayCloseButton = false,
  titleAs: Title,
  initialSection,
  autoFocus = false,
}: LootsFiltersSidebarProps) => {
  const { t } = state;
  const [openSections, setOpenSections] = useState(ALL_SECTIONS_OPEN);

  const sectionTriggers = useRef(
    new Map<LootFilterSectionKey, HTMLButtonElement>(),
  );

  const collapseButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialSection) {
      const trigger = sectionTriggers.current.get(initialSection);

      trigger?.scrollIntoView({ block: "start" });
      trigger?.focus({ preventScroll: true });

      return;
    }

    if (autoFocus) collapseButton.current?.focus();
  }, [initialSection, autoFocus]);

  const title = t("loots.filtersPanel.title");

  return (
    <>
      <Dialog open={state.isDialogOpen} onOpenChange={state.setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("loots.filtersPanel.saveDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("loots.filtersPanel.saveDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Label htmlFor="filterName" className="text-sm font-medium">
              {t("loots.filtersPanel.saveDialog.nameLabel")}
            </Label>
            <Input
              id="filterName"
              value={state.newFilterName}
              onChange={(e) => state.setNewFilterName(e.target.value)}
              placeholder={t("loots.filtersPanel.saveDialog.namePlaceholder")}
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  state.handleSaveFilter();
                }
              }}
            />
          </div>
          <DialogFooter className="p-4 pt-0">
            <Button
              variant="outline"
              onClick={() => state.setIsDialogOpen(false)}
            >
              {t("loots.filtersPanel.saveDialog.cancel")}
            </Button>
            <Button
              onClick={state.handleSaveFilter}
              disabled={!state.newFilterName.trim()}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {t("loots.filtersPanel.saveDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-full min-h-0 w-full flex-col">
        <div
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border pl-4",
            hasOverlayCloseButton ? "pr-12" : "pr-2",
          )}
        >
          {/* The icon that opens the panel, in the accent, tells the title from the section headers. */}
          <SlidersHorizontal
            aria-hidden="true"
            className="size-4 shrink-0 text-primary"
          />
          {Title ? (
            <Title className="text-sm font-semibold">{title}</Title>
          ) : (
            <h2 className="text-sm font-semibold">{title}</h2>
          )}
          <FilterCount count={state.totalActiveFilterCount} />
          <div className="ml-auto flex items-center gap-1">
            {state.hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                aria-label={t("loots.filtersPanel.quickFilters.clearButton")}
                onClick={state.clearFilters}
              >
                {t("loots.filtersPanel.clear")}
              </Button>
            )}
            {onCollapse && (
              <LootFiltersIconTooltip
                label={t("loots.filtersPanel.collapse")}
                trigger={
                  <Button
                    ref={collapseButton}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("loots.filtersPanel.collapse")}
                    aria-expanded
                    onClick={onCollapse}
                    className="text-muted-foreground"
                  >
                    <PanelRightClose aria-hidden="true" />
                  </Button>
                }
              />
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <LootQuickFilters
            t={t}
            allQuickFilters={state.allQuickFilters}
            isQuickFilterApplied={state.isQuickFilterApplied}
            toggleQuickFilter={state.toggleQuickFilter}
            handleRemoveCustomFilter={state.handleRemoveCustomFilter}
            canSaveCurrentFilter={state.canSaveCurrentFilter}
            setIsDialogOpen={state.setIsDialogOpen}
          />

          {state.filters.search !== "" && (
            <div className="border-b border-sidebar-border p-4">
              <LootDirectSearchNotice
                term={state.filters.search}
                onClear={() => state.updateFilters({ search: "" })}
              />
            </div>
          )}

          {LOOT_FILTER_SECTIONS.map(({ key, icon, titleKey }) => {
            const { count, clear } = getLootFilterSectionState(state, key);

            return (
              <LootFilterSection
                key={key}
                icon={icon}
                title={t(titleKey)}
                count={count}
                open={openSections[key]}
                onOpenChange={(open) =>
                  setOpenSections((current) => ({ ...current, [key]: open }))
                }
                onClear={clear}
                triggerRef={(node) => {
                  if (node) sectionTriggers.current.set(key, node);
                  else sectionTriggers.current.delete(key);
                }}
              >
                {key === "npc" && <LootNpcFilters {...state} />}
                {key === "item" && <LootItemFilters {...state} />}
                {key === "player" && <LootPlayerFilters {...state} />}
              </LootFilterSection>
            );
          })}
        </ScrollArea>
      </div>
    </>
  );
};
