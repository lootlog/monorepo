import { useQueryClient } from "@tanstack/react-query";
import {
  getFactionWarsControllerGetCurrentWarQueryKey,
  getFactionWarsControllerGetLeaderboardQueryKey,
  useFactionWarsControllerGetCurrentWar,
  useFactionWarsControllerGetLeaderboard,
  useFactionWarsControllerUpdatePick,
  type FactionWarLeaderboardResponseDto,
  type FactionWarResponseDto,
  type FactionWarScoringDto,
} from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";

/** Scores move while a war runs; the page follows them at this pace. */
const RUNNING_WAR_REFETCH_MS = 60_000;

export type FactionWar = FactionWarResponseDto;

export type FactionWarScoring = FactionWarScoringDto;

export type FactionWarLeaderboardEntry =
  FactionWarLeaderboardResponseDto["entries"][number];

const refetchWhileRunning = (status: FactionWar["status"] | undefined) =>
  status === "RUNNING" ? RUNNING_WAR_REFETCH_MS : false;

/** The running war, else the next or the last one, with the caller's part in it. */
export const useCurrentFactionWar = () =>
  useFactionWarsControllerGetCurrentWar({
    query: {
      refetchInterval: (query) => refetchWhileRunning(query.state.data?.status),
    },
  });

export const useFactionWarLeaderboard = (
  war: Pick<FactionWar, "id" | "status"> | undefined,
  faction: FactionWarFaction,
) =>
  useFactionWarsControllerGetLeaderboard(
    { warId: war?.id ?? "" },
    { faction },
    {
      query: {
        enabled: war !== undefined,
        select: (leaderboard) => leaderboard.entries,
        refetchInterval: refetchWhileRunning(war?.status),
      },
    },
  );

/** Hides the caller on a leaderboard or their champion highlight; answers with the current war. */
export const useUpdateFactionWarPick = () => {
  const queryClient = useQueryClient();

  return useFactionWarsControllerUpdatePick({
    mutation: {
      onSuccess: (war, { pathParams }) => {
        queryClient.setQueryData(
          getFactionWarsControllerGetCurrentWarQueryKey(),
          war,
        );

        // The caller's name shows or hides on that war's leaderboards.
        void queryClient.invalidateQueries({
          queryKey: getFactionWarsControllerGetLeaderboardQueryKey(pathParams),
        });
      },
    },
  });
};
