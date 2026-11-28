import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-23",
  type: "feature",
  surfaces: ["game-client"],
  title: "Dźwięki timerów wokół okna respawnu",
  summary:
    "Timer może zagrać dźwięk kilka minut przed otwarciem okna, przy jego otwarciu i na końcu. Włączysz to w Ustawienia → Dźwięki → Timery albo z menu timera.",
  docs: "timers",
} satisfies ChangelogEntry;
