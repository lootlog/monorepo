import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-22",
  type: "improvement",
  surfaces: ["web"],
  title: "Organizacja wybiera, o legendy z jakich potworów kręci się kołem",
  summary:
    "Domyślnie legendy z herosów i tytanów nie mają koła. Zmienisz to w Ustawienia → Ogólne → Losowanie legend.",
  docs: "loot-list",
} satisfies ChangelogEntry;
