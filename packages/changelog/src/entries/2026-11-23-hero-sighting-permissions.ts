import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-23",
  type: "improvement",
  surfaces: ["web", "game-client"],
  title: "Osobne uprawnienia do wykrytych herosów",
  summary:
    "Ustawienia ról mają nową grupę Wykryci herosi. Role, które miały dostęp przez uprawnienia timerów, dostały go automatycznie.",
  docs: "permissions",
} satisfies ChangelogEntry;
