import { useBattlesControllerGetDashboardBattles } from "@lootlog/client/battlelog";
import {
  useKillsControllerGetUserKillStats,
  useUsersControllerGetCurrentUserGuilds,
} from "@lootlog/client/main";
import { DASHBOARD_RECENT_BATTLES_PARAMS } from "../components/dashboard-recent-battles-params";
import { getOnboardingSteps } from "./onboarding-steps";

/** Reads the queries the dashboard already renders, so it adds no requests. */
export const useDashboardOnboarding = () => {
  const guilds = useUsersControllerGetCurrentUserGuilds();

  const killStats = useKillsControllerGetUserKillStats(undefined, {
    query: { staleTime: 60_000 },
  });

  const battles = useBattlesControllerGetDashboardBattles(
    DASHBOARD_RECENT_BATTLES_PARAMS,
    { query: { staleTime: 60_000 } },
  );

  return getOnboardingSteps({
    organizationCount: guilds.data?.length,
    lifetimeKills: killStats.data?.overview.totalKills,
    recentBattles: battles.data?.battles.length,
  });
};
