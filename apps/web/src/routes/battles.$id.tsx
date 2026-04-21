import { createFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";
import {
  getPublicBattlesControllerGetPublicBattleQueryOptions,
  getPublicBattlesControllerGetPublicBattleRawQueryOptions,
} from "@/lib/api/generated/battlelog/public-battles/public-battles";
import { throwNotFoundIfResponseMatches } from "@/lib/router/route-errors";

export const Route = createFileRoute("/battles/$id")({
  loader: async ({ context, params }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(
          getPublicBattlesControllerGetPublicBattleQueryOptions({
            battleId: params.id,
          }),
        ),
        context.queryClient.ensureQueryData(
          getPublicBattlesControllerGetPublicBattleRawQueryOptions({
            battleId: params.id,
          }),
        ),
      ]);

      return null;
    } catch (error) {
      throwNotFoundIfResponseMatches(error);
    }
  },
  component: PublicBattle,
  pendingComponent: PublicBattleSkeleton,
});
