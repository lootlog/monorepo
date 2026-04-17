import { useIsMutating, useMutationState } from "@tanstack/react-query";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { getUpdateUserGameAccountPreferencesMutationKey } from "@/lib/game-account-preferences";

type GameAccountPreferencesSyncStatus =
  | {
      status: "idle";
      error: null;
    }
  | {
      status: "loading" | "saving";
      error: null;
    }
  | {
      status: "error";
      error: Error | null;
    };

export const useGameAccountPreferencesSyncStatus =
  (): GameAccountPreferencesSyncStatus => {
    const { accountId, isLoading, isFetching, isError, error, dataUpdatedAt } =
      useCurrentGameAccountPreferences();
    const mutationKey = accountId
      ? getUpdateUserGameAccountPreferencesMutationKey(accountId)
      : ["update-user-game-account-preferences", "disabled"];

    const pendingMutationsCount = useIsMutating({
      mutationKey,
    });
    const mutations = useMutationState<{
      status: "idle" | "pending" | "success" | "error";
      error: Error | null;
      submittedAt: number;
    }>({
      filters: {
        mutationKey,
      },
      select: (mutation) => ({
        status: mutation.state.status,
        error: mutation.state.error as Error | null,
        submittedAt: mutation.state.submittedAt,
      }),
    });

    const latestMutation = mutations.reduce<{
      status: "idle" | "pending" | "success" | "error";
      error: Error | null;
      submittedAt: number;
    } | null>((latest, mutation) => {
      if (!latest || mutation.submittedAt > latest.submittedAt) {
        return mutation;
      }

      return latest;
    }, null);

    const hasFreshQueryData =
      latestMutation !== null && dataUpdatedAt > latestMutation.submittedAt;

    if (isError) {
      return {
        status: "error",
        error: error instanceof Error ? error : null,
      };
    }

    if (
      latestMutation?.status === "error" &&
      latestMutation.error &&
      !hasFreshQueryData
    ) {
      return {
        status: "error",
        error: latestMutation.error,
      };
    }

    if (pendingMutationsCount > 0) {
      return {
        status: "saving",
        error: null,
      };
    }

    if (accountId && (isLoading || isFetching)) {
      return {
        status: "loading",
        error: null,
      };
    }

    return {
      status: "idle",
      error: null,
    };
  };
