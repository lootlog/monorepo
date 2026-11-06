import { Gem } from "lucide-react";
import { useId } from "react";
import { LevelRangeInputs } from "@lootlog/ui/components/level-range-inputs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import {
  LOOT_RARITY_PILL_CLASS,
  LOOT_RARITY_TEXT_CLASS,
} from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { EquipmentGrid } from "@/components/equipment/equipment-grid";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS, findEquipmentSlotById } from "@/lib/equipment-slots";
import {
  ITEM_TYPE_OPTIONS,
  PROFESSION_OPTIONS,
  RARITY_OPTIONS,
} from "@/lib/item-options";
import {
  BOSS_OPTIONS,
  EVENT_OPTIONS,
  type ItemsSearch,
  joinList,
  splitList,
  STAT_OPTIONS,
} from "@/lib/items-search";
import { SEARCHABLE_LEGENDARY_BONUSES } from "@/lib/legendary-bonuses";
import { findMargonemWorld, MARGONEM_WORLDS } from "@/lib/margonem-worlds";
import { FilterSection } from "./filter-section";
import { FilterTile } from "@/components/filter-tile";

type ItemsFilterPanelProps = {
  search: ItemsSearch;
  onChange: (change: Partial<ItemsSearch>) => void;
};

// Types no equipment slot holds, such as potions, keys and quest items.
const OTHER_TYPE_OPTIONS = ITEM_TYPE_OPTIONS.filter(
  (type) => !EQUIPMENT_SLOTS.some((slot) => slot.types.includes(type)),
);

/** Level brackets players think in; the last one has no upper bound. */
const LEVEL_BRACKETS = [
  { min: 1, max: 49 },
  { min: 50, max: 99 },
  { min: 100, max: 149 },
  { min: 150, max: 199 },
  { min: 200, max: 249 },
  { min: 250, max: undefined },
] as const;

const TILE_GRID = "grid grid-cols-2 gap-1.5";

/**
 * Every filter of the item search, folded into sections. The equipment slots
 * come first and are drawn as the game's equipment, the way players pick
 * what to look for.
 */
export function ItemsFilterPanel({ search, onChange }: ItemsFilterPanelProps) {
  const listFilter = (
    key: "professions" | "rarities" | "bonuses" | "bosses" | "stats" | "types",
  ) => {
    const values = splitList(search[key]);

    return {
      values,
      count: values.length,
      clear: () => onChange({ [key]: "" }),
      isPressed: (value: string) => values.includes(value),
      toggle: (value: string) => (pressed: boolean) =>
        onChange({
          [key]: joinList(
            pressed
              ? [...values, value]
              : values.filter((current) => current !== value),
          ),
        }),
    };
  };

  const professions = listFilter("professions");
  const rarities = listFilter("rarities");
  const bonuses = listFilter("bonuses");
  const bosses = listFilter("bosses");
  const stats = listFilter("stats");
  const types = listFilter("types");

  const { minLevel, maxLevel } = search;
  const world = findMargonemWorld(search.world);
  const worldLabelId = useId();

  const worldItems = [
    { value: "", label: t("filters.anyWorld") },
    ...MARGONEM_WORLDS.map(({ id, name }) => ({ value: id, label: name })),
  ];

  const selectedSlot = findEquipmentSlotById(search.slot);

  const setLevel = (min: number | undefined, max: number | undefined) =>
    onChange({ minLevel: min, maxLevel: max });

  return (
    <div className="flex flex-col">
      <FilterSection
        title={t("filters.slot")}
        count={selectedSlot ? 1 : 0}
        onClear={() => onChange({ slot: "" })}
        defaultOpen
      >
        <div className="relative isolate flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-border/50 bg-background/50 px-3 pt-3 pb-2">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_45%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_75%)]"
          />
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
                    "flex size-full items-center justify-center rounded-lg border outline-none transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:transition-none",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                      : "border-border/70 bg-card/80 text-muted-foreground hover:border-primary/50 hover:text-primary",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </button>
              );
            }}
          />
          <p
            aria-live="polite"
            className={cn(
              "text-xs font-medium",
              selectedSlot ? "text-primary" : "text-muted-foreground",
            )}
          >
            {selectedSlot
              ? t(`slots.${selectedSlot.id}`)
              : t("filters.anySlot")}
          </p>
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.profession")}
        count={professions.count}
        onClear={professions.clear}
        defaultOpen
      >
        <div className={TILE_GRID}>
          {PROFESSION_OPTIONS.map((value) => (
            <FilterTile
              key={value}
              label={t(`filters.professions.${value}`)}
              pressed={professions.isPressed(value)}
              onPressedChange={professions.toggle(value)}
              centered
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.level")}
        count={minLevel !== undefined || maxLevel !== undefined ? 1 : 0}
        onClear={() => setLevel(undefined, undefined)}
        defaultOpen
      >
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            {LEVEL_BRACKETS.map(({ min, max }) => {
              const isPressed = minLevel === min && maxLevel === max;

              return (
                <FilterTile
                  key={min}
                  label={
                    max === undefined
                      ? t("filters.levelFrom", { min })
                      : t("filters.levelBracket", { min, max })
                  }
                  pressed={isPressed}
                  onPressedChange={(pressed) =>
                    pressed
                      ? setLevel(min, max)
                      : setLevel(undefined, undefined)
                  }
                  centered
                />
              );
            })}
          </div>
          <LevelRangeInputs
            size="default"
            labels={{
              group: t("filters.level"),
              min: t("filters.minLevel"),
              max: t("filters.maxLevel"),
              minPlaceholder: t("filters.minLevelPlaceholder"),
              maxPlaceholder: t("filters.maxLevelPlaceholder"),
            }}
            minLevel={minLevel}
            maxLevel={maxLevel}
            onMinLevelChange={(level) => onChange({ minLevel: level })}
            onMaxLevelChange={(level) => onChange({ maxLevel: level })}
          />
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.rarity")}
        count={rarities.count}
        onClear={rarities.clear}
        defaultOpen
      >
        <div className={TILE_GRID}>
          {RARITY_OPTIONS.map((value) => {
            const rarity = resolveItemRarity(value);

            return (
              <FilterTile
                key={value}
                label={t(`itemRarity.${value}`)}
                icon={
                  <Gem
                    aria-hidden="true"
                    className={cn("size-3.5", LOOT_RARITY_TEXT_CLASS[rarity])}
                  />
                }
                pressed={rarities.isPressed(value)}
                onPressedChange={rarities.toggle(value)}
                className={LOOT_RARITY_PILL_CLASS[rarity]}
                centered
              />
            );
          })}
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.events")}
        count={(search.events ? 1 : 0) + (world ? 1 : 0)}
        onClear={() => onChange({ events: "", world: "" })}
        defaultOpen
      >
        <div className="flex flex-col gap-3">
          <div className={TILE_GRID}>
            {EVENT_OPTIONS.map((value) => (
              <FilterTile
                key={value}
                label={t(`filters.eventOptions.${value}`)}
                pressed={search.events === value}
                onPressedChange={(pressed) =>
                  onChange({ events: pressed ? value : "" })
                }
                centered
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span
              id={worldLabelId}
              className="text-xs font-medium text-muted-foreground"
            >
              {t("filters.world")}
            </span>
            <Select
              value={search.world}
              onValueChange={(value) => onChange({ world: value ?? "" })}
              items={worldItems}
            >
              <SelectTrigger className="w-full" aria-labelledby={worldLabelId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {worldItems.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {world ? (
              <p className="text-xs text-muted-foreground">
                {t("filters.worldHint", {
                  date: world.isApproximate
                    ? t("filters.worldOpenedAbout", {
                        year: world.openedOn.slice(0, 4),
                      })
                    : new Date(world.openedOn).toLocaleDateString("pl-PL"),
                })}
              </p>
            ) : null}
          </div>
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.bonuses")}
        count={bonuses.count}
        onClear={bonuses.clear}
        defaultOpen
      >
        <div className="flex flex-col gap-1.5">
          {SEARCHABLE_LEGENDARY_BONUSES.map(
            ({ name, icon: Icon, isUpcoming }) => (
              <FilterTile
                key={name}
                label={t(`legendaryBonus.${name}`)}
                icon={
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 text-emerald-400"
                  />
                }
                pressed={bonuses.isPressed(name)}
                onPressedChange={bonuses.toggle(name)}
                lockedLabel={isUpcoming ? t("filters.upcoming") : undefined}
                className="aria-pressed:border-emerald-400/60 aria-pressed:bg-emerald-400/12"
              />
            ),
          )}
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.bosses")}
        count={bosses.count}
        onClear={bosses.clear}
      >
        <div className="flex flex-col gap-1.5">
          {BOSS_OPTIONS.map((value) => (
            <FilterTile
              key={value}
              label={t(`npcTypes.${value}`)}
              pressed={bosses.isPressed(value)}
              onPressedChange={bosses.toggle(value)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.stats")}
        count={stats.count}
        onClear={stats.clear}
      >
        <div className={TILE_GRID}>
          {STAT_OPTIONS.map((value) => (
            <FilterTile
              key={value}
              label={t(`filters.statOptions.${value}`)}
              pressed={stats.isPressed(value)}
              onPressedChange={stats.toggle(value)}
              centered
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title={t("filters.otherTypes")}
        count={types.count}
        onClear={types.clear}
      >
        <div className={TILE_GRID}>
          {OTHER_TYPE_OPTIONS.map((value) => (
            <FilterTile
              key={value}
              label={t(`itemType.${value}`)}
              pressed={types.isPressed(value)}
              onPressedChange={types.toggle(value)}
              centered
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
