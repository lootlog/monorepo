import { FilterSection } from "@/components/common/filter-section";
import { LevelFilterSection } from "@/components/common/level-filter-section";
import { FilterTile } from "@/components/filter-tile";
import { t } from "@/i18n/messages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { formatCatalogMonth, latestCatalogMonths } from "@/lib/catalog-days";
import { EVENT_OPTIONS } from "@/lib/items-search";
import {
  hasEventMonsters,
  isNpcFilterType,
  NPC_TYPE_OPTIONS,
  npcKindColorStyle,
  npcKindLabel,
} from "@/lib/npc-types";
import type { NpcsSearch } from "@/lib/npcs-search";

// How far back the month filter reaches.
const FIRST_SEEN_MONTHS = 24;

type NpcsFilterPanelProps = {
  search: NpcsSearch;
  onChange: (change: Partial<NpcsSearch>) => void;
};

/**
 * Every filter of the NPC search. The type is one choice, not a list:
 * picking another replaces it, and picking it again shows every type. Event
 * monsters are a filter of their own, for the types that have any.
 */
export function NpcsFilterPanel({ search, onChange }: NpcsFilterPanelProps) {
  const type = isNpcFilterType(search.types) ? search.types : undefined;
  const hasEvents = hasEventMonsters(type);

  // A link may name a month older than the list offers.
  const months = latestCatalogMonths(FIRST_SEEN_MONTHS);

  const monthItems = [
    { value: "", label: t("npcs.anyMonth") },
    ...(search.firstSeen && !months.includes(search.firstSeen)
      ? [search.firstSeen]
      : []
    )
      .concat(months)
      .map((month) => ({ value: month, label: formatCatalogMonth(month) })),
  ];

  return (
    <div className="flex flex-col">
      <FilterSection
        title={t("npcs.types")}
        count={type ? 1 : 0}
        onClear={() => onChange({ types: "" })}
        defaultOpen
      >
        <div className="flex flex-col gap-1.5">
          {NPC_TYPE_OPTIONS.map((option) => (
            <FilterTile
              key={option}
              label={npcKindLabel(option)}
              icon={
                <span
                  aria-hidden="true"
                  style={npcKindColorStyle(option)}
                  className="size-2 rounded-full bg-(--npc-type,color-mix(in_oklab,var(--muted-foreground)_45%,transparent))"
                />
              }
              pressed={type === option}
              onPressedChange={(pressed) =>
                onChange({ types: pressed ? option : "" })
              }
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t("npcs.events")}
        count={hasEvents && search.events ? 1 : 0}
        onClear={() => onChange({ events: "" })}
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-1.5">
          {EVENT_OPTIONS.map((value) => (
            <FilterTile
              key={value}
              label={t(`filters.eventOptions.${value}`)}
              pressed={hasEvents && search.events === value}
              onPressedChange={(pressed) =>
                onChange({ events: pressed ? value : "" })
              }
              lockedLabel={hasEvents ? undefined : t("npcs.noEventMonsters")}
              centered
            />
          ))}
        </div>
      </FilterSection>

      <LevelFilterSection
        minLevel={search.minLevel}
        maxLevel={search.maxLevel}
        onChange={onChange}
      />

      <FilterSection
        title={t("npcs.firstSeen")}
        count={search.firstSeen ? 1 : 0}
        onClear={() => onChange({ firstSeen: "" })}
        defaultOpen
      >
        <Select
          value={search.firstSeen}
          onValueChange={(value) => onChange({ firstSeen: value ?? "" })}
          items={monthItems}
        >
          <SelectTrigger
            className="w-full"
            aria-label={t("npcs.firstSeenMonth")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
}
