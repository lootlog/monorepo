import type { BingoBoardDetailResponseDtoTilesItemCondition } from "@lootlog/client/main";
import type { TFunction } from "i18next";

export const formatBingoConditionSummary = (
  condition: BingoBoardDetailResponseDtoTilesItemCondition,
  t: TFunction,
): string => {
  switch (condition.kind) {
    case "LOOT": {
      const parts: string[] = [t("bingo.conditionKind.LOOT")];

      if (condition.rarities.length > 0) {
        parts.push(
          condition.rarities
            .map((rarity) =>
              t(`itemRarity.${rarity}`, { defaultValue: rarity }),
            )
            .join("/"),
        );
      }

      if (condition.npcTypes.length > 0) {
        parts.push(
          condition.npcTypes
            .map((type) => t(`npcType.${type}`, { defaultValue: type }))
            .join("/"),
        );
      }

      if (condition.npcNamePattern) {
        parts.push(condition.npcNamePattern);
      }

      if (condition.itemNamePattern) {
        parts.push(condition.itemNamePattern);
      }

      parts.push(`×${condition.targetCount}`);

      return parts.join(" · ");
    }

    case "KILL": {
      const parts: string[] = [t("bingo.conditionKind.KILL")];

      if (condition.npcTypes.length > 0) {
        parts.push(
          condition.npcTypes
            .map((type) => t(`npcType.${type}`, { defaultValue: type }))
            .join("/"),
        );
      }

      if (condition.npcNamePattern) {
        parts.push(condition.npcNamePattern);
      }

      parts.push(`×${condition.targetCount}`);

      return parts.join(" · ");
    }

    case "HERO_SIGHTING": {
      const parts: string[] = [t("bingo.conditionKind.HERO_SIGHTING")];

      if (condition.heroNamePattern) {
        parts.push(condition.heroNamePattern);
      }

      parts.push(`×${condition.targetCount}`);

      return parts.join(" · ");
    }

    case "BATTLE": {
      const parts: string[] = [
        condition.matchmakingOnly ? "Otchłań" : t("bingo.conditionKind.BATTLE"),
      ];

      parts.push(
        condition.metric === "WIN_STREAK"
          ? `seria ${condition.targetCount}`
          : `×${condition.targetCount}`,
      );

      return parts.join(" · ");
    }

    case "MANUAL":
      return `${t("bingo.conditionKind.MANUAL")} · ×${condition.targetCount}`;
  }
};
