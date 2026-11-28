import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-23",
  type: "improvement",
  surfaces: ["game-client"],
  title:
    "Dodatek prosi o ponowne zalogowanie, gdy wygaśnie autoryzacja Discorda",
  summary:
    "Zamiast pokazywać połączenie, okno logowania podpowie, żeby zalogować się ponownie przez stronę Lootloga. Wcześniej łupy i timery przestawały się zapisywać bez żadnego komunikatu.",
  docs: "faq",
} satisfies ChangelogEntry;
