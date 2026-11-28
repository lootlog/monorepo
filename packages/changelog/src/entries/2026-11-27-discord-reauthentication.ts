import type { ChangelogEntry } from "../changelog.js";

export default {
  date: "2026-11-27",
  type: "fix",
  surfaces: ["web", "game-client"],
  title:
    "Rzadziej trzeba logować się ponownie, także po zmianie e-maila w Discordzie",
} satisfies ChangelogEntry;
