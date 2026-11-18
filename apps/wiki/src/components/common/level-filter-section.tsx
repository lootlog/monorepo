import { LevelRangeInputs } from "@lootlog/ui/components/level-range-inputs";
import { FilterTile } from "@/components/filter-tile";
import { t } from "@/i18n/messages";
import { FilterSection } from "./filter-section";

/** Level brackets players think in; the last one has no upper bound. */
const LEVEL_BRACKETS = [
  { min: 1, max: 49 },
  { min: 50, max: 99 },
  { min: 100, max: 149 },
  { min: 150, max: 199 },
  { min: 200, max: 249 },
  { min: 250, max: undefined },
] as const;

type LevelRange = {
  minLevel: number | undefined;
  maxLevel: number | undefined;
};

type LevelFilterSectionProps = LevelRange & {
  onChange: (change: Partial<LevelRange>) => void;
};

/** The level filter of a search: the usual brackets, or a range typed in. */
export function LevelFilterSection({
  minLevel,
  maxLevel,
  onChange,
}: LevelFilterSectionProps) {
  const setLevel = (min: number | undefined, max: number | undefined) =>
    onChange({ minLevel: min, maxLevel: max });

  return (
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
                  pressed ? setLevel(min, max) : setLevel(undefined, undefined)
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
  );
}
