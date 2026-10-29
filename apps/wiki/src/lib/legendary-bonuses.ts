import {
  Ban,
  Crosshair,
  Droplet,
  Flame,
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
  Zap,
} from "lucide-react";
import { sortBy } from "es-toolkit";
import { LEGENDARY_BONUS_NAMES } from "@lootlog/ui/components/item-stat-utils";

/** What each legendary bonus does, drawn as one icon. */
const LEGENDARY_BONUS_ICONS = new Map(
  Object.entries({
    anguish: Droplet,
    cleanse: Flame,
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
    verycrit: Zap,
  }),
);

// Bonuses players no longer search for, left out of the filters.
const UNSEARCHED_BONUSES = new Set(["pushback", "resgain"]);

// Bonuses Margonem has announced but no item carries yet.
const UPCOMING_BONUSES = new Set(["frenzy", "retaliation"]);

/** Every legendary bonus with its icon, as item cards name them. */
export const LEGENDARY_BONUSES = LEGENDARY_BONUS_NAMES.map((name) => ({
  name,
  icon: LEGENDARY_BONUS_ICONS.get(name) ?? Sparkles,
  isUpcoming: UPCOMING_BONUSES.has(name),
}));

/** The bonuses a search offers; upcoming ones come last, locked. */
export const SEARCHABLE_LEGENDARY_BONUSES = sortBy(
  LEGENDARY_BONUSES.filter(({ name }) => !UNSEARCHED_BONUSES.has(name)),
  [({ isUpcoming }) => isUpcoming],
);

// `legbon` holds the bonus and the level it scales with, `verycrit,200`.
const LEGENDARY_BONUS_STAT = /(?:^|;)legbon=([^,;]+)/;

/** The item's legendary bonus; unknown bonuses read as none. */
export const findLegendaryBonus = (stat: string) => {
  const name = LEGENDARY_BONUS_STAT.exec(stat)?.[1];

  return LEGENDARY_BONUSES.find((bonus) => bonus.name === name);
};
