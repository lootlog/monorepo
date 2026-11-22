import { LOOTLOG_APP_URL } from "@/config/app";

export const openLootlogApp = (path = "/@me") => {
  window.open(`${LOOTLOG_APP_URL}${path}`, "_blank", "noopener");
};
