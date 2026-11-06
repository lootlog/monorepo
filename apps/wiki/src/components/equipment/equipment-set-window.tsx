import { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { CharacterStatsWindow } from "./character-stats-window";
import { EquipmentSetCharacter } from "./equipment-set-character";
import { EquipmentSetDoll } from "./equipment-set-doll";
import { EquipmentSetTotals } from "./equipment-set-totals";

const STAT_SOURCES = ["items", "skills", "character"] as const;

type StatSource = (typeof STAT_SOURCES)[number];

/**
 * The set as a game window: the character and slots beside every stat, from
 * the items alone, with what the learned skills add, or as the whole
 * character with what its profession has at its level.
 */
export function EquipmentSetWindow() {
  const { set } = useEquipmentSet();
  const { wornItems, totals, skillBonuses, isLoaded } = useSetSummary();
  const [source, setSource] = useState<StatSource>("character");

  return (
    <div className="grid items-start gap-6 md:grid-cols-[17rem_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-3">
        <EquipmentSetCharacter />
        <EquipmentSetDoll size="xl" />
      </div>
      <div className="@container flex flex-col gap-4">
        <ToggleGroup
          aria-label={t("setPage.statSource")}
          variant="outline"
          size="sm"
          spacing={1.5}
          className="flex-wrap"
          value={[source]}
          // One source is always chosen: pressing it again keeps it.
          onValueChange={([pressed]) => {
            const next = STAT_SOURCES.find((value) => value === pressed);

            if (next) setSource(next);
          }}
        >
          <ToggleGroupItem value="items">
            {t("setPage.statSourceItems")}
          </ToggleGroupItem>
          <ToggleGroupItem value="skills">
            {t("setPage.statSourceSkills")}
          </ToggleGroupItem>
          <ToggleGroupItem value="character">
            {t("setPage.statSourceCharacter")}
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
            layout="columns"
          />
        ) : set.profession === null ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("character.noProfession")}
          </p>
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
    </div>
  );
}
