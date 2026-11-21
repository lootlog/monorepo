import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { t } from "@/i18n/messages";
import { formatDecimal, formatNumber } from "@lootlog/domain/locale";

/** Upgrade points: `1 960 pkt`. */
export const formatUpgradePoints = (value: number) =>
  t("upgrade.cost.pointsValue", { value: formatNumber(value) });

// The units the game shows gold in: `m` for millions and `g` for billions.
const GOLD_UNITS = [
  { size: 1_000_000_000, key: "upgrade.cost.goldBillions" },
  { size: 1_000_000, key: "upgrade.cost.goldMillions" },
] as const;

/**
 * Gold as the game shows it: millions in `m` and billions in `g`, to two
 * decimals, such as `42,84m` or `6,45g`; less than a million in full.
 */
export const formatGold = (value: number) => {
  const unit = GOLD_UNITS.find(({ size }) => Math.abs(value) >= size);

  return unit
    ? t(unit.key, { value: formatDecimal(value / unit.size) })
    : formatNumber(value);
};

/** The breakdown currency a +5 upgrade of an item of this rarity takes. */
export const upgradeCurrencyName = (rarity: string | null) =>
  t(`upgrade.cost.currency.${resolveItemRarity(rarity)}`);
