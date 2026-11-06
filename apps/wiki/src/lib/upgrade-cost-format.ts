import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { t } from "@/i18n/messages";

/** A whole amount grouped as Polish players read it: `1 960 000`. */
export const formatAmount = (value: number) => value.toLocaleString("pl-PL");

/** Upgrade points: `1 960 pkt`. */
export const formatUpgradePoints = (value: number) =>
  t("upgrade.cost.pointsValue", { value: formatAmount(value) });

/** Gold: `230 000 zł`. */
export const formatGold = (value: number) =>
  t("upgrade.cost.goldValue", { value: formatAmount(value) });

/** The breakdown currency a +5 upgrade of an item of this rarity takes. */
export const upgradeCurrencyName = (rarity: string | null) =>
  t(`upgrade.cost.currency.${resolveItemRarity(rarity)}`);
