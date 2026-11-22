import {
  Ban,
  Bomb,
  Crosshair,
  FlameKindling,
  HeartCrack,
  HeartPulse,
  LifeBuoy,
  Repeat2,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sparkles,
  Sun,
  Swords,
  Wind,
} from "lucide-react";
import { sortBy } from "es-toolkit";
import { LEGENDARY_BONUS_NAMES } from "@lootlog/ui/components/item-stat-utils";

const LEGENDARY_BONUS_ICONS = new Map(
  Object.entries({
    anguish: HeartCrack,
    cleanse: FlameKindling,
    critred: ShieldHalf,
    curse: Ban,
    dmgred: Shield,
    facade: ShieldCheck,
    frenzy: Swords,
    glare: Sun,
    holytouch: HeartPulse,
    lastheal: LifeBuoy,
    puncture: Crosshair,
    pushback: Wind,
    resgain: Sparkles,
    retaliation: Repeat2,
    verycrit: Bomb,
  }),
);

export const legendaryBonusIcon = (name: string) =>
  LEGENDARY_BONUS_ICONS.get(name) ?? Sparkles;

const UNSEARCHED_BONUSES = new Set(["pushback", "resgain"]);

const UPCOMING_BONUSES = new Set(["frenzy", "retaliation"]);

const LEGENDARY_BONUSES = LEGENDARY_BONUS_NAMES.map((name) => ({
  name,
  icon: legendaryBonusIcon(name),
  isUpcoming: UPCOMING_BONUSES.has(name),
}));

export const SEARCHABLE_LEGENDARY_BONUSES = sortBy(
  LEGENDARY_BONUSES.filter(({ name }) => !UNSEARCHED_BONUSES.has(name)),
  [({ isUpcoming }) => isUpcoming],
);

const LEGENDARY_BONUS_STAT =
  /(?:^|;)(?:legbon|socket_injection_legbon|socket_fleeting_legbon)=([^,;]+)/;

export const findLegendaryBonus = (stat: string) => {
  const name = LEGENDARY_BONUS_STAT.exec(stat)?.[1];

  return LEGENDARY_BONUSES.find((bonus) => bonus.name === name);
};
