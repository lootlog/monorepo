import { FilterPills } from "@lootlog/ui/components/filter-pills";
import { LevelRangeInputs } from "@lootlog/ui/components/level-range-inputs";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_PILL_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { EquipmentGrid } from "@/components/equipment/equipment-grid";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import {
  ITEM_TYPE_OPTIONS,
  PROFESSION_OPTIONS,
  RARITY_OPTIONS,
} from "@/lib/item-options";
import {
  BOSS_OPTIONS,
  type ItemsSearch,
  joinList,
  readLevel,
  RECENT_OPTIONS,
  splitList,
  STAT_OPTIONS,
} from "@/lib/items-search";

type ItemsFilterPanelProps = {
  search: ItemsSearch;
  onChange: (change: Partial<ItemsSearch>) => void;
};

// Types no equipment slot holds, such as potions, keys and quest items.
const OTHER_TYPE_OPTIONS = ITEM_TYPE_OPTIONS.filter(
  (type) => !EQUIPMENT_SLOTS.some((slot) => slot.types.includes(type)),
);

const options = <Value extends string>(
  values: readonly Value[],
  label: (value: Value) => string,
) => values.map((value) => ({ value, label: label(value) }));

/** Every filter of the item search, the equipment slots first, as in the game. */
export function ItemsFilterPanel({ search, onChange }: ItemsFilterPanelProps) {
  const pillsChange = (key: keyof ItemsSearch) => (values: string[]) =>
    onChange({ [key]: joinList(values) });

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="filter-slot" className="flex flex-col gap-2">
        <h3
          id="filter-slot"
          className="text-xs font-medium text-muted-foreground"
        >
          {t("filters.slot")}
        </h3>
        <EquipmentGrid
          renderSlot={(slot) => {
            const Icon = slot.icon;
            const isSelected = search.slot === slot.id;

            return (
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={t(`slots.${slot.id}`)}
                title={t(`slots.${slot.id}`)}
                onClick={() => onChange({ slot: isSelected ? "" : slot.id })}
                className={cn(
                  "flex size-11 items-center justify-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  isSelected
                    ? "border-primary bg-primary/12 text-primary"
                    : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </button>
            );
          }}
        />
      </section>

      <FilterPills
        label={t("filters.profession")}
        options={options(PROFESSION_OPTIONS, (value) =>
          t(`filters.professions.${value}`),
        )}
        value={splitList(search.professions)}
        onValueChange={pillsChange("professions")}
      />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t("filters.level")}
        </span>
        <LevelRangeInputs
          size="default"
          labels={{
            group: t("filters.level"),
            min: t("filters.minLevel"),
            max: t("filters.maxLevel"),
            minPlaceholder: t("filters.minLevelPlaceholder"),
            maxPlaceholder: t("filters.maxLevelPlaceholder"),
          }}
          minLevel={readLevel(search.minLevel)}
          maxLevel={readLevel(search.maxLevel)}
          onMinLevelChange={(level) =>
            onChange({ minLevel: level === undefined ? "" : String(level) })
          }
          onMaxLevelChange={(level) =>
            onChange({ maxLevel: level === undefined ? "" : String(level) })
          }
        />
      </div>

      <FilterPills
        label={t("filters.rarity")}
        options={RARITY_OPTIONS.map((value) => ({
          value,
          label: t(`itemRarity.${value}`),
          className: LOOT_RARITY_PILL_CLASS[resolveItemRarity(value)],
        }))}
        value={splitList(search.rarities)}
        onValueChange={pillsChange("rarities")}
      />

      <FilterPills
        label={t("filters.recent")}
        options={options(RECENT_OPTIONS, (value) =>
          t(`filters.recentOptions.${value}`),
        )}
        value={splitList(search.recent)}
        // One reach at a time: the latest pick replaces the previous one.
        onValueChange={(values) => onChange({ recent: values.at(-1) ?? "" })}
      />

      <FilterPills
        label={t("filters.bosses")}
        options={options(BOSS_OPTIONS, (value) => t(`npcTypes.${value}`))}
        value={splitList(search.bosses)}
        onValueChange={pillsChange("bosses")}
      />

      <FilterPills
        label={t("filters.stats")}
        options={options(STAT_OPTIONS, (value) =>
          t(`filters.statOptions.${value}`),
        )}
        value={splitList(search.stats)}
        onValueChange={pillsChange("stats")}
      />

      <FilterPills
        label={t("filters.otherTypes")}
        options={options(OTHER_TYPE_OPTIONS, (value) => t(`itemType.${value}`))}
        value={splitList(search.types)}
        onValueChange={pillsChange("types")}
      />
    </div>
  );
}
