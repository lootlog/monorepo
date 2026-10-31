import { formatNumericText } from "@lootlog/ui/components/item-stat-utils";
import { t } from "@/i18n/messages";
import type { UpgradeBonusOption } from "@/lib/item-upgrade";

// Stats the game shows as percentages, or as percentage points.
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

// Stats the game keeps in hundredths.
const HUNDREDTHS_BONUSES = new Set(["sa", "slow"]);

const number = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** What the bonus adds, as the game shows it, such as `+150` or `+3%`. */
export const formatUpgradeBonusValue = ({
  key,
  value,
}: Pick<UpgradeBonusOption, "key" | "value">) => {
  const shown = HUNDREDTHS_BONUSES.has(key) ? value / 100 : value;

  // Grouped like the item's own stats, such as `1 854`.
  const text = formatNumericText(number.format(shown));

  return `+${text}${PERCENT_BONUSES.has(key) ? "%" : ""}`;
};

export const upgradeBonusName = (key: UpgradeBonusOption["key"]) =>
  t(`upgrade.bonuses.${key}`);

const percent = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumFractionDigits: 0,
});

/** The chance the bonus is offered at +5, such as `34% na wylosowanie`. */
export const formatOfferChance = (chance: number) =>
  t("upgrade.bonusChance", {
    chance: chance < 0.01 ? "<1%" : percent.format(chance),
  });
