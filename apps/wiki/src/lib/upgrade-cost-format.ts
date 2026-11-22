import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { t } from "@/i18n/messages";
import { formatDecimal, formatNumber } from "@lootlog/domain/locale";

export const formatUpgradePoints = (value: number) =>
  t("upgrade.cost.pointsValue", { value: formatNumber(value) });

const GOLD_UNITS = [
  { size: 1_000_000_000, key: "upgrade.cost.goldBillions" },
  { size: 1_000_000, key: "upgrade.cost.goldMillions" },
] as const;

export const formatGold = (value: number) => {
  const unit = GOLD_UNITS.find(({ size }) => Math.abs(value) >= size);

  return unit
    ? t(unit.key, { value: formatDecimal(value / unit.size) })
    : formatNumber(value);
};

export const upgradeCurrencyName = (rarity: string | null) =>
  t(`upgrade.cost.currency.${resolveItemRarity(rarity)}`);
