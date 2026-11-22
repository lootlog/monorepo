import type { BattlesControllerGetDashboardBattlesParams } from "@lootlog/client/battlelog";

export const DASHBOARD_RECENT_BATTLES_PARAMS = {
  size: 5,
  sortOrder: "desc",
  includeTotal: false,
} satisfies BattlesControllerGetDashboardBattlesParams;
