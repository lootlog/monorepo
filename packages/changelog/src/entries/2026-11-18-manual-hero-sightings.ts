import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-18",
  type: "feature",
  highlight: true,
  surfaces: ["game-client", "web"],
  title: "Ręczne dodawanie wykrytych herosów",
  summary:
    "Widzisz herosa, którego dodatek nie zapisał? Dodaj wykrycie ręcznie: w grze przyciskiem + w oknie Wykryci herosi albo w aplikacji.",
  docs: "heroes",
} satisfies ChangelogEntry;
