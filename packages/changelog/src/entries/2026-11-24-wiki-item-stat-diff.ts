import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-24",
  type: "improvement",
  surfaces: ["wiki"],
  title: "Porównanie przedmiotów pokazuje różnice statystyk",
  summary:
    "Najedź na przedmiot, gdy w tym samym slocie masz założony inny: zobaczysz, które statystyki rosną, które spadają i co stracisz.",
} satisfies ChangelogEntry;
