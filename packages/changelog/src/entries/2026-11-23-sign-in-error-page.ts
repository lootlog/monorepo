import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-23",
  type: "improvement",
  surfaces: ["web"],
  title: "Nieudane logowanie wyjaśnione po polsku",
  summary:
    "Strona błędu mówi, co poszło nie tak przy logowaniu przez Discorda, i pozwala spróbować ponownie.",
  docs: "faq",
} satisfies ChangelogEntry;
