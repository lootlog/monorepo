import { LOOTLOG_APP_URL } from "@/config/app";

/**
 * Opens a page of the Lootlog web app in a new tab without giving it a handle
 * to the game page. The default is the player's dashboard, where they see
 * their Lootlogs and can add the Lootlog bot to a Discord server.
 */
export const openLootlogApp = (path = "/@me") => {
  window.open(`${LOOTLOG_APP_URL}${path}`, "_blank", "noopener");
};
