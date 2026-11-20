import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { t } from "@/i18n/messages";
import { formatNumber } from "@lootlog/domain/locale";

/** Upgrade points: `1 960 pkt`. */
export const formatUpgradePoints = (value: number) =>
  t("upgrade.cost.pointsValue", { value: formatNumber(value) });

/** Gold: `230 000 zł`. */
export const formatGold = (value: number) =>
  t("upgrade.cost.goldValue", { value: formatNumber(value) });

/** The breakdown currency a +5 upgrade of an item of this rarity takes. */
export const upgradeCurrencyName = (rarity: string | null) =>
  t(`upgrade.cost.currency.${resolveItemRarity(rarity)}`);
