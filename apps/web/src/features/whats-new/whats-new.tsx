import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEffect, useState } from "react";
import {
  filterChangelog,
  formatWeekRange,
  groupChangelogByWeek,
  isCurrentWeek,
} from "@lootlog/changelog/changelog";
import { CHANGELOG } from "@lootlog/changelog/entries";
import { cn } from "cn";
import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BandSection } from "@/components/common/band-section";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { FilterBar } from "@/components/common/filter-bar";
import type { FilterChip } from "@/components/common/filter-chip-list";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useWhatsNew } from "@/components/whats-new/use-whats-new";
import { useWhatsNewFilters } from "@/components/whats-new/use-whats-new-filters";
import { WhatsNewEntry } from "@/components/whats-new/whats-new-entry";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { WhatsNewFilterFields } from "./whats-new-filter-fields";

export const WhatsNew = () => {
  const { t, i18n } = useTranslation();
  const { unreadIds, markAllSeen } = useWhatsNew();

  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useWhatsNewFilters();

  const [unreadOnOpen] = useState(unreadIds);

  useEffect(() => {
    if (!hasActiveFilters) markAllSeen();
  });

  const weeks = groupChangelogByWeek(
    filterChangelog(CHANGELOG, {
      surfaces: filters.surfaces,
      types: filters.types,
      search: filters.q,
    }),
  );

  const chips: FilterChip[] = [
    ...filters.surfaces.map((surface) => ({
      id: `surface:${surface}`,
      label: t(`layout.whatsNew.surfaces.${surface}`),
      onRemove: () =>
        setFilters({
          surfaces: filters.surfaces.filter((current) => current !== surface),
        }),
    })),
    ...filters.types.map((type) => ({
      id: `type:${type}`,
      label: t(`layout.whatsNew.types.${type}`),
      onRemove: () =>
        setFilters({
          types: filters.types.filter((current) => current !== type),
        }),
    })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <h1 className="sr-only">{t("layout.whatsNew.title")}</h1>
        <FilterBar
          ariaLabel={t("layout.whatsNew.filters.title")}
          search={
            <KillStatsSearch
              value={filters.q}
              placeholder={t("layout.whatsNew.filters.search")}
              onChange={(q) => setFilters({ q }, { history: "replace" })}
            />
          }
          stackedFilters={
            <WhatsNewFilterFields
              filters={filters}
              setFilters={setFilters}
              stacked
            />
          }
          chips={chips}
          clearFiltersLabel={t("common.actions.clearFilters")}
          onClearFilters={clearFilters}
        >
          <WhatsNewFilterFields filters={filters} setFilters={setFilters} />
        </FilterBar>
        {weeks.length === 0 && hasActiveFilters && (
          <div className="p-3">
            <EmptyState
              fill
              icon={SearchX}
              title={t("layout.whatsNew.noResults")}
              description={t("layout.whatsNew.noResultsDescription")}
              action={<ClearFiltersButton onClear={clearFilters} />}
            />
          </div>
        )}
        {weeks.map((week) => (
          <BandSection
            key={week.weekStart}
            id={`whats-new-${week.weekStart}`}
            title={
              isCurrentWeek(week.weekStart)
                ? t("layout.whatsNew.thisWeek")
                : formatWeekRange(week.weekStart, i18n.language)
            }
            count={week.entries.length + week.fixes.length}
            tiled
          >
            {[...week.entries, ...week.fixes].map((item) => (
              <WhatsNewEntry
                key={item.id}
                item={item}
                isUnread={unreadOnOpen.includes(item.id)}
                className={cn(
                  "py-4",
                  LIST_TILE_RULE_CLASS,
                  LIST_TILE_INSET_CLASS,
                )}
              />
            ))}
          </BandSection>
        ))}
      </ScrollArea>
    </div>
  );
};
