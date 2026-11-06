import { useQueryClient } from "@tanstack/react-query";
import {
  useHeroSightingsControllerClaimHeroSighting,
  useHeroSightingsControllerUnclaimHeroSighting,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { isHeroSightingClaimedBy } from "@lootlog/domain/hero-sightings";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useSession } from "@/hooks/auth/use-session";
import {
  heroSightingQueries,
  writeHeroSightingToCache,
} from "./hero-sighting-cache";

/**
 * Declares or withdraws the signed-in member's camping of a sighted hero. A
 * claim names the member by their internal Lootlog User id. Outside an
 * Organization route there is nothing to claim for, so `canToggle` is false.
 */
export const useHeroSightingClaim = (sighting: HeroSightingResponseDto) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const guildId = useGuildId();
  const { data: session } = useSession();
  const isClaimed = isHeroSightingClaimedBy(sighting, session?.user.id);

  const onSuccess = (
    updated: HeroSightingResponseDto,
    { pathParams }: { pathParams: { guildId: string } },
  ) => writeHeroSightingToCache(queryClient, [pathParams.guildId], updated);

  const onError = (
    error: { status?: number },
    { pathParams }: { pathParams: { guildId: string } },
  ) => {
    // The hero was killed or moved meanwhile; the board shows what replaced it.
    if (error.status === 409) {
      toast.error(t("heroSightings.claim.closed"));
      void queryClient.invalidateQueries(
        heroSightingQueries([pathParams.guildId]),
      );

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

  return {
    canToggle: guildId !== undefined,
    isClaimed,
    isPending: claim.isPending || unclaim.isPending,
    toggle: () => {
      if (guildId === undefined) return;
      const pathParams = { guildId, sightingId: String(sighting.id) };

      if (isClaimed) unclaim.mutate({ pathParams });
      else claim.mutate({ pathParams, data: {} });
    },
  };
};
