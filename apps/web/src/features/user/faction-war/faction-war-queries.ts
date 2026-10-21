import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  getFactionWarsControllerGetCurrentWarQueryKey,
  getFactionWarsControllerGetDisqualificationsQueryKey,
  getFactionWarsControllerGetLeaderboardQueryKey,
  useFactionWarsControllerDisqualifyPlayer,
  useFactionWarsControllerGetCurrentWar,
  useFactionWarsControllerGetDisqualifications,
  useFactionWarsControllerGetLeaderboard,
  useFactionWarsControllerRestorePlayer,
  useFactionWarsControllerUpdatePick,
  type FactionWarDisqualificationDto,
  type FactionWarLeaderboardResponseDto,
  type FactionWarResponseDto,
  type FactionWarScoringDto,
} from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";

/**
 * Scores move while a war runs, and an upcoming war turns into a running one;
 * the page follows both at this pace.
 */
const LIVE_WAR_REFETCH_MS = 60_000;

export type FactionWar = FactionWarResponseDto;

export type FactionWarScoring = FactionWarScoringDto;

export type FactionWarLeaderboardEntry =
  FactionWarLeaderboardResponseDto["entries"][number];

export type FactionWarDisqualification = FactionWarDisqualificationDto;

const refetchUntilEnded = (status: FactionWar["status"] | undefined) =>
  status === "RUNNING" || status === "UPCOMING" ? LIVE_WAR_REFETCH_MS : false;

/** The running war, else the next or the last one, with the caller's part in it. */
export const useCurrentFactionWar = () =>
  useFactionWarsControllerGetCurrentWar({
    query: {
      refetchInterval: (query) => refetchUntilEnded(query.state.data?.status),
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
        refetchInterval: refetchUntilEnded(war?.status),
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

/** War admins only: the players excluded from the war, with the reason. */
export const useFactionWarDisqualifications = (warId: string) =>
  useFactionWarsControllerGetDisqualifications({ warId });

/**
 * A disqualification or a restore answers with the war's whole list; the
 * faction scores and leaderboards it changes are refetched, though the
 * server may serve them up to half a minute stale.
 */
const applyDisqualifications = (
  queryClient: QueryClient,
  warId: string,
  disqualifications: FactionWarDisqualification[],
) => {
  queryClient.setQueryData(
    getFactionWarsControllerGetDisqualificationsQueryKey({ warId }),
    disqualifications,
  );

  void Promise.all([
    queryClient.invalidateQueries({
      queryKey: getFactionWarsControllerGetLeaderboardQueryKey({ warId }),
    }),
    queryClient.invalidateQueries({
      queryKey: getFactionWarsControllerGetCurrentWarQueryKey(),
    }),
  ]);
};

export const useDisqualifyFactionWarPlayer = () => {
  const queryClient = useQueryClient();

  return useFactionWarsControllerDisqualifyPlayer({
    mutation: {
      onSuccess: (disqualifications, { pathParams }) =>
        applyDisqualifications(
          queryClient,
          pathParams.warId,
          disqualifications,
        ),
    },
  });
};

export const useRestoreFactionWarPlayer = () => {
  const queryClient = useQueryClient();

  return useFactionWarsControllerRestorePlayer({
    mutation: {
      onSuccess: (disqualifications, { pathParams }) =>
        applyDisqualifications(
          queryClient,
          pathParams.warId,
          disqualifications,
        ),
    },
  });
};
