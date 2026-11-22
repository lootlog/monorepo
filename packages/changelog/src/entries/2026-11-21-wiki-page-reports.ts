import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-21",
  type: "feature",
  surfaces: ["wiki"],
  title: "Zgłaszanie błędów na stronach przedmiotów i potworów",
  summary:
    "Strona w wiki podaje złe dane, łupy albo mapy? Zgłoś to przyciskiem „Zgłoś błąd” – zgłoszenie trafi do moderatorów.",
} satisfies ChangelogEntry;
