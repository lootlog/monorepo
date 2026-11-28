import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-23",
  type: "improvement",
  surfaces: ["web"],
  title: "Wykres życia w walkach grupowych",
  summary:
    "Panel walk pokazuje życie każdego wojownika osobno. Wybierz, których wojowników chcesz porównać.",
  docs: "battle-panel",
} satisfies ChangelogEntry;
