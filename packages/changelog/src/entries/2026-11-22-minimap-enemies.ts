import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-22",
  type: "feature",
  surfaces: ["game-client"],
  title: "Wrogowie widziani przez klan na Podręcznej mapie",
  summary:
    "Włącz Ustawienia → Pingi → Wrogowie na Podręcznej mapie, żeby widzieć wrogów klanowych z Twojej mapy, których widzą inni członkowie. Domyślnie opcja jest wyłączona.",
  docs: "timers",
} satisfies ChangelogEntry;
