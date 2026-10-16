import { Moon, Sun, Sunrise, Sunset } from "lucide-react";

const KILL_SHIFTS = [
  { until: 6, key: "night", icon: Moon },
  { until: 12, key: "morning", icon: Sunrise },
  { until: 18, key: "afternoon", icon: Sun },
  { until: 24, key: "evening", icon: Sunset },
] as const;

/** The part of the day an hour (0–23) falls in, named in `kills.records.shift`. */
export const getKillShift = (hour: number) =>
  KILL_SHIFTS.find((shift) => hour < shift.until) ?? KILL_SHIFTS[3];
