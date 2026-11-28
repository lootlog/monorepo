import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-27",
  type: "feature",
  highlight: true,
  surfaces: ["web", "game-client", "discord"],
  title: "Clan Bingo: plansza zadań dla członków Organizacji",
  summary:
    "Administracja układa planszę od 3×3 do 7×7, a pola zaliczają się same z łupów, bić, wykryć herosów i walk. W grze plansza jest pod przyciskiem Bingo, a na Discordzie pod komendą /bingo.",
  docs: "clan-features",
} satisfies ChangelogEntry;
