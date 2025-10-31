import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { DEFAULT_COLOR_NAMES } from "@/features/timers/constants/color-names";
import type { TimerWithTimeLeft } from "./timers-utils";

type ColorStat = {
  color: string;
  total: number;
  active: number;
  name: string;
  bgColor?: string;
  borderColor?: string;
};

type CustomColor = {
  id: string;
  name: string;
  backgroundColor: string;
  borderColor: string;
};

export const calculateColorStatistics = (
  timersColors: Record<string, string>,
  sortedTimers: TimerWithTimeLeft[],
  customColors: Record<string, CustomColor>,
  defaultColorNames: Record<string, string>,
  overriddenDefaultColors: Record<
    string,
    { backgroundColor: string; borderColor: string }
  >,
): ColorStat[] => {
  const stats: Record<
    string,
    {
      total: number;
      active: number;
      name: string;
      bgColor?: string;
      borderColor?: string;
    }
  > = {};

  Object.keys(TIMERS_COLORS).forEach((color) => {
    const overridden = overriddenDefaultColors[color];
    stats[color] = {
      total: 0,
      active: 0,
      name: defaultColorNames[color] || DEFAULT_COLOR_NAMES[color] || color,
      bgColor: overridden?.backgroundColor,
      borderColor: overridden?.borderColor,
    };
  });

  Object.values(customColors).forEach((color) => {
    stats[color.id] = {
      total: 0,
      active: 0,
      name: color.name,
      bgColor: color.backgroundColor,
      borderColor: color.borderColor,
    };
  });

  Object.entries(timersColors).forEach(([_npcName, color]) => {
    if (color && stats[color]) {
      stats[color].total++;
    }
  });

  sortedTimers.forEach((timer) => {
    const color = timersColors[timer.npc.name];
    if (color && stats[color]) {
      stats[color].active++;
    }
  });

  return Object.entries(stats)
    .filter(([, stat]) => stat.total > 0)
    .map(([color, stat]) => ({
      color,
      ...stat,
    }));
};
