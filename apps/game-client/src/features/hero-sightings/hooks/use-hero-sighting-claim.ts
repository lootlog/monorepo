import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  claimHeroSighting,
  unclaimHeroSighting,
  type HeroSighting,
} from "@/api/hero-sightings.api";
import { upsertHeroSightings } from "@/features/hero-sightings/hero-sightings-cache";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

type ClaimChange = {
  readonly claim: boolean;
  readonly sightings: readonly HeroSighting[];
};

/**
 * Claims or withdraws the player's claim on each Organization's sighting of
 * one hero. Organizations that accept keep their change when another fails.
 */
export const useHeroSightingClaim = () => {
  const { t } = useTranslation("heroSightings");
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ claim, sightings }: ClaimChange) => {
      const results = await Promise.allSettled(
        sightings.map((sighting) => {
          const ref = {
            guildId: sighting.guildId,
            sightingId: String(sighting.id),
          };

          return claim
            ? claimHeroSighting(ref, sighting.world)
            : unclaimHeroSighting(ref);
        }),
      );

      upsertHeroSightings(
        queryClient,
        results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        ),
      );

      if (results.some((result) => result.status === "rejected"))
        throw new Error("A hero sighting claim change failed");
    },
    onError: (_error, { claim }) => {
      showRuntimeMessage(
        t(claim ? "messages.claimFailed" : "messages.unclaimFailed"),
      );
    },
  });

  return {
    isPending,
    claim: (sightings: readonly HeroSighting[]) =>
      mutate({ claim: true, sightings }),
    unclaim: (sightings: readonly HeroSighting[]) =>
      mutate({ claim: false, sightings }),
  };
};
