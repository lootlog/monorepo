import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-27",
  type: "fix",
  surfaces: ["game-client"],
  title: "Licznik wrogów na timerze nie gubi wrogów, którzy wciąż są na mapie",
} satisfies ChangelogEntry;
