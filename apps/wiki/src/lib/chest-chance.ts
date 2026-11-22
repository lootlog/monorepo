import type { ComponentChest } from "@lootlog/domain/item-socket";
import { t } from "@/i18n/messages";
import { formatPercent } from "@/lib/calculator-format";

export const formatChestChance = (chest: ComponentChest, chance: number) => {
  const percent = formatPercent(chance * 100);

  return chest.components > 1
    ? t("socket.chests.twice", { chance: percent })
    : percent;
};
