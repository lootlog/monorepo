import { Input } from "@/components/ui/input";
import { NPC_NAMES } from "@/constants/margonem";
import { NpcType } from "@/hooks/api/use-npcs";
import { cn } from "@/lib/utils";
import { useTimersStore } from "@/store/timers.store";
import { FC, useCallback } from "react";

const NPC_TYPES_OPTIONS = [NpcType.ELITE2, NpcType.HERO, NpcType.TITAN];
const MAX_LVL = 500;
const MIN_LVL = 0;

const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const TimersFilters: FC = () => {
  const {
    timerFiltersSearchText,
    setTimerFiltersSearchText,
    toggleFiltersSelectedNpcTypes,
    timerFiltersSelectedNpcTypes,
    timerFiltersMaxLvl,
    timerFiltersMinLvl,
    setTimerFiltersMinLvl,
    setTimerFiltersMaxLvl,
  } = useTimersStore();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTimerFiltersSearchText(e.target.value);
    },
    [setTimerFiltersSearchText]
  );

  const handleMinLvlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = Number(e.target.value);

      if (isNaN(numericValue)) return;

      const clampedValue = clampValue(numericValue, MIN_LVL, MAX_LVL);
      setTimerFiltersMinLvl(clampedValue);

      if (clampedValue > timerFiltersMaxLvl) {
        setTimerFiltersMaxLvl(clampedValue);
      }
    },
    [setTimerFiltersMinLvl, setTimerFiltersMaxLvl, timerFiltersMaxLvl]
  );

  const handleMaxLvlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericValue = Number(e.target.value);

      if (isNaN(numericValue)) return;

      const clampedValue = clampValue(numericValue, MIN_LVL, MAX_LVL);
      setTimerFiltersMaxLvl(clampedValue);

      if (clampedValue < timerFiltersMinLvl) {
        setTimerFiltersMinLvl(clampedValue);
      }
    },
    [setTimerFiltersMaxLvl, setTimerFiltersMinLvl, timerFiltersMinLvl]
  );

  return (
    <div className="ll-flex ll-flex-row ll-gap-1 ll-flex-nowrap ll-mb-1">
      <Input
        placeholder="Szukaj..."
        value={timerFiltersSearchText}
        onChange={handleSearchChange}
      />
      <div className="ll-w-[4.5rem]">
        <Input
          placeholder="Od"
          value={timerFiltersMinLvl.toString()}
          onChange={handleMinLvlChange}
          className="ll-w-8"
          max={MAX_LVL}
          min={MIN_LVL}
          type="number"
          inputMode="numeric"
        />
      </div>
      <div className="ll-w-[4.5rem]">
        <Input
          placeholder="Do"
          value={timerFiltersMaxLvl.toString()}
          onChange={handleMaxLvlChange}
          className="ll-w-8"
          min={MIN_LVL}
          max={MAX_LVL}
          type="number"
          inputMode="numeric"
        />
      </div>
      <div className="ll-flex ll-custom-cursor-pointer ll-items-center ll-justify-center ll-border-solid ll-border-gray-400 ll-box-border ll-border ll-rounded-sm ll-bg-gray-500/30 ll-transition-all">
        {NPC_TYPES_OPTIONS.map((type, index) => {
          const npc = NPC_NAMES[type];
          const isSelected = timerFiltersSelectedNpcTypes.includes(type);
          const isNotLast = index < NPC_TYPES_OPTIONS.length - 1;

          return (
            <div
              key={type}
              onClick={() => toggleFiltersSelectedNpcTypes(type)}
              className={cn(
                "ll-flex ll-items-center ll-justify-center ll-gap-2 hover:ll-bg-gray-400/50 ll-px-1 ll-py-0.5 ll-box-border ll-text-white ll-text-xs",
                {
                  "ll-border-r ll-border-r-white ll-border-solid": isNotLast,
                  "ll-bg-gray-400/30": isSelected,
                }
              )}
            >
              {npc.shortname}
            </div>
          );
        })}
      </div>
    </div>
  );
};
