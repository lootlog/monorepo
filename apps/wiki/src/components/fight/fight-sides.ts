import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";

export const FIGHT_SIDES = [
  {
    text: BATTLE_TEXT_COLORS.team.friendly,
    fill: "bg-green-500",
    band: "fill-green-500/15",
    line: "stroke-green-500",
  },
  {
    text: BATTLE_TEXT_COLORS.team.enemy,
    fill: "bg-red-400",
    band: "fill-red-400/15",
    line: "stroke-red-400",
  },
] as const;
