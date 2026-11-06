import {
  ArrowRightLeft,
  Droplet,
  Gauge,
  HeartPulse,
  type LucideIcon,
  Repeat,
  ScrollText,
  Shield,
  Sparkles,
  Unlink,
} from "lucide-react";

type Calculator = {
  /** The calculator's address in the page link. */
  id: string;
  titleKey: string;
  icon: LucideIcon;
};

/** The calculators by topic, official formulas first within each. */
export const CALCULATOR_GROUPS = [
  {
    titleKey: "calculators.groups.combat",
    calculators: [
      {
        id: "unik-i-blok",
        titleKey: "calculators.defence.title",
        icon: Shield,
      },
      {
        id: "szybkosc-ataku",
        titleKey: "calculators.attackSpeed.title",
        icon: Gauge,
      },
    ],
  },
  {
    titleKey: "calculators.groups.legendary",
    calculators: [
      {
        id: "bonus-legendarny",
        titleKey: "calculators.legendary.title",
        icon: Sparkles,
      },
      {
        id: "krwawa-udreka",
        titleKey: "calculators.anguish.title",
        icon: Droplet,
      },
      {
        id: "dotyk-aniola",
        titleKey: "calculators.holyTouch.title",
        icon: HeartPulse,
      },
    ],
  },
  {
    titleKey: "calculators.groups.services",
    calculators: [
      {
        id: "przeniesienie-postaci",
        titleKey: "calculators.transfer.title",
        icon: ArrowRightLeft,
      },
      { id: "odwiazanie", titleKey: "calculators.unbind.title", icon: Unlink },
      {
        id: "zmiana-profesji",
        titleKey: "calculators.profession.title",
        icon: Repeat,
      },
    ],
  },
  {
    titleKey: "calculators.groups.character",
    calculators: [
      {
        id: "doswiadczenie-z-questa",
        titleKey: "calculators.quest.title",
        icon: ScrollText,
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  titleKey: string;
  calculators: readonly Calculator[];
}>;

export type CalculatorId =
  (typeof CALCULATOR_GROUPS)[number]["calculators"][number]["id"];

const CALCULATOR_IDS: readonly string[] = CALCULATOR_GROUPS.flatMap(
  ({ calculators }) => calculators.map(({ id }) => id),
);

export const DEFAULT_CALCULATOR: CalculatorId = "unik-i-blok";

export const isCalculatorId = (value: unknown): value is CalculatorId =>
  typeof value === "string" && CALCULATOR_IDS.includes(value);
