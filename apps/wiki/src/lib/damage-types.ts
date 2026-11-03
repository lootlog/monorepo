import {
  Biohazard,
  Droplets,
  Flame,
  ShieldOff,
  Snowflake,
  Zap,
} from "lucide-react";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";

/** The kinds of harm a weapon deals beyond plain blows, each as a colored icon. */
const DAMAGE_TYPES = [
  { key: "fire", icon: Flame, className: "text-orange-400" },
  { key: "light", icon: Zap, className: "text-yellow-300" },
  { key: "frost", icon: Snowflake, className: "text-sky-300" },
  { key: "poison", icon: Biohazard, className: "text-lime-400" },
  { key: "wound", icon: Droplets, className: "text-red-400" },
  { key: "pierce", icon: ShieldOff, className: "text-zinc-300" },
] as const;

/** The damage types the item deals, in a fixed order. */
export const findDamageTypes = (stat: string) => {
  const keys = new Set(parseItemStats(stat).map(({ key }) => key));

  return DAMAGE_TYPES.filter(({ key }) => keys.has(key));
};
