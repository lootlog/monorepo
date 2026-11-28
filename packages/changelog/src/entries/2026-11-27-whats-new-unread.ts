import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-27",
  type: "improvement",
  surfaces: ["web", "game-client"],
  title: "Nowości w Lootlogu widać od razu",
  summary:
    "W aplikacji przycisk Co nowego pokazuje liczbę nieprzeczytanych zmian. W dodatku pojawia się przycisk z podglądem nowości, który znika, gdy je przejrzysz.",
  docs: "settings",
} satisfies ChangelogEntry;
