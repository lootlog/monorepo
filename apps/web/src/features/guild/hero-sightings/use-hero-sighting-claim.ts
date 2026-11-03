import { useQueryClient } from "@tanstack/react-query";
import {
  useHeroSightingsControllerClaimHeroSighting,
  useHeroSightingsControllerUnclaimHeroSighting,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useSession } from "@/hooks/auth/use-session";
import {
  heroSightingQueries,
  writeHeroSightingToCache,
} from "./hero-sighting-cache";

/**
 * Declares or withdraws the signed-in member's camping of a sighted hero. A
 * claim names the member by their internal Lootlog User id.
 */
export const useHeroSightingClaim = (sighting: HeroSightingResponseDto) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const guildId = useGuildId() ?? "";
  const { data: session } = useSession();
  const userId = session?.user.id;

  const isClaimed = sighting.claims.some(
    (claim) => userId !== undefined && claim.member.userId === userId,
  );

  const onSuccess = (updated: HeroSightingResponseDto) =>
    writeHeroSightingToCache(queryClient, [guildId], updated);

  const onError = (error: { status?: number }) => {
    // The hero was killed or moved meanwhile; the board shows what replaced it.
    if (error.status === 409) {
      toast.error(t("heroSightings.claim.closed"));
      void queryClient.invalidateQueries(heroSightingQueries([guildId]));

      return;
    }

    toast.error(t("heroSightings.claim.error"));
  };

  const claim = useHeroSightingsControllerClaimHeroSighting({
    mutation: { onSuccess, onError },
  });

  const unclaim = useHeroSightingsControllerUnclaimHeroSighting({
    mutation: { onSuccess, onError },
  });

  const pathParams = { guildId, sightingId: String(sighting.id) };

  return {
    isClaimed,
    isPending: claim.isPending || unclaim.isPending,
    toggle: () => {
      if (isClaimed) unclaim.mutate({ pathParams });
      else claim.mutate({ pathParams, data: {} });
    },
  };
};
