import { formatNumericText } from "@lootlog/ui/components/item-stat-utils";
import { t } from "@/i18n/messages";
import type { UpgradeBonusOption } from "@lootlog/domain/item-upgrade";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const PERCENT_BONUSES = new Set([
  "crit",
  "resdmg",
  "resfire",
  "resfrost",
  "reslight",
  "act",
  "critval",
  "critmval",
  "lowcrit",
]);

const HUNDREDTHS_BONUSES = new Set(["sa", "slow"]);

const number = new Intl.NumberFormat(PRODUCT_LOCALE, {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export const formatUpgradeBonusValue = ({
  key,
  value,
}: Pick<UpgradeBonusOption, "key" | "value">) => {
  const shown = HUNDREDTHS_BONUSES.has(key) ? value / 100 : value;

  const text = formatNumericText(number.format(shown));

  return `+${text}${PERCENT_BONUSES.has(key) ? "%" : ""}`;
};

export const upgradeBonusName = (key: UpgradeBonusOption["key"]) =>
  t(`upgrade.bonuses.${key}`);

const percent = new Intl.NumberFormat(PRODUCT_LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});

export const formatOfferChance = (chance: number) =>
  t("upgrade.bonusChance", {
    chance: chance < 0.01 ? "<1%" : percent.format(chance),
  });
