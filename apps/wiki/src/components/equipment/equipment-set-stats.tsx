import { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { CharacterStatsWindow } from "./character-stats-window";
import { EquipmentSetTotals } from "./equipment-set-totals";
import { EmptyNotice } from "@/components/common/empty-notice";

const STAT_SOURCES = ["character", "skills", "items"] as const;

type StatSource = (typeof STAT_SOURCES)[number];

export function EquipmentSetStats() {
  const { set } = useEquipmentSet();
  const { wornItems, totals, skillBonuses, isLoaded } = useSetSummary();
  const [source, setSource] = useState<StatSource>("character");

  return (
    <div className="@container flex min-w-0 flex-col gap-3">
      <ToggleGroup
        aria-label={t("setPage.statSource")}
        variant="outline"
        size="sm"
        spacing={1.5}
        className="flex-wrap"
        value={[source]}
        onValueChange={([pressed]) => {
          const next = STAT_SOURCES.find((value) => value === pressed);

          if (next) setSource(next);
        }}
      >
        <ToggleGroupItem value="character">
          {t("setPage.statSourceCharacter")}
        </ToggleGroupItem>
        <ToggleGroupItem value="skills">
          {t("setPage.statSourceSkills")}
        </ToggleGroupItem>
        <ToggleGroupItem value="items">
          {t("setPage.statSourceItems")}
        </ToggleGroupItem>
      </ToggleGroup>
      {source !== "character" ? (
        <EquipmentSetTotals
          totals={totals}
          skills={
            source === "skills"
              ? { bonuses: skillBonuses, level: set.level }
              : undefined
          }
          isLoaded={isLoaded}
        />
      ) : set.profession === null ? (
        <EmptyNotice>{t("character.noProfession")}</EmptyNotice>
      ) : (
        <CharacterStatsWindow
          profession={set.profession}
          level={set.level}
          wornItems={[...wornItems.values()]}
          skills={skillBonuses}
          isLoaded={isLoaded}
        />
      )}
    </div>
  );
}
