import { createFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";
import { battleQueryOptions } from "@/hooks/api/battle-log/use-battle";
import { battleRawQueryOptions } from "@/hooks/api/battle-log/use-battle-raw";
import { throwNotFoundIfResponseMatches } from "@/lib/router/route-errors";

export const Route = createFileRoute("/battles/$id")({
  loader: async ({ context, params }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(
          battleQueryOptions({
            battleId: params.id,
            isPublic: true,
          }),
        ),
        context.queryClient.ensureQueryData(
          battleRawQueryOptions({
            battleId: params.id,
            isPublic: true,
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
