import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-21",
  type: "improvement",
  surfaces: ["game-client"],
  title: "Czat zapamiętuje tryb wybrany z menu",
  summary:
    "Wybierz Powiadomienie z menu trybu, a kolejne wpisy pójdą jako powiadomienia bez wpisywania „!” za każdym razem.",
  docs: "chat",
} satisfies ChangelogEntry;
