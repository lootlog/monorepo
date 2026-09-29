import type { BattlesControllerGetDashboardBattlesParams } from "@lootlog/client/battlelog";

/** Shared by the recent battles card and onboarding so both read one query. */
export const DASHBOARD_RECENT_BATTLES_PARAMS = {
  size: 5,
  sortOrder: "desc",
  includeTotal: false,
} satisfies BattlesControllerGetDashboardBattlesParams;
