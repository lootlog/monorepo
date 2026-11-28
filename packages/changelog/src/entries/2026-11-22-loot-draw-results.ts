import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-22",
  type: "feature",
  surfaces: ["web", "discord"],
  title: "Wyniki losowania legend na liście łupów i na Discordzie",
  summary:
    "Kafelek wylosowanej legendy pokazuje zwycięzcę, a nowa reguła powiadomień wysyła na Discorda obrazek koła z wynikiem. Kołem kręcą osoby, które zarządzają łupami.",
  docs: "loot-list",
} satisfies ChangelogEntry;
