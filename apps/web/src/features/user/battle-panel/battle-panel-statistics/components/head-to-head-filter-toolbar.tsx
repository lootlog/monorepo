import { CharacterSelector } from "@/components/filters/character-selector";
import { MoreFiltersPopover } from "@/components/filters/more-filters-popover";
import { PeriodSelector } from "@/components/filters/period-selector";
import { WarriorSearchFilter } from "@/components/filters/warrior-search-filter";
import type { SearchWarrior as Warrior } from "@/lib/api/battlelog-types";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

type HeadToHeadFilterToolbarProps = {
  characterId?: string;
  isMobile: boolean;
  maxLevel?: number;
  minLevel?: number;
  onCharacterChange: (characterId: string | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMobileFiltersOpen: () => void;
  onPeriodChange: (period: Period) => void;
  onPhChange: (ph: boolean) => void;
  onWarriorToggle: (warrior: Warrior) => void;
  period: Period;
  ph?: boolean;
  selectedWarriors: Warrior[];
  showPhFilter?: boolean;
};

export const HeadToHeadFilterToolbar = ({
  characterId,
  isMobile,
  maxLevel,
  minLevel,
  onCharacterChange,
  onMaxLevelChange,
  onMinLevelChange,
  onMobileFiltersOpen,
  onPeriodChange,
  onPhChange,
  onWarriorToggle,
  period,
  ph,
  selectedWarriors,
  showPhFilter = true,
}: HeadToHeadFilterToolbarProps) => {
  const { t } = useTranslation();

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
      <MoreFiltersPopover
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        ph={ph}
        onPhChange={onPhChange}
        phCheckboxId="h2h-toolbar-ph"
        showPhFilter={showPhFilter}
      />
    </div>
  );
};
