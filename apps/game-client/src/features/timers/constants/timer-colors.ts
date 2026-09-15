export const TIMERS_COLORS = {
  red: {
    bg: "ll:bg-linear-to-r ll:from-red-500/60 ll:to-black/45 ll:hover:from-red-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-red-500",
    border: "ll:border-red-500",
  },
  orange: {
    bg: "ll:bg-linear-to-r ll:from-orange-500/60 ll:to-black/45 ll:hover:from-orange-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-orange-500",
    border: "ll:border-orange-500",
  },
  yellow: {
    bg: "ll:bg-linear-to-r ll:from-yellow-500/60 ll:to-black/45 ll:hover:from-yellow-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-yellow-500",
    border: "ll:border-yellow-500",
  },
  lime: {
    bg: "ll:bg-linear-to-r ll:from-lime-500/60 ll:to-black/45 ll:hover:from-lime-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-lime-500",
    border: "ll:border-lime-500",
  },
  green: {
    bg: "ll:bg-linear-to-r ll:from-green-500/60 ll:to-black/45 ll:hover:from-green-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-green-500",
    border: "ll:border-green-500",
  },
  teal: {
    bg: "ll:bg-linear-to-r ll:from-teal-500/60 ll:to-black/45 ll:hover:from-teal-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-teal-500",
    border: "ll:border-teal-500",
  },
  sky: {
    bg: "ll:bg-linear-to-r ll:from-sky-500/60 ll:to-black/45 ll:hover:from-sky-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-sky-500",
    border: "ll:border-sky-500",
  },
  blue: {
    bg: "ll:bg-linear-to-r ll:from-indigo-800/60 ll:to-black/45 ll:hover:from-indigo-800/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-indigo-800",
    border: "ll:border-indigo-800",
  },
  violet: {
    bg: "ll:bg-linear-to-r ll:from-violet-400/60 ll:to-black/45 ll:hover:from-violet-400/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-violet-400",
    border: "ll:border-violet-400",
  },
  purple: {
    bg: "ll:bg-linear-to-r ll:from-purple-600/60 ll:to-black/45 ll:hover:from-purple-600/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-purple-600",
    border: "ll:border-purple-600",
  },
  pink: {
    bg: "ll:bg-linear-to-r ll:from-pink-500/60 ll:to-black/45 ll:hover:from-pink-500/75 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-pink-500",
    border: "ll:border-pink-500",
  },
  white: {
    bg: "ll:bg-linear-to-r ll:from-white/10 ll:to-black/45 ll:hover:from-white/20 ll:hover:to-black/30",
    bgNoOpacity: "ll:bg-transparent",
    border: "ll:border-gray-400",
  },
};

export const isTimerColor = (
  color: string,
): color is keyof typeof TIMERS_COLORS => Object.hasOwn(TIMERS_COLORS, color);

export const getTimerColor = (color: string) =>
  isTimerColor(color) ? TIMERS_COLORS[color] : undefined;
