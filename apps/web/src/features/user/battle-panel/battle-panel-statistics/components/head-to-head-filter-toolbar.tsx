import { CharacterSelector } from "@/components/filters/character-selector";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { PeriodSelector } from "@/components/filters/period-selector";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Award, Filter, SlidersHorizontal, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";

type HeadToHeadFilterToolbarProps = {
  characterId?: string;
  isMobile: boolean;
  matchmaking?: boolean;
  maxLevel?: number;
  minLevel?: number;
  onCharacterChange: (characterId: string | undefined) => void;
  onMatchmakingChange: (matchmaking: boolean) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMobileFiltersOpen: () => void;
  onPeriodChange: (period: Period) => void;
  onPhChange: (ph: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
  period: Period;
  ph?: boolean;
  selectedWarriors: Warrior[];
  showMatchmakingFilter?: boolean;
  showPhFilter?: boolean;
};

export const HeadToHeadFilterToolbar = ({
  characterId,
  isMobile,
  matchmaking,
  maxLevel,
  minLevel,
  onCharacterChange,
  onMatchmakingChange,
  onMaxLevelChange,
  onMinLevelChange,
  onMobileFiltersOpen,
  onPeriodChange,
  onPhChange,
  onWarriorToggle,
  period,
  ph,
  selectedWarriors,
  showMatchmakingFilter = true,
  showPhFilter = true,
}: HeadToHeadFilterToolbarProps) => {
  const { t } = useTranslation();
  const extraFiltersCount =
    ((minLevel ?? 1) !== 1 || (maxLevel ?? 500) !== 500 ? 1 : 0) +
    (showPhFilter && ph ? 1 : 0) +
    (showMatchmakingFilter && matchmaking ? 1 : 0);
  let moreLabel = t("battlePanel.filters.more");

  if (extraFiltersCount > 0) {
    moreLabel = t("battlePanel.filters.moreWithCount", {
      count: extraFiltersCount,
    });
  }

  if (isMobile) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <WarriorSearchFilter
          selectedWarriors={selectedWarriors}
          onWarriorToggle={onWarriorToggle}
          placeholder={t("battlePanel.filters.searchOpponent")}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          onClick={onMobileFiltersOpen}
        >
          <Filter className="size-4" aria-hidden="true" />
          {t("battlePanel.filters.title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <WarriorSearchFilter
        selectedWarriors={selectedWarriors}
        onWarriorToggle={onWarriorToggle}
        placeholder={t("battlePanel.filters.searchOpponent")}
        className="min-w-[260px] flex-1 xl:max-w-[360px]"
      />
      <CharacterSelector
        characterId={characterId}
        onCharacterChange={onCharacterChange}
        allowAllCharacters
        className="h-10 w-[190px] justify-between"
      />
      <PeriodSelector
        value={period}
        onValueChange={onPeriodChange}
        width="w-[170px]"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {moreLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">
                {t("battlePanel.filters.levelRange")}
              </Label>
              <div className="flex items-center gap-2">
                <LevelRangeFilter
                  minLevel={minLevel}
                  maxLevel={maxLevel}
                  onMinLevelChange={onMinLevelChange}
                  onMaxLevelChange={onMaxLevelChange}
                  inputClassName="w-full"
                  containerClassName="flex-1"
                  separator={
                    <span className="text-xs text-muted-foreground">-</span>
                  }
                />
              </div>
            </div>
            {showPhFilter && (
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-background p-3">
                <div className="flex items-center gap-2">
                  <Award className="size-4" aria-hidden="true" />
                  <Label htmlFor="h2h-toolbar-ph" className="cursor-pointer">
                    {t("battlePanel.filters.honorPoints")}
                  </Label>
                </div>
                <Checkbox
                  id="h2h-toolbar-ph"
                  checked={ph === true}
                  onCheckedChange={(checked) => onPhChange(checked === true)}
                />
              </div>
            )}
            {showMatchmakingFilter && (
              <div className="flex items-center justify-between rounded-md border border-border/70 bg-background p-3">
                <div className="flex items-center gap-2">
                  <Swords className="size-4" aria-hidden="true" />
                  <Label
                    htmlFor="h2h-toolbar-matchmaking"
                    className="cursor-pointer"
                  >
                    {t("battlePanel.filters.matchmaking")}
                  </Label>
                </div>
                <Checkbox
                  id="h2h-toolbar-matchmaking"
                  checked={matchmaking === true}
                  onCheckedChange={(checked) =>
                    onMatchmakingChange(checked === true)
                  }
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
